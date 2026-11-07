import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { londonInstant } from "@/lib/london-time";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { anniversaryDates, runDueJobs } from "./jobs-repo";
import { emailHash, recordConsent } from "./consent-repo";
import { updateMailSettings } from "./mail-settings-repo";
import {
  consentEvents,
  jobRuns,
  mailAddresses,
  mailSends,
  mailSettings,
  orderLines,
  orders,
} from "./schema";
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
    email?: string;
    optIn?: boolean;
    kind?: string;
    status?: string;
    handedOverAt?: Date;
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
        email: o.email ?? `c${seq}@example.com`,
        marketingOptIn: o.optIn ?? false,
        kind: o.kind ?? "catalogue",
        status: o.status ?? "confirmed",
        handedOverAt: o.handedOverAt ?? null,
        phone: "07700 900 000",
        consents: {},
        totalPence: 18500,
        amountReceivedPence: 18500,
        snapshot: {},
        confirmedAt: o.confirmedAt ?? new Date("2026-09-01T10:00:00Z"),
      })
      .returning({ id: orders.id });
    await db().insert(orderLines).values({
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
    await db().delete(consentEvents);
    await db().delete(mailAddresses);
    await db().delete(mailSettings);
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
      "year-later": 0,
      "thank-you": 0,
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

  it("3 / 3b / 4 switched off: nothing goes, and nothing goes late when switched back on", async () => {
    await updateMailSettings(db(), { onTheDay: false, dailyList: false });
    await order({ date: day });
    await runDueJobs(db(), londonInstant(day, 7, 30));
    await updateMailSettings(db(), { onTheDay: true, dailyList: true });
    await runDueJobs(db(), londonInstant(day, 9));
    expect(await keys()).toEqual([]);
  });

  describe("e-mail 5 at 10:00", () => {
    const today = "2027-09-12";
    beforeEach(async () => {
      await updateMailSettings(db(), { yearLater: false });
      await updateMailSettings(
        db(),
        { yearLater: true },
        new Date("2027-01-01T00:00:00Z"),
      );
    });
    it("a ticked catalogue order a year ago, on the broadcast stream; never manual, never unticked, never cancelled", async () => {
      await order({ date: "2026-09-12", optIn: true });
      await order({ date: "2026-09-12", optIn: false });
      await order({ date: "2026-09-12", optIn: true, kind: "manual" });
      await order({ date: "2026-09-12", optIn: true, status: "cancelled" });
      expect(
        await runDueJobs(db(), londonInstant(today, 9, 59)),
      ).not.toHaveProperty("year-later");
      await runDueJobs(db(), londonInstant(today, 10));
      const rows = await db().select().from(mailSends);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        template: "year-later",
        stream: "broadcast",
        key: expect.stringMatching(/:5:2027$/),
      });
      expect(rows[0].data).toMatchObject({ late: false });
    });
    it("an unsubscribe after the tick stops it; a newer tick at a later order lifts it", async () => {
      await order({
        date: "2026-09-12",
        optIn: true,
        email: "a@example.com",
        confirmedAt: new Date("2026-09-01T10:00:00Z"),
      });
      await recordConsent(
        db(),
        emailHash("A@example.com "),
        "yearly",
        "out",
        "unsubscribe",
        "Stop these emails",
        new Date("2027-01-02T00:00:00Z"),
      );
      await runDueJobs(db(), londonInstant(today, 10));
      expect(await db().select().from(mailSends)).toHaveLength(0);
      await db().delete(jobRuns);
      await order({
        date: "2027-03-01",
        optIn: true,
        email: "a@example.com",
        confirmedAt: new Date("2027-02-20T10:00:00Z"),
      });
      await runDueJobs(db(), londonInstant(today, 10));
      expect(await db().select().from(mailSends)).toHaveLength(1);
    });
    it("one per address: the newest order of the day; none again within 30 days", async () => {
      const older = await order({
        date: "2026-09-12",
        optIn: true,
        email: "b@example.com",
        confirmedAt: new Date("2026-08-01T10:00:00Z"),
      });
      const newer = await order({
        date: "2026-09-12",
        optIn: true,
        email: "b@example.com",
        confirmedAt: new Date("2026-08-05T10:00:00Z"),
      });
      await order({ date: "2026-09-20", optIn: true, email: "b@example.com" });
      await runDueJobs(db(), londonInstant(today, 10));
      await runDueJobs(db(), londonInstant("2027-09-20", 10));
      const rows = await db().select().from(mailSends);
      expect(rows).toHaveLength(1);
      expect(rows[0].data).toMatchObject({ orderId: newer });
      expect(older).not.toBe(newer);
    });
    it("a missed day is caught up within 7 days (“late”); not for days while it was switched off", async () => {
      await order({ date: "2026-09-08", optIn: true });
      await runDueJobs(db(), londonInstant(today, 10));
      const [row] = await db().select().from(mailSends);
      expect(row.data).toMatchObject({ late: true });
      await db().delete(mailSends);
      await db().delete(jobRuns);
      await updateMailSettings(db(), { yearLater: false });
      await updateMailSettings(
        db(),
        { yearLater: true },
        londonInstant(today, 9),
      );
      await runDueJobs(db(), londonInstant(today, 10));
      expect(await db().select().from(mailSends)).toHaveLength(0);
    });
    it("29 February is remembered on 28 February", () => {
      expect(anniversaryDates("2029-02-28")).toEqual([
        "2028-02-28",
        "2028-02-29",
      ]);
      expect(anniversaryDates("2028-02-29")).toEqual([]);
      expect(anniversaryDates("2027-03-01")).toEqual(["2026-03-01"]);
    });
  });

  describe("e-mail 18 at 10:00", () => {
    it("needs a Place ID; the day after Mark handed over, else two days after the date; not cancelled; not opted out", async () => {
      await order({ date: "2026-09-08" });
      await order({
        date: "2026-09-09",
        handedOverAt: londonInstant("2026-09-09", 15),
      });
      await order({ date: "2026-09-08", status: "refunded" });
      await order({ date: "2026-09-08", email: "no@example.com" });
      await recordConsent(
        db(),
        emailHash("no@example.com"),
        "thanks",
        "out",
        "unsubscribe",
        "No more thank-you e-mails",
      );
      await runDueJobs(db(), londonInstant(day, 10, 30));
      expect(await keys()).toEqual([]);
      await db().delete(jobRuns);
      await updateMailSettings(db(), { googlePlaceId: "ChIJtest" });
      await runDueJobs(db(), londonInstant(day, 10, 30));
      expect(await keys()).toEqual(["thank-you", "thank-you"]);
    });
  });
});
