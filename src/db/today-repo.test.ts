import { like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connect } from "./client";
import { deliveryAttempts, orderLines, orders } from "./schema";
import { stillToPay, stillToPayByOrder } from "./money-repo";
import { todayBoard, todayNumbers } from "./today-repo";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-12";

describe.skipIf(!url)("database: Today (§9.3)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(
    over: Partial<typeof orders.$inferInsert>,
    cakes = ["The Lothian"],
  ) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-6${String(seq).padStart(3, "0")}`,
        token: `tdy${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "morning",
        address: "48 Preston Road",
        postcode: "EH49 6HH",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        paymentIntentId: `pi_tdy_${seq}_${Math.random().toString(36).slice(2, 8)}`,
        snapshot: {},
        confirmedAt: new Date(`2026-09-0${(seq % 9) + 1}T10:00:00Z`),
        ...over,
      })
      .returning();
    for (const [i, name] of cakes.entries())
      await db()
        .insert(orderLines)
        .values({
          orderId: o.id,
          position: i + 1,
          slug: "x",
          name,
          sizeLine: "serves 12",
          pricePence: 9000,
          allergenText: "",
          allergenKeys: [],
        });
    return o;
  }
  beforeAll(() => migrate(db(), { migrationsFolder: "drizzle" }));
  beforeEach(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-2026-6%"));
  });
  afterAll(() => conn?.close());

  it("today's handovers by start time, collections without a time last, not-collected at the top", async () => {
    await order({ customerName: "Evening Eve", deliveryWindow: "evening" });
    await order({ customerName: "Morning Mo", deliveryWindow: "morning" });
    await order({
      customerName: "Noon Nina",
      handover: "collection",
      deliveryWindow: null,
      collectionTime: "12 noon",
    });
    await order({
      customerName: "Untimed Una",
      handover: "collection",
      deliveryWindow: null,
    });
    await order({
      customerName: "Late Larry",
      handover: "collection",
      deliveryWindow: null,
      date: "2026-09-10",
    });
    await order({ customerName: "Cancelled Cat", status: "cancelled" });
    await order({
      customerName: "Done Dan",
      handover: "collection",
      deliveryWindow: null,
      date: "2026-09-11",
      status: "completed",
    });
    const rows = await todayBoard(db(), day);
    expect(rows.map((r) => r.name)).toEqual([
      "Late Larry",
      "Morning Mo",
      "Noon Nina",
      "Evening Eve",
      "Untimed Una",
    ]);
    expect(rows[0]).toMatchObject({
      kind: "not-collected",
      flags: ["not-collected"],
    });
  });

  it("a redelivery today, a missed delivery collected today, an earlier Nobody was in with no choice", async () => {
    const red = await order({ customerName: "Redo Rab", date: "2026-09-11" });
    await db()
      .insert(deliveryAttempts)
      .values([
        {
          orderId: red.id,
          attempt: 1,
          day: "2026-09-11",
          outcome: "nobody-in",
          choice: "redeliver",
        },
        { orderId: red.id, attempt: 2, day, deliveryWindow: "afternoon" },
      ]);
    const col = await order({
      customerName: "Collect Cara",
      date: "2026-09-11",
    });
    await db().insert(deliveryAttempts).values({
      orderId: col.id,
      attempt: 1,
      day: "2026-09-11",
      outcome: "nobody-in",
      choice: "collect",
      collectDay: day,
    });
    const none = await order({
      customerName: "Silent Sid",
      date: "2026-09-10",
    });
    await db().insert(deliveryAttempts).values({
      orderId: none.id,
      attempt: 1,
      day: "2026-09-10",
      outcome: "nobody-in",
    });
    const rows = await todayBoard(db(), day);
    const by = (n: string) => rows.find((r) => r.name === n)!;
    expect(by("Redo Rab")).toMatchObject({
      kind: "redelivery",
      window: "afternoon",
      canNobodyIn: true,
    });
    expect(by("Collect Cara")).toMatchObject({
      kind: "collect",
      handover: "collection",
      canNobodyIn: false,
    });
    expect(by("Silent Sid")).toMatchObject({
      kind: "no-choice",
      flags: ["no-choice"],
    });
  });

  it("the check-day flag until the order's date; the tiles count cakes", async () => {
    await order({ customerName: "Flagged Fi", checkDay: true }, [
      "The Lothian",
      "Wee Beastie",
    ]);
    const rows = await todayBoard(db(), day);
    expect(rows[0].flags).toEqual(["check-day"]);
    expect(rows[0].cakes).toEqual(["The Lothian", "Wee Beastie"]);
    const n = await todayNumbers(db(), day, rows);
    expect(n.outToday).toBe(2);
    expect(n.subtitle).toMatchObject({ out: 1, collections: 0, payments: 0 });
  });

  it("still to pay in one go matches the order-by-order sum (§10.6)", async () => {
    const a = await order({ customerName: "Paid Pat" });
    const b = await order({
      customerName: "Owes Olly",
      amountReceivedPence: 5000,
    });
    const many = await stillToPayByOrder(db(), [a.id, b.id]);
    expect(many.get(a.id)).toBe(await stillToPay(db(), a));
    expect(many.get(b.id)).toBe(await stillToPay(db(), b));
    expect(many.get(b.id)).toBe(13500);
  });
});
