import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CancelledView } from "@/lib/mail/after-emails";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { adminCancelOrder, adminCancelQuote } from "./admin-cancel-repo";
import { connect } from "./client";
import {
  mailSends,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-09-01", 10);

describe.skipIf(!url)(
  "database: Cancel the order from the admin (§9.5)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    let seq = 0;
    async function order(over: Partial<typeof orders.$inferInsert> = {}) {
      seq++;
      const [o] = await db()
        .insert(orders)
        .values({
          number: `BBL-2026-9${String(seq).padStart(3, "0")}`,
          token: `acn${seq}-${Math.random().toString(36).slice(2)}-padding`,
          date: "2026-09-12",
          earliestDate: "2026-09-12",
          handover: "delivery",
          deliveryWindow: "morning",
          postcode: "EH49 6HH",
          customerName: "Mairi Sinclair",
          email: "mairi@example.co.uk",
          phone: "07700 900 000",
          consents: {},
          totalPence: 28000,
          amountReceivedPence: 28000,
          paymentIntentId: `pi_acn_${seq}_${Math.random().toString(36).slice(2, 8)}`,
          snapshot: {},
          confirmedAt: new Date("2026-08-31T10:00:00Z"),
          ...over,
        })
        .returning();
      await db().insert(orderLines).values({
        orderId: o.id,
        position: 1,
        slug: "the-lothian",
        name: "The Lothian",
        sizeLine: "Two tiers · serves 24",
        pricePence: 28000,
        allergenText: "Contains eggs.",
        allergenKeys: [],
      });
      return o;
    }
    const read = async (id: number) =>
      (await db().select().from(orders).where(eq(orders.id, id)))[0];
    const mail8 = async () =>
      (await db().select().from(mailSends))
        .filter((m) => m.template === "cancelled")
        .map((m) => (m.data as { view: CancelledView }).view);

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(orders);
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(orders);
      await conn?.close();
    });

    it("proposes the §10.1 tier on what was paid", async () => {
      const o = await order();
      expect(await adminCancelQuote(db(), o, "2026-09-01")).toEqual({
        tier: "full",
        proposedPence: 28000,
        paidPence: 28000,
        cardPence: 28000,
      });
      expect(
        (await adminCancelQuote(db(), o, "2026-09-08")).proposedPence,
      ).toBe(14000);
      expect(
        (await adminCancelQuote(db(), o, "2026-09-12")).proposedPence,
      ).toBe(0);
    });

    it("cancels, refunds the card at once, settles to refunded, writes HISTORY, withdraws links and sends e-mail 8", async () => {
      const o = await order();
      await db()
        .insert(paymentLinks)
        .values({
          orderId: o.id,
          token: `lnk-${o.id}-padding-padding-padding`,
          purpose: "rest",
          amountPence: 1000,
          sentOn: "2026-09-01",
        });
      const t = countingGateway();
      const r = await adminCancelOrder(
        db(),
        t.gw,
        {
          orderId: o.id,
          seenVersion: o.version,
          amountPence: 28000,
          by: "Linda",
        },
        now,
      );
      expect(r).toEqual({ kind: "cancelled", refundOk: true });
      expect(t.refunds.map((x) => x.amountPence)).toEqual([28000]);
      const n = await read(o.id);
      expect(n.status).toBe("refunded");
      expect(n.changedBy).toBe("member:Linda");
      const [link] = await db()
        .select()
        .from(paymentLinks)
        .where(eq(paymentLinks.orderId, o.id));
      expect(link.status).toBe("withdrawn");
      const h = await db()
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, o.id));
      expect(h.map((x) => x.what)).toEqual([
        "Cancelled the order · £280.00 back to the card",
      ]);
      expect(await mail8()).toEqual([
        expect.objectContaining({
          tier: "full",
          cardPence: 28000,
          handPence: 0,
          byLinda: true,
        }),
      ]);
    });

    it("Linda's own amount gives e-mail 8 the own wording; £0 stays cancelled with “No refund”", async () => {
      const a = await order();
      await adminCancelOrder(
        db(),
        countingGateway().gw,
        {
          orderId: a.id,
          seenVersion: a.version,
          amountPence: 10000,
          by: "Linda",
        },
        now,
      );
      const b = await order();
      await adminCancelOrder(
        db(),
        countingGateway().gw,
        { orderId: b.id, seenVersion: b.version, amountPence: 0, by: "Linda" },
        now,
      );
      expect((await read(b.id)).status).toBe("cancelled");
      expect((await mail8()).map((v) => [v.tier, v.cardPence])).toEqual([
        ["own", 10000],
        ["own", 0],
      ]);
    });

    it("without a card payment the refund is to give back by hand; the order stays cancelled", async () => {
      const o = await order({ paymentIntentId: null, kind: "manual" });
      const t = countingGateway();
      await adminCancelOrder(
        db(),
        t.gw,
        {
          orderId: o.id,
          seenVersion: o.version,
          amountPence: 28000,
          by: "Linda",
        },
        now,
      );
      expect(t.refunds).toEqual([]);
      expect((await read(o.id)).status).toBe("cancelled");
      expect((await mail8())[0]).toMatchObject({
        cardPence: 0,
        handPence: 28000,
        manual: true,
      });
    });

    it("refuses an out-of-date page, too much, and a second cancel; nothing changes", async () => {
      const o = await order();
      await db()
        .update(orders)
        .set({
          version: o.version + 1,
          changedBy: "member:Ewan",
          changedAt: now,
        })
        .where(eq(orders.id, o.id));
      const gw = countingGateway().gw;
      const stale = await adminCancelOrder(
        db(),
        gw,
        {
          orderId: o.id,
          seenVersion: o.version,
          amountPence: 28000,
          by: "Linda",
        },
        now,
      );
      expect(stale).toMatchObject({ kind: "conflict" });
      expect((stale as { line: string }).line).toMatch(
        /^Ewan changed this at \d{2}:\d{2} — here is the new version$/,
      );
      expect(
        await adminCancelOrder(
          db(),
          gw,
          {
            orderId: o.id,
            seenVersion: o.version + 1,
            amountPence: 28001,
            by: "Linda",
          },
          now,
        ),
      ).toEqual({ kind: "amount", paidPence: 28000 });
      expect((await read(o.id)).status).toBe("confirmed");
      await adminCancelOrder(
        db(),
        gw,
        {
          orderId: o.id,
          seenVersion: o.version + 1,
          amountPence: 0,
          by: "Linda",
        },
        now,
      );
      expect(
        await adminCancelOrder(
          db(),
          gw,
          {
            orderId: o.id,
            seenVersion: o.version + 2,
            amountPence: 0,
            by: "Linda",
          },
          now,
        ),
      ).toEqual({ kind: "already" });
    });

    it("a failed Stripe refund leaves the order cancelled with a failed refund line", async () => {
      const o = await order();
      const t = countingGateway();
      t.refundControl.fail = true;
      const r = await adminCancelOrder(
        db(),
        t.gw,
        {
          orderId: o.id,
          seenVersion: o.version,
          amountPence: 28000,
          by: "Linda",
        },
        now,
      );
      expect(r).toEqual({ kind: "cancelled", refundOk: false });
      expect((await read(o.id)).status).toBe("cancelled");
      const rf = await db()
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, o.id));
      expect(rf.map((x) => x.status)).toEqual(["failed"]);
    });
  },
);
