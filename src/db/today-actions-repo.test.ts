import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { ensureSettings } from "./settings-repo";
import {
  checkedDay,
  markHandedOver,
  nobodyWasIn,
  undoHandedOver,
} from "./today-actions-repo";
import { todayBoard } from "./today-repo";
import { mailSends, orderHistory, orders } from "./schema";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-12";
const at = (h: number, m = 0, d = day) => londonInstant(d, h, m);

describe.skipIf(!url)("database: Today's actions (§9.3)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-7${String(seq).padStart(3, "0")}`,
        token: `tda${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: day,
        earliestDate: day,
        handover: "delivery",
        deliveryWindow: "morning",
        postcode: "EH49 6HH",
        address: "48 Preston Road",
        customerName: "Mairi Sinclair",
        email: "mairi@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
        ...over,
      })
      .returning();
    return o;
  }
  const history = async (id: number) =>
    (
      await db()
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, id))
        .orderBy(orderHistory.id)
    ).map((h) => `${h.byName}: ${h.what}`);
  const reread = async (id: number) =>
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

  it("Mark handed over completes a confirmed order on its day, bumps the version and writes HISTORY", async () => {
    const o = await order();
    expect(await markHandedOver(db(), o.id, "Linda", at(11, 52))).toBe(true);
    const n = await reread(o.id);
    expect(n.status).toBe("completed");
    expect(n.handedOverAt).toEqual(at(11, 52));
    expect(n.version).toBe(o.version + 1);
    expect(n.changedBy).toBe("member:Linda");
    expect(await history(o.id)).toEqual(["Linda: Marked handed over"]);
  });

  it("does not complete an order before its day, or one that is not confirmed", async () => {
    const early = await order({ date: "2026-09-13" });
    expect(await markHandedOver(db(), early.id, "Linda", at(10))).toBe(false);
    const cancelled = await order({ status: "cancelled" });
    expect(await markHandedOver(db(), cancelled.id, "Linda", at(10))).toBe(
      false,
    );
    expect((await reread(early.id)).status).toBe("confirmed");
  });

  it("an earlier order not yet handed over can still be marked (Not collected yet)", async () => {
    const o = await order({ date: "2026-09-10", handover: "collection" });
    expect(await markHandedOver(db(), o.id, "Ewan", at(9))).toBe(true);
  });

  it("Undo works until 23:59 of the same day, not the day after", async () => {
    const o = await order();
    await markHandedOver(db(), o.id, "Linda", at(11, 52));
    expect(await undoHandedOver(db(), o.id, "Linda", at(23, 59))).toBe(true);
    const n = await reread(o.id);
    expect(n.status).toBe("confirmed");
    expect(n.handedOverAt).toBeNull();

    await markHandedOver(db(), o.id, "Linda", at(12));
    expect(
      await undoHandedOver(db(), o.id, "Linda", at(0, 1, "2026-09-13")),
    ).toBe(false);
    expect((await reread(o.id)).status).toBe("completed");
    expect(await history(o.id)).toEqual([
      "Linda: Marked handed over",
      "Linda: Undid handed over",
      "Linda: Marked handed over",
    ]);
  });

  it("Checked clears the check-the-day flag once", async () => {
    const o = await order({ checkDay: true });
    expect(await checkedDay(db(), o.id, "Ewan", at(9))).toBe(true);
    expect((await reread(o.id)).checkDay).toBe(false);
    expect(await checkedDay(db(), o.id, "Ewan", at(9))).toBe(false);
    expect(await history(o.id)).toEqual(["Ewan: Checked the day"]);
  });

  it("Nobody was in records the attempt, queues e-mail 13 once and shows on the row", async () => {
    const o = await order();
    expect(await nobodyWasIn(db(), o.id, "Linda", at(11, 30))).toBe(true);
    expect(await nobodyWasIn(db(), o.id, "Linda", at(11, 31))).toBe(false);
    const mails = (await db().select().from(mailSends)).filter(
      (m) => m.template === "missed-you",
    );
    expect(mails).toHaveLength(1);
    expect(await history(o.id)).toEqual([
      "Linda: Nobody was in — the “I missed you” e-mail sent",
    ]);
    const [row] = (await todayBoard(db(), day)).filter(
      (r) => r.orderId === o.id,
    );
    expect(row.canNobodyIn).toBe(false);
    expect(row.missed).toEqual({
      choice: "none",
      redeliveryDay: null,
      feePaidPence: 0,
    });
  });

  it("Nobody was in is for deliveries only", async () => {
    const o = await order({ handover: "collection", deliveryWindow: null });
    expect(await nobodyWasIn(db(), o.id, "Linda", at(11))).toBe(false);
  });
});

describe.skipIf(!url)("database: Collection time (§9.5)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  afterAll(async () => {
    await db().delete(orders);
    await conn?.close();
  });
  it("saves on blur, trims to 40, clears, writes HISTORY; only on collection orders", async () => {
    const { saveCollectionTime } = await import("./order-detail-repo");
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-CT${Date.now() % 100000}`,
        token: `ct-${Math.random().toString(36).slice(2)}-padding-padding`,
        date: day,
        earliestDate: day,
        handover: "collection",
        customerName: "Callum Reid",
        email: "callum@example.co.uk",
        phone: "07700 900 358",
        consents: {},
        totalPence: 21000,
        amountReceivedPence: 21000,
        snapshot: {},
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
      })
      .returning();
    expect(
      await saveCollectionTime(db(), o.id, "  12   noon ", "Linda"),
    ).toEqual({ kind: "saved", time: "12 noon" });
    expect(await saveCollectionTime(db(), o.id, "12 noon", "Linda")).toEqual({
      kind: "same",
      time: "12 noon",
    });
    expect(
      (await saveCollectionTime(db(), o.id, "x".repeat(60), "Linda")).time,
    ).toHaveLength(40);
    expect(await saveCollectionTime(db(), o.id, "", "Ewan")).toEqual({
      kind: "saved",
      time: null,
    });
    const h = await db()
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id))
      .orderBy(orderHistory.id);
    expect(h.map((x) => `${x.byName}: ${x.what}`)).toEqual([
      "Linda: Collection time set to “12 noon”",
      `Linda: Collection time set to “${"x".repeat(40)}”`,
      "Ewan: Collection time cleared",
    ]);
    const [d] = await db()
      .insert(orders)
      .values({
        ...o,
        id: undefined,
        number: `${o.number}D`,
        token: `${o.token}D`,
        handover: "delivery",
      })
      .returning();
    expect((await saveCollectionTime(db(), d.id, "noon", "Linda")).kind).toBe(
      "not-collection",
    );
  });
});
