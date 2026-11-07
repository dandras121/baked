import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { cancelOrder, cancelQuote } from "./cancel-repo";
import { connect } from "./client";
import { netPaid } from "./refund-repo";
import { mailSends, orderChanges, orderLines, orders, refunds } from "./schema";
import { ensureSettings } from "./settings-repo";
import { countingGateway } from "./test-gateway";

const url = process.env.TEST_DATABASE_URL;
// The order is for Saturday 12 September; the full-refund deadline is Friday 4 September (earliest − 8).
const fullDay = londonInstant("2026-09-01", 10);
const halfDay = londonInstant("2026-09-07", 10);

describe.skipIf(!url)("database: cancel your order (§6.6, §10.1)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-8${String(seq).padStart(3, "0")}`,
        token: `cnl${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: "2026-09-12",
        earliestDate: "2026-09-12",
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_cnl_${seq}_${Math.random().toString(36).slice(2, 8)}`,
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
      message: "Happy 30th",
      pricePence: 18500,
      allergenText: "Contains eggs.",
      allergenKeys: [],
    });
    return o;
  }
  const read = async (id: number) =>
    (await db().select().from(orders).where(eq(orders.id, id)))[0];

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

  it("more than seven days ahead: the full price back, refunded, e-mail 8 and Linda's alert", async () => {
    const o = await order();
    const t = countingGateway();
    const r = await cancelOrder(
      db(),
      t.gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    expect(r).toEqual({ kind: "cancelled", refundOk: true });
    const after = await read(o.id);
    expect(after.status).toBe("refunded");
    expect(after.cancelledAt).not.toBeNull();
    expect(after.cancellation).toMatchObject({
      tier: "full",
      cardPence: 18500,
      cancelledOn: "2026-09-01",
      byLinda: false,
    });
    expect(t.refunds).toEqual([
      expect.objectContaining({
        paymentIntentId: o.paymentIntentId,
        amountPence: 18500,
      }),
    ]);
    const mails = await db().select().from(mailSends);
    expect(mails.map((m) => m.template).sort()).toEqual(["alert", "cancelled"]);
  });

  it("inside seven days: half, rounded up to the penny", async () => {
    const o = await order({ totalPence: 18501, amountReceivedPence: 18501 });
    const q = await cancelQuote(db(), o, "2026-09-07");
    expect(q.tier).toBe("half");
    expect(q.refundPence).toBe(9251);
    const r = await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 9251 },
      halfDay,
    );
    expect(r.kind).toBe("cancelled");
  });

  it("the tier counts from the earliest date the order has had", async () => {
    // Moved from 12 to 19 September: on 7 September it is twelve days to the date but five to the earliest.
    const o = await order({ date: "2026-09-19" });
    const q = await cancelQuote(db(), o, "2026-09-07");
    expect(q).toMatchObject({
      tier: "half",
      refundPence: 9250,
      earliestDiffers: true,
    });
  });

  it("a refund that changed since the page was shown cancels nothing", async () => {
    const o = await order();
    const r = await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 18500 },
      halfDay,
    );
    expect(r).toMatchObject({ kind: "changed", quote: { refundPence: 9250 } });
    expect((await read(o.id)).status).toBe("confirmed");
  });

  it("after 23:59 on D-2 nothing is cancelled (A2)", async () => {
    const o = await order();
    const r = await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 9250 },
      londonInstant("2026-09-11", 0, 5),
    );
    expect(r.kind).toBe("closed");
    expect((await read(o.id)).status).toBe("confirmed");
  });

  it("manual orders cannot be cancelled online", async () => {
    const o = await order({ kind: "manual" });
    const r = await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    expect(r.kind).toBe("closed");
  });

  it("a size-up payment going through blocks cancelling", async () => {
    const o = await order({ lockedAt: new Date(fullDay.getTime() - 60_000) });
    const r = await cancelOrder(
      db(),
      countingGateway().gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    expect(r.kind).toBe("locked");
  });

  it("works from net paid, newest charge first, and drops a waiting change", async () => {
    const o = await order({ totalPence: 24000 });
    const changePi = `pi_cnl_up_${o.id}`;
    await db()
      .insert(orderChanges)
      .values([
        {
          orderId: o.id,
          by: "customer",
          changes: [],
          moneyKind: "up",
          moneyPence: 5500,
          newTotalPence: 24000,
          paymentIntentId: changePi,
          paidPence: 5500,
          createdAt: new Date("2026-09-03T10:00:00Z"),
        },
        {
          orderId: o.id,
          by: "customer",
          changes: [],
          moneyKind: "up",
          moneyPence: 1000,
          newTotalPence: 25000,
          status: "pending",
        },
      ]);
    const q = await cancelQuote(db(), await read(o.id), "2026-09-01");
    expect(q.basisPence).toBe(24000);
    expect(q.payments.map((p) => p.pence)).toEqual([18500, 5500]);
    const t = countingGateway();
    await cancelOrder(
      db(),
      t.gw,
      { orderId: o.id, shownPence: 24000 },
      fullDay,
    );
    expect(t.refunds.map((r) => [r.paymentIntentId, r.amountPence])).toEqual([
      [changePi, 5500],
      [o.paymentIntentId, 18500],
    ]);
    const changes = await db()
      .select({ status: orderChanges.status })
      .from(orderChanges)
      .where(eq(orderChanges.orderId, o.id));
    expect(changes.map((c) => c.status).sort()).toEqual(["dropped", "saved"]);
    expect(await netPaid(db(), await read(o.id))).toBe(0);
  });

  it("a refund already made is taken off what counts", async () => {
    const o = await order();
    await db().insert(refunds).values({
      orderId: o.id,
      kind: "change",
      amountPence: 2000,
      paymentIntentId: o.paymentIntentId!,
      status: "succeeded",
    });
    const q = await cancelQuote(db(), o, "2026-09-01");
    expect(q.basisPence).toBe(16500);
    expect(q.refundsMade).toEqual([{ pence: 2000, on: expect.any(String) }]);
  });

  it("a failed Stripe refund leaves the order cancelled and tells Linda", async () => {
    const o = await order();
    const t = countingGateway();
    t.refundControl.fail = true;
    const r = await cancelOrder(
      db(),
      t.gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    expect(r).toEqual({ kind: "cancelled", refundOk: false });
    expect((await read(o.id)).status).toBe("cancelled");
    const mails = await db().select().from(mailSends);
    expect(
      mails.filter((m) => m.template === "alert").map((m) => m.key),
    ).toEqual(
      expect.arrayContaining([
        `alert:cancelled:${o.id}`,
        expect.stringMatching(/^alert:refund-failed:/),
      ]),
    );
    expect(mails.some((m) => m.template === "cancelled")).toBe(true);
  });

  it("pressing twice cancels once", async () => {
    const o = await order();
    const t = countingGateway();
    await cancelOrder(
      db(),
      t.gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    const r = await cancelOrder(
      db(),
      t.gw,
      { orderId: o.id, shownPence: 18500 },
      fullDay,
    );
    expect(r.kind).toBe("already");
    expect(t.refunds).toHaveLength(1);
  });
});
