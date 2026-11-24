import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { sendPayLink } from "./admin-pay-link-repo";
import { connect } from "./client";
import { recordHandPayment } from "./hand-money-repo";
import { moneyScreen } from "./money-screen-repo";
import { orders } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
// Tuesday 24 November 2026: this week is Mon 23 – Sun 29.
const now = londonInstant("2026-11-24", 10);

describe.skipIf(!url)("database: Money (§9.9, §13)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(over: Partial<typeof orders.$inferInsert> = {}) {
    seq++;
    const [o] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-Y${String(seq).padStart(3, "0")}`,
        token: `mny${seq}-${Math.random().toString(36).slice(2)}-padding`,
        date: "2026-11-27",
        earliestDate: "2026-11-27",
        handover: "collection",
        customerName: "Fiona Grant",
        email: "fiona@example.co.uk",
        phone: "07700 900 000",
        consents: {},
        totalPence: 32000,
        amountReceivedPence: 8000,
        snapshot: {},
        confirmedAt: londonInstant("2026-11-23", 9),
        ...over,
      })
      .returning();
    return o;
  }

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-2026-Y%"));
  });
  afterAll(async () => {
    await db().delete(orders).where(like(orders.number, "BBL-2026-Y%"));
    await conn?.close();
  });

  it("tiles, the row with its latest open link, the paid-in-full line", async () => {
    const before = await moneyScreen(db(), now);
    const soon = await order();
    await order({
      number: "BBL-2026-Y900",
      date: "2026-12-20",
      earliestDate: "2026-12-20",
      totalPence: 18500,
      amountReceivedPence: 0,
    });
    await order({
      number: "BBL-2026-Y901",
      totalPence: 18500,
      amountReceivedPence: 18500,
    });
    await order({
      number: "BBL-2026-Y902",
      status: "cancelled",
      totalPence: 9900,
      amountReceivedPence: 0,
    });
    await sendPayLink(
      db(),
      { orderId: soon.id, purpose: "rest", amount: "240", by: "Linda" },
      londonInstant("2026-09-01", 9),
    );
    await recordHandPayment(
      db(),
      null,
      {
        orderId: soon.id,
        value: { pence: 2000, method: "cash", date: "2026-11-23" },
        by: "Linda",
      },
      now,
    );
    const after = await moneyScreen(db(), now);

    // Paid this week: the £80 and £185 checkouts on Mon 23 and the £20 cash; still to pay: £220 + £185.
    expect(after.tiles.paidThisWeek - before.tiles.paidThisWeek).toBe(
      8000 + 18500 + 2000,
    );
    expect(after.tiles.stillToPay - before.tiles.stillToPay).toBe(
      22000 + 18500,
    );
    expect(after.tiles.dueWithin7 - before.tiles.dueWithin7).toBe(22000);
    expect(after.tiles.takenThisYear - before.tiles.takenThisYear).toBe(
      8000 + 2000 + 18500,
    );
    expect(after.paidInFull.count - before.paidInFull.count).toBe(1);
    expect(after.paidInFull.totalPence - before.paidInFull.totalPence).toBe(
      18500,
    );

    const mine = after.rows.filter((r) => r.number.startsWith("BBL-2026-Y"));
    expect(mine.map((r) => r.number)).toEqual([soon.number, "BBL-2026-Y900"]);
    // The £240 link is above the new still to pay (£220) and was withdrawn by Record a payment.
    expect(mine[0]).toMatchObject({
      totalPence: 32000,
      paidPence: 10000,
      stillToPayPence: 22000,
      link: null,
    });
  });

  it("LINK SENT: the latest open link, and how many more", async () => {
    const o = await order();
    await sendPayLink(
      db(),
      { orderId: o.id, purpose: "deposit", amount: "50", by: "Linda" },
      londonInstant("2026-09-01", 9),
    );
    await sendPayLink(
      db(),
      { orderId: o.id, purpose: "deposit", amount: "60", by: "Linda" },
      londonInstant("2026-09-03", 9),
    );
    const r = (await moneyScreen(db(), now)).rows.find((x) => x.id === o.id)!;
    expect(r.link).toEqual({ sentOn: "2026-09-03", pence: 6000, more: 1 });
    await db().delete(orders).where(eq(orders.id, o.id));
  });
});
