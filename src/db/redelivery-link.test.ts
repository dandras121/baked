import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { redeliveryLinkDue, sendPayLink } from "./admin-pay-link-repo";
import { connect } from "./client";
import { applyRedelivery, recordNobodyIn } from "./delivery-repo";
import { deliveredAfterAll, recordTheirChoice } from "./missed-admin-repo";
import { stillToPay } from "./money-repo";
import { preparePayLink } from "./pay-link-repo";
import { netPaid } from "./refund-repo";
import {
  deliveryAttempts,
  mailSends,
  orders,
  paymentLinks,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-12";
const at = (h: number, d = day) => londonInstant(d, h);

describe.skipIf(!url)(
  "database: the £15 Redelivery link from Record their choice (§9.5, §9.8)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function missed() {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-R${String(seq).padStart(3, "0")}`,
          token: `rdl${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: day,
          earliestDate: day,
          handover: "delivery",
          deliveryWindow: "morning",
          postcode: "EH49 6HH",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 18500,
          amountReceivedPence: 18500,
          snapshot: {},
          confirmedAt: new Date("2026-09-01T10:00:00Z"),
        })
        .returning();
      await recordNobodyIn(db(), o.id, at(11));
      const read = async () =>
        (await db().select().from(orders).where(eq(orders.id, o.id)))[0];
      // Linda records a redelivery tomorrow, agreed by phone, and asks for the fee by link.
      const r = await recordTheirChoice(
        db(),
        { ...countingGateway().gw, cancel: async () => {} },
        {
          orderId: o.id,
          seenVersion: (await read()).version,
          by: "Linda",
          choice: {
            kind: "redeliver",
            day: "2026-09-13",
            window: "afternoon",
            fee: "link",
          },
        },
        at(12),
      );
      expect(r).toMatchObject({ kind: "saved" });
      return { o: await read(), read };
    }
    const links = (id: number) =>
      db().select().from(paymentLinks).where(eq(paymentLinks.orderId, id));
    const target = async (id: number) =>
      (
        await db()
          .select()
          .from(deliveryAttempts)
          .where(eq(deliveryAttempts.orderId, id))
      ).find((a) => a.attempt === 1)!;
    async function payLink(token: string, t = countingGateway()) {
      const p = await preparePayLink(db(), t.gw, token, at(13));
      if (p.kind !== "pay") throw new Error(p.kind);
      t.succeed(`pi_link_${p.linkId}`);
      const intent = t.intents.get(`pi_link_${p.linkId}`)!;
      expect(intent.kind).toBe("redelivery");
      return { r: await applyRedelivery(db(), t.gw, intent, at(13)), t };
    }

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(like(orders.number, "BBL-2026-R%"));
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(like(orders.number, "BBL-2026-R%"));
      await conn?.close();
    });

    it("sends £15 on a fully paid order (not limited by still to pay), with the redelivery day in e-mail 15", async () => {
      const { o } = await missed();
      expect(await redeliveryLinkDue(db(), o)).toMatchObject({
        feePence: 1500,
      });
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "redelivery", amount: "", by: "Linda" },
          at(12),
        ),
      ).toEqual({
        kind: "sent",
        line: "Link sent · £15.00 · Redelivery",
      });
      const [l] = await links(o.id);
      expect(l).toMatchObject({
        purpose: "redelivery",
        amountPence: 1500,
        attemptId: (await target(o.id)).id,
      });
      const [m] = await db()
        .select()
        .from(mailSends)
        .where(like(mailSends.key, "pay:%"));
      expect((m.data as { view: unknown }).view).toMatchObject({
        kind: "redelivery",
        redeliveryDate: "2026-09-13",
        redeliveryWindow: "afternoon",
        toPayPence: 1500,
      });
      // One at a time.
      expect(await redeliveryLinkDue(db(), o)).toBeNull();
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "redelivery", amount: "", by: "Linda" },
          at(12),
        ),
      ).toEqual({
        kind: "closed",
      });
    });

    it("paid: the £15 becomes the attempt's fee; the cake's money does not change", async () => {
      const { o, read } = await missed();
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "redelivery", amount: "", by: "Linda" },
        at(12),
      );
      const [l] = await links(o.id);
      const { r } = await payLink(l.token);
      expect(r).toBe("booked");
      expect((await links(o.id))[0]).toMatchObject({
        status: "paid",
        paidPence: 1500,
      });
      expect(await target(o.id)).toMatchObject({
        feePaidPence: 1500,
        paymentIntentId: `pi_link_${l.id}`,
      });
      expect(await netPaid(db(), await read())).toBe(18500);
      expect(await stillToPay(db(), await read())).toBe(0);
    });

    it("then Collect instead: the paid £15 goes back as a fee refund", async () => {
      const { o, read } = await missed();
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "redelivery", amount: "", by: "Linda" },
        at(12),
      );
      const [l] = await links(o.id);
      await payLink(l.token);
      const t = countingGateway();
      await recordTheirChoice(
        db(),
        { ...t.gw, cancel: async () => {} },
        {
          orderId: o.id,
          seenVersion: (await read()).version,
          by: "Linda",
          choice: { kind: "collect", day: "2026-09-13" },
        },
        at(14),
      );
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((x) => [x.kind, x.amountPence, x.paymentIntentId])).toEqual(
        [["fee", 1500, `pi_link_${l.id}`]],
      );
    });

    it("an open link is withdrawn by Delivered after all; paid anyway, it goes back in full", async () => {
      const { o, read } = await missed();
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "redelivery", amount: "", by: "Linda" },
        at(12),
      );
      const [l] = await links(o.id);
      const t = countingGateway();
      await preparePayLink(db(), t.gw, l.token, at(12));
      await deliveredAfterAll(
        db(),
        { ...t.gw, cancel: async () => {} },
        {
          orderId: o.id,
          seenVersion: (await read()).version,
          by: "Linda",
          owner: true,
        },
        at(14),
      );
      expect((await links(o.id))[0].status).toBe("withdrawn");
      t.succeed(`pi_link_${l.id}`);
      expect(
        await applyRedelivery(
          db(),
          t.gw,
          t.intents.get(`pi_link_${l.id}`)!,
          at(15),
        ),
      ).toBe("refunded");
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((x) => [x.kind, x.amountPence])).toEqual([["fee", 1500]]);
      expect(await netPaid(db(), await read())).toBe(18500);
    });

    it("Waive it: no link is due", async () => {
      seq++;
      const { o } = await missed();
      await db()
        .update(deliveryAttempts)
        .set({ feePaidPence: 1500 })
        .where(eq(deliveryAttempts.orderId, o.id));
      expect(await redeliveryLinkDue(db(), o)).toBeNull();
    });
  },
);
