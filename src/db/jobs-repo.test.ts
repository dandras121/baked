import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { runDueJobs } from "./jobs-repo";
import { jobRuns, mailSends, orderLines, orders } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const day = "2026-09-10"; // Thursday: D-2 of Saturday 12 September

describe.skipIf(!url)("database: the morning jobs (§12, §8.1 rows 2–4)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let seq = 0;
  async function order(o: {
    date: string;
    handover?: string;
    window?: string | null;
    confirmedAt?: Date;
  }) {
    seq++;
    const [r] = await db()
      .insert(orders)
      .values({
        number: `BBL-2026-9${String(seq).padStart(3, "0")}`,
        token: `tok-${seq}-${Math.random()}`,
        date: o.date,
        earliestDate: o.date,
        handover: o.handover ?? "delivery",
        deliveryWindow:
          o.handover === "collection" ? null : (o.window ?? "morning"),
        address: "48 Preston Road",
        customerName: `Customer ${seq}`,
        email: `c${seq}@example.com`,
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: o.confirmedAt ?? new Date("2026-09-01T10:00:00Z"),
      })
      .returning({ id: orders.id });
    await db()
      .insert(orderLines)
      .values({
        orderId: r.id,
        position: 1,
        slug: "the-lothian",
        name: "The Lothian",
        sizeLine: "Two tiers · serves 24",
        pricePence: 18500,
        allergenText: "Contains eggs.",
        allergenKeys: [],
      });
    return r.id;
  }
  const keys = async () =>
    (
      await db()
        .select({ k: mailSends.key, t: mailSends.template })
        .from(mailSends)
    )
      .map((r) => `${r.t}`)
      .sort();

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(mailSends);
    await db().delete(jobRuns);
    await db().delete(orders);
  });
  afterAll(async () => {
    await db().delete(mailSends);
    await db().delete(jobRuns);
    await db().delete(orders);
    await conn?.close();
  });

  it("before 06:00 nothing; at 07:30 the daily list and on-the-day e-mails; 2 waits for 08:00", async () => {
    await order({ date: day });
    await order({ date: day, handover: "collection" });
    await order({ date: "2026-09-12" });
    expect(await runDueJobs(db(), londonInstant(day, 5, 59))).toEqual({});
    await runDueJobs(db(), londonInstant(day, 7, 30));
    expect(await keys()).toEqual([
      "collection-day",
      "daily-list",
      "on-the-day",
    ]);
    await runDueJobs(db(), londonInstant(day, 8, 0));
    expect(await keys()).toEqual([
      "collection-day",
      "daily-list",
      "on-the-day",
      "two-days-before",
    ]);
  });

  it("each job once a day; a missed morning is caught up later the same day", async () => {
    await order({ date: day });
    await order({ date: "2026-09-12" });
    expect(await runDueJobs(db(), londonInstant(day, 10))).toEqual({
      "daily-list": 1,
      "on-the-day": 1,
      "two-days-before": 1,
    });
    expect(await runDueJobs(db(), londonInstant(day, 10, 15))).toEqual({});
    expect(await db().select().from(mailSends)).toHaveLength(3);
  });

  it("2 is not sent for an order confirmed after 08:00 on D-2; 3 is due before its window starts", async () => {
    await order({ date: "2026-09-12", confirmedAt: londonInstant(day, 9) });
    await order({ date: day, window: "afternoon" });
    await runDueJobs(db(), londonInstant(day, 9, 30));
    expect(await keys()).toEqual(["daily-list", "on-the-day"]);
    const [three] = await db()
      .select()
      .from(mailSends)
      .where(
        (await import("drizzle-orm")).eq(mailSends.template, "on-the-day"),
      );
    expect(three.deadline).toEqual(londonInstant(day, 12));
  });

  it("no daily list on a day with nothing to do", async () => {
    await order({ date: "2026-09-20" });
    await runDueJobs(db(), londonInstant(day, 7));
    expect(await keys()).toEqual([]);
  });
});
