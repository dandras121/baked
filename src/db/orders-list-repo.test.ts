import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { listOrders } from "./orders-list-repo";
import { orderLines, orders, refunds } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const today = "2026-09-12"; // a Saturday

describe.skipIf(!url)("database: the Orders list (§9.4)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-8${String(seq).padStart(3, "0")}`,
        token: `lst${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: today,
        earliestDate: today,
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        town: "Linlithgow",
        customerName: `Person ${seq}`,
        email: `p${seq}@example.co.uk`,
        phone: "07700 900 000",
        phoneE164: "+447700900000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
        ...over,
      })
      .returning();
    await db().insert(orderLines).values({
      orderId: o.id,
      position: 1,
      slug: "the-lothian",
      name: "The Lothian",
      sizeLine: "serves 12",
      pricePence: o.totalPence,
      allergenText: "",
      allergenKeys: [],
    });
    return o;
  }
  const names = async (o: Partial<Parameters<typeof listOrders>[1]> = {}) =>
    (
      await listOrders(db(), { filter: "all", shown: 20, today, ...o })
    ).rows.map((r) => r.name);

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(orders);
  });
  afterAll(async () => {
    await db().delete(orders);
    await conn?.close();
  });

  it("puts upcoming orders first by date ascending, then the past by date descending", async () => {
    await order({ customerName: "Past near", date: "2026-09-10" });
    await order({ customerName: "Later", date: "2026-09-20" });
    await order({ customerName: "Today", date: today });
    await order({ customerName: "Past far", date: "2026-08-22" });
    expect(await names()).toEqual(["Today", "Later", "Past near", "Past far"]);
  });

  it("filters: This week, Upcoming, Completed, Cancelled, To pay", async () => {
    await order({ customerName: "Monday", date: "2026-09-07" });
    await order({ customerName: "Next week", date: "2026-09-14" });
    await order({
      customerName: "Done",
      date: "2026-09-05",
      status: "completed",
    });
    await order({
      customerName: "Off",
      date: "2026-09-19",
      status: "cancelled",
    });
    await order({
      customerName: "Back",
      date: "2026-09-01",
      status: "refunded",
    });
    await order({
      customerName: "Owes",
      date: "2026-09-25",
      amountReceivedPence: 8000,
    });
    expect(await names({ filter: "week" })).toEqual(["Monday"]);
    expect(await names({ filter: "upcoming" })).toEqual(["Next week", "Owes"]);
    expect(await names({ filter: "completed" })).toEqual(["Done"]);
    expect(await names({ filter: "cancelled" })).toEqual(["Off", "Back"]);
    expect(await names({ filter: "topay" })).toEqual(["Owes"]);
  });

  it("searches name, town, postcode, number, e-mail and phone, combined with the filter", async () => {
    await order({ customerName: "Mairi Sinclair", town: "Linlithgow" });
    const callum = await order({
      customerName: "Callum Reid",
      town: "Bathgate",
      postcode: "EH48 1AA",
      email: "callum@example.co.uk",
      phone: "07700 900 358",
      phoneE164: "+447700900358",
    });
    expect(await names({ q: "mairi" })).toEqual(["Mairi Sinclair"]);
    expect(await names({ q: "bathg" })).toEqual(["Callum Reid"]);
    expect(await names({ q: "eh481aa" })).toEqual(["Callum Reid"]);
    expect(await names({ q: callum.number })).toEqual(["Callum Reid"]);
    expect(await names({ q: callum.number.replace("BBL-", "") })).toEqual([
      "Callum Reid",
    ]);
    expect(await names({ q: "callum@" })).toEqual(["Callum Reid"]);
    expect(await names({ q: "07700900358" })).toEqual(["Callum Reid"]);
    expect(await names({ q: "+44 7700 900358" })).toEqual(["Callum Reid"]);
    expect(await names({ q: "callum", filter: "completed" })).toEqual([]);
    expect(await names({ q: "c" })).toHaveLength(2); // one letter: no search
  });

  it("pages of 20 with the total; the cells", async () => {
    for (let i = 0; i < 23; i++) await order({ date: "2026-10-01" });
    const r = await listOrders(db(), { filter: "all", shown: 20, today });
    expect(r.rows).toHaveLength(20);
    expect(r.total).toBe(23);
    expect(
      (await listOrders(db(), { filter: "all", shown: 40, today })).rows,
    ).toHaveLength(23);
    expect(r.rows[0]).toMatchObject({
      cake: "The Lothian",
      where: "Linlithgow",
      paid: "£185 · paid",
      status: "confirmed",
    });
  });

  it("collection reads Collection; a cancelled order with a Stripe refund reads refunded", async () => {
    await order({
      customerName: "Coll",
      handover: "collection",
      deliveryWindow: null,
    });
    const off = await order({ customerName: "Off", status: "refunded" });
    await db()
      .insert(refunds)
      .values({
        orderId: off.id,
        kind: "cancel",
        amountPence: 18500,
        status: "succeeded",
        paymentIntentId: `pi_t_${off.id}`,
        createdAt: new Date(),
      });
    const r = (await listOrders(db(), { filter: "all", shown: 20, today }))
      .rows;
    expect(r.find((x) => x.name === "Coll")?.where).toBe("Collection");
    expect(r.find((x) => x.name === "Off")?.paid).toBe("£185 · refunded");
  });
});
