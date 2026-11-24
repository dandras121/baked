import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import {
  dismissNoOrder,
  keepDueFee,
  moneyFlags,
  refundDueFee,
  retryRefund,
} from "./money-flags-repo";
import {
  deliveryAttempts,
  orderHistory,
  orders,
  paymentAlerts,
  refunds,
} from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
const now = londonInstant("2026-11-24", 10);

describe.skipIf(!url)("database: Money flags (§9.9)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-F${String(seq).padStart(3, "0")}`,
        token: `flg${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: "2026-12-12",
        earliestDate: "2026-12-12",
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        customerName: "Callum Reid",
        email: "callum@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_flag_${seq}`,
        snapshot: {},
        confirmedAt: londonInstant("2026-11-01", 9),
        ...over,
      })
      .returning();
    return o;
  }
  const mine = <T extends { number: string }>(xs: T[]) =>
    xs.filter((x) => x.number.startsWith("BBL-2026-F"));
  const history = async (id: number) =>
    (
      await db()
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, id))
        .orderBy(orderHistory.id)
    ).map((h) => h.what);

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-2026-F%"));
    await db()
      .delete(paymentAlerts)
      .where(like(paymentAlerts.paymentIntentId, "pi_flagtest_%"));
  });
  afterAll(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-2026-F%"));
    await db()
      .delete(paymentAlerts)
      .where(like(paymentAlerts.paymentIntentId, "pi_flagtest_%"));
    await conn?.close();
  });

  it("Stripe payment has no order: shown with its amount (also from older words) until dismissed", async () => {
    const [a] = await db()
      .insert(paymentAlerts)
      .values({
        kind: "no-order",
        paymentIntentId: "pi_flagtest_1",
        detail: "Stripe payment of 6400p has no order",
      })
      .returning();
    let f = (await moneyFlags(db(), now)).noOrder.find((x) => x.id === a.id);
    expect(f).toMatchObject({ pence: 6400, paymentIntentId: "pi_flagtest_1" });
    expect(await dismissNoOrder(db(), a.id, "Linda", now)).toBe(true);
    f = (await moneyFlags(db(), now)).noOrder.find((x) => x.id === a.id);
    expect(f).toBeUndefined();
    expect(await dismissNoOrder(db(), a.id, "Linda", now)).toBe(false);
  });

  it("Refund failed: Try again uses the same key; it clears when Stripe takes it, and a cancellation settles", async () => {
    const o = await order({
      status: "cancelled",
      cancellation: {
        cardPence: 9250,
        handPence: 0,
        cancelledOn: "2026-11-20",
      },
    });
    const [r] = await db()
      .insert(refunds)
      .values({
        orderId: o.id,
        kind: "cancel",
        amountPence: 9250,
        paymentIntentId: o.paymentIntentId!,
        idempotencyKey: `${o.id}-77`,
        status: "failed",
        error: "card_declined",
      })
      .returning();
    expect(mine((await moneyFlags(db(), now)).refundFailed)).toMatchObject([
      { id: r.id, pence: 9250, error: "card_declined" },
    ]);
    const keys: string[] = [];
    const ok = {
      ...countingGateway().gw,
      refund: async (_pi: string, _p: number, key: string) => (
        keys.push(key),
        { ok: true as const, id: "re_1", status: "succeeded" as const }
      ),
    };
    expect(await retryRefund(db(), ok, r.id, "Linda", now)).toBe("refunded");
    expect(keys).toEqual([`${o.id}-77`]);
    expect(mine((await moneyFlags(db(), now)).refundFailed)).toEqual([]);
    expect(
      (await db().select().from(orders).where(eq(orders.id, o.id)))[0].status,
    ).toBe("refunded");
    expect((await history(o.id)).at(-1)).toBe(
      "Tried the £92.50 refund again — it went through",
    );
  });

  it("Booked after its hold ran out: shown until its date; Checked is on Today's action", async () => {
    await order({ checkDay: true });
    await order({
      checkDay: true,
      date: "2026-11-20",
      earliestDate: "2026-11-20",
    });
    expect(
      mine((await moneyFlags(db(), now)).checkDay).map((x) => x.date),
    ).toEqual(["2026-12-12"]);
  });

  it("£15 redelivery to refund: Refund £15 makes a fee refund; Dismiss keeps it; either clears the flag", async () => {
    const a1 = await order();
    const a2 = await order();
    const [t1] = await db()
      .insert(deliveryAttempts)
      .values({
        orderId: a1.id,
        attempt: 1,
        day: "2026-11-20",
        outcome: "nobody-in",
        choice: "redeliver",
        feePaidPence: 1500,
        paymentIntentId: "pi_fee_flag_1",
        feeRefundDue: true,
      })
      .returning();
    const [t2] = await db()
      .insert(deliveryAttempts)
      .values({
        orderId: a2.id,
        attempt: 1,
        day: "2026-11-20",
        outcome: "nobody-in",
        choice: "redeliver",
        feePaidPence: 1500,
        paymentIntentId: "pi_fee_flag_2",
        feeRefundDue: true,
      })
      .returning();
    expect(mine((await moneyFlags(db(), now)).feeToRefund)).toHaveLength(2);
    expect(
      await refundDueFee(db(), countingGateway().gw, t1.id, "Linda", now),
    ).toBe("refunded");
    const rf = await db()
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, a1.id));
    expect(rf.map((x) => [x.kind, x.amountPence, x.idempotencyKey])).toEqual([
      ["fee", 1500, `fee-${rf[0].id}`],
    ]);
    expect(await keepDueFee(db(), t2.id, "Linda", now)).toBe(true);
    expect(mine((await moneyFlags(db(), now)).feeToRefund)).toEqual([]);
    expect((await history(a2.id)).at(-1)).toBe(
      "Kept the £15.00 redelivery fee — nothing refunded",
    );
  });

  it("£… to give back by hand: a cancellation's by-hand part, and a live order paid above its total", async () => {
    await order({
      status: "cancelled",
      cancellation: {
        cardPence: 0,
        handPence: 9250,
        cancelledOn: "2026-11-20",
      },
    });
    await order({ totalPence: 15000 });
    expect(
      mine((await moneyFlags(db(), now)).handBack)
        .map((x) => x.pence)
        .sort(),
    ).toEqual([3500, 9250]);
  });
});
