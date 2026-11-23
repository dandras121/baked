import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkAddOrder,
  EMPTY_FORM,
  type AddOrderForm,
} from "@/lib/admin/add-order";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { addOrder } from "./add-order-repo";
import { adminCancelOrder } from "./admin-cancel-repo";
import { sendPayLink } from "./admin-pay-link-repo";
import { connect } from "./client";
import {
  handToGiveBack,
  recordHandPayment,
  recordHandRefund,
  removeHandPayment,
} from "./hand-money-repo";
import { moneyByOrder } from "./money-repo";
import {
  handPayments,
  mailSends,
  orderHistory,
  orders,
  paymentLinks,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-23", 10);
const day = "2027-09-11";

describe.skipIf(!url)("database: money by hand on Order detail (§9.5)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  async function make(over: Partial<AddOrderForm> = {}) {
    const n = await addOrder(
      db(),
      checkAddOrder(
        {
          ...EMPTY_FORM,
          name: "Callum Reid",
          email: "callum@example.co.uk",
          phone: "07700 900 000",
          date: day,
          address: "1 High Street",
          postcode: "EH52 6RA",
          window: "morning",
          what: "A cake",
          serves: "20",
          total: "380",
          ...over,
        },
        "2026-11-23",
      ).value!,
      "Linda",
      now,
    );
    await db().delete(mailSends);
    return (await db().select().from(orders).where(eq(orders.number, n)))[0];
  }
  const read = async (id: number) =>
    (await db().select().from(orders).where(eq(orders.id, id)))[0];
  const due = async (id: number) =>
    (await moneyByOrder(db(), [id])).get(id)!.stillToPayPence;
  const v = (
    pence: number,
    method: "cash" | "bank" = "cash",
    date = "2026-11-20",
  ) => ({ pence, method, date });

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

  it("Record a payment: a payment line, still to pay falls, HISTORY, no e-mail; never above still to pay", async () => {
    const o = await make();
    expect(
      await recordHandPayment(
        db(),
        null,
        { orderId: o.id, value: v(12000), by: "Linda" },
        now,
      ),
    ).toEqual({ kind: "saved" });
    expect(await due(o.id)).toBe(26000);
    expect(
      await recordHandPayment(
        db(),
        null,
        { orderId: o.id, value: v(26001), by: "Linda" },
        now,
      ),
    ).toEqual({
      kind: "too-much",
      maxPence: 26000,
    });
    const h = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(h.map((x) => x.what)).toContain(
      "Recorded a payment · Cash £120.00 · 20 Nov",
    );
    expect(await db().select().from(mailSends)).toEqual([]);
  });

  it("Record a payment withdraws open links worth more than the new still to pay", async () => {
    const o = await make();
    await sendPayLink(
      db(),
      { orderId: o.id, purpose: "rest", amount: "380", by: "Linda" },
      now,
    );
    await sendPayLink(
      db(),
      { orderId: o.id, purpose: "deposit", amount: "100", by: "Linda" },
      now,
    );
    await recordHandPayment(
      db(),
      { cancel: async () => {} },
      { orderId: o.id, value: v(20000, "bank"), by: "Linda" },
      now,
    );
    const l = await db()
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.orderId, o.id));
    expect(l.map((x) => [x.amountPence, x.status]).sort()).toEqual([
      [10000, "open"],
      [38000, "withdrawn"],
    ]);
  });

  it("Remove: the line stops counting, still to pay goes back up, HISTORY keeps it; only once", async () => {
    const o = await make({ paid: "100", method: "cash" });
    const [line] = await db()
      .select()
      .from(handPayments)
      .where(eq(handPayments.orderId, o.id));
    expect(await due(o.id)).toBe(28000);
    expect(
      await removeHandPayment(db(), { lineId: line.id, by: "Linda" }, now),
    ).toEqual({ kind: "saved" });
    expect(await due(o.id)).toBe(38000);
    expect(
      await removeHandPayment(db(), { lineId: line.id, by: "Linda" }, now),
    ).toEqual({ kind: "closed" });
    const h = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id));
    expect(h.at(-1)?.what).toBe("Removed the £100.00 cash payment of 23 Nov");
  });

  it("a cancellation's by-hand part: recorded in parts, then the order is refunded", async () => {
    const o = await make({ paid: "185", method: "cash" });
    const r = await adminCancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, seenVersion: o.version, amountPence: 9250, by: "Linda" },
      now,
    );
    expect(r).toMatchObject({ kind: "cancelled" });
    let c = await read(o.id);
    expect(c.status).toBe("cancelled");
    expect(await handToGiveBack(db(), c)).toBe(9250);
    expect(
      await recordHandRefund(
        db(),
        { orderId: o.id, value: v(9251, "bank"), by: "Linda" },
        now,
      ),
    ).toEqual({
      kind: "too-much",
      maxPence: 9250,
    });
    await recordHandRefund(
      db(),
      { orderId: o.id, value: v(5000, "bank"), by: "Linda" },
      now,
    );
    c = await read(o.id);
    expect(c.status).toBe("cancelled");
    expect(await handToGiveBack(db(), c)).toBe(4250);
    await recordHandRefund(
      db(),
      { orderId: o.id, value: v(4250, "bank"), by: "Linda" },
      now,
    );
    c = await read(o.id);
    expect(c.status).toBe("refunded");
    expect(await handToGiveBack(db(), c)).toBe(0);
    expect(
      await recordHandRefund(
        db(),
        { orderId: o.id, value: v(1), by: "Linda" },
        now,
      ),
    ).toEqual({ kind: "closed" });
    // A by-hand line on a cancelled order cannot be removed.
    const [paid] = await db()
      .select()
      .from(handPayments)
      .where(eq(handPayments.orderId, o.id));
    expect(
      await removeHandPayment(db(), { lineId: paid.id, by: "Linda" }, now),
    ).toEqual({ kind: "closed" });
  });

  it("a live order paid above its total: the excess is to give back by hand", async () => {
    const o = await make({ paid: "380", method: "bank" });
    await db()
      .update(orders)
      .set({ totalPence: 30000 })
      .where(eq(orders.id, o.id));
    const c = await read(o.id);
    expect(await handToGiveBack(db(), c)).toBe(8000);
    await recordHandRefund(
      db(),
      { orderId: o.id, value: v(8000, "bank"), by: "Linda" },
      now,
    );
    expect(await handToGiveBack(db(), await read(o.id))).toBe(0);
    expect((await read(o.id)).status).toBe("confirmed");
  });
});
