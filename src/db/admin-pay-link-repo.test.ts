import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkAddOrder,
  EMPTY_FORM,
  formFromManual,
} from "@/lib/admin/add-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { addOrder } from "./add-order-repo";
import { cancelPayLink, sendPayLink } from "./admin-pay-link-repo";
import { connect } from "./client";
import { editManualOrder } from "./edit-order-repo";
import {
  mailSends,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-23", 10);
const day = "2027-08-14";

describe.skipIf(!url)(
  "database: Send a payment link · Cancel this link (§9.5, §9.8)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    const form = {
      ...EMPTY_FORM,
      name: "Mairi Sinclair",
      email: "mairi@example.co.uk",
      phone: "07700 900 000",
      date: day,
      address: "Hopetoun House",
      postcode: "EH30 9SL",
      window: "afternoon",
      what: "Three tiers",
      serves: "100",
      total: "380",
      emails: "off" as const,
    };
    async function make() {
      const n = await addOrder(
        db(),
        checkAddOrder(form, "2026-11-23").value!,
        "Linda",
        now,
      );
      await db().delete(mailSends);
      return (await db().select().from(orders).where(eq(orders.number, n)))[0];
    }
    const links = (id: number) =>
      db()
        .select()
        .from(paymentLinks)
        .where(eq(paymentLinks.orderId, id))
        .orderBy(paymentLinks.id);

    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureSettings(db(), INITIAL_SETTINGS);
    });
    beforeEach(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(eq(orders.date, day));
    });
    afterAll(async () => {
      await db().delete(mailSends);
      await db().delete(orders).where(eq(orders.date, day));
      await conn?.close();
    });

    it("sends e-mail 15 (also with customer e-mails off), writes HISTORY; several open links are allowed", async () => {
      const o = await make();
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "deposit", amount: "£120", by: "Linda" },
          now,
        ),
      ).toEqual({
        kind: "sent",
        line: "Link sent · £120.00 · Deposit",
      });
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "rest", amount: "260", by: "Linda" },
          now,
        ),
      ).toMatchObject({
        kind: "sent",
      });
      const l = await links(o.id);
      expect(l.map((x) => [x.purpose, x.amountPence, x.status])).toEqual([
        ["deposit", 12000, "open"],
        ["rest", 26000, "open"],
      ]);
      const m = await db().select().from(mailSends);
      expect(m.map((x) => x.template)).toEqual(["pay-link", "pay-link"]);
      const h = await db()
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, o.id));
      expect(h.map((x) => x.what)).toContain("Link sent · £120.00 · Deposit");
    });

    it("refuses more than still to pay, below £0.30, and an order with nothing left or cancelled", async () => {
      const o = await make();
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "rest", amount: "380.01", by: "Linda" },
          now,
        ),
      ).toEqual({
        kind: "invalid",
        error: "That is more than the £380.00 still to pay.",
      });
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "rest", amount: "0.2", by: "Linda" },
          now,
        ),
      ).toMatchObject({
        kind: "invalid",
      });
      await db()
        .update(orders)
        .set({ status: "cancelled" })
        .where(eq(orders.id, o.id));
      expect(
        await sendPayLink(
          db(),
          { orderId: o.id, purpose: "rest", amount: "10", by: "Linda" },
          now,
        ),
      ).toEqual({
        kind: "closed",
      });
      expect(await links(o.id)).toEqual([]);
    });

    it("Cancel this link withdraws it (and its PaymentIntent), with a HISTORY line and no e-mail", async () => {
      const o = await make();
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "rest", amount: "380", by: "Linda" },
        now,
      );
      const [l] = await links(o.id);
      await db()
        .update(paymentLinks)
        .set({ paymentIntentId: `pi_cancel_${l.id}` })
        .where(eq(paymentLinks.id, l.id));
      await db().delete(mailSends);
      const cancelled: string[] = [];
      expect(
        await cancelPayLink(
          db(),
          { cancel: async (id) => void cancelled.push(id) },
          { linkId: l.id, by: "Linda" },
          now,
        ),
      ).toBe(true);
      expect((await links(o.id))[0].status).toBe("withdrawn");
      expect(cancelled).toEqual([`pi_cancel_${l.id}`]);
      expect(await db().select().from(mailSends)).toEqual([]);
      expect(
        await cancelPayLink(db(), null, { linkId: l.id, by: "Linda" }, now),
      ).toBe(false);
    });

    it("a lowered manual total withdraws the open links worth more than the new still to pay", async () => {
      const o = await make();
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "deposit", amount: "100", by: "Linda" },
        now,
      );
      await sendPayLink(
        db(),
        { orderId: o.id, purpose: "rest", amount: "380", by: "Linda" },
        now,
      );
      const [line] = await db()
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, o.id));
      const f = formFromManual({ ...o, date: String(o.date) }, line, "");
      const r = await editManualOrder(
        db(),
        { ...countingGateway().gw, cancel: async () => {} },
        {
          orderId: o.id,
          seenVersion: o.version,
          by: "Linda",
          owner: true,
          value: checkAddOrder({ ...f, total: "200" }, "2026-11-23", day)
            .value!,
          confirmRefund: false,
        },
        now,
      );
      expect(r).toMatchObject({ kind: "saved" });
      expect((await links(o.id)).map((x) => [x.amountPence, x.status])).toEqual(
        [
          [10000, "open"],
          [38000, "withdrawn"],
        ],
      );
    });
  },
);
