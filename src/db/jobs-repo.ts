// The daily jobs (§12, Europe/London): 06:00 e-mail 4, 07:00 e-mails 3 / 3b, 08:00 e-mail 2. Each runs once per day
// (job + date), is marked done only when it has completed, and a later tick runs a missed one, still within the
// e-mails' deadlines (§8.4 Late jobs). The never-twice keys make a re-run or a second worker harmless.
import { and, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { deleteStaleUploads } from "./upload-repo";
import {
  addDays,
  londonDate,
  londonInstant,
  type CalendarDate,
} from "@/lib/london-time";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import {
  emailHash,
  normalEmail,
  thanksAllowed,
  yearlyOptedIn,
} from "./consent-repo";
import { readMailSettings, reviewLink } from "./mail-settings-repo";
import { todayRows } from "./order-mail-repo";
import { jobRuns, mailSends, orders } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

/** Window start hours for e-mail 3's deadline (“until the window starts”). */
const WINDOW_START: Record<string, number> = {
  morning: 9,
  afternoon: 12,
  evening: 16,
};

type Job = {
  name: string;
  hour: number;
  run: (db: Db, day: CalendarDate, now: Date) => Promise<number>;
};

/** 08:00 · e-mail 2 for orders whose D-2 is today and that were confirmed before 08:00 today. */
async function twoDaysBefore(db: Db, day: CalendarDate, now: Date) {
  const at = londonInstant(day, 8);
  const rows = await db
    .select({ id: orders.id, email: orders.email, date: orders.date })
    .from(orders)
    .where(
      and(
        eq(orders.status, "confirmed"),
        eq(orders.date, addDays(day, 2)),
        lt(orders.confirmedAt, at),
      ),
    );
  let n = 0;
  for (const o of rows)
    if (
      o.email &&
      (await queueMail(
        db,
        {
          key: `order:${o.id}:2:${String(o.date)}`,
          template: "two-days-before",
          data: { orderId: o.id },
          to: o.email,
          deadline: londonInstant(day, 23, 59, 59),
        },
        now,
      )) === "queued"
    )
      n++;
  return n;
}

/** 07:00 · e-mail 3 (delivery, until the window starts) or 3b (collection, until 12:00) for today's orders. */
async function onTheDay(db: Db, day: CalendarDate, now: Date) {
  const at = londonInstant(day, 7);
  const rows = await db
    .select({
      id: orders.id,
      email: orders.email,
      handover: orders.handover,
      window: orders.deliveryWindow,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "confirmed"),
        eq(orders.date, day),
        lt(orders.confirmedAt, at),
      ),
    );
  const sw = await readMailSettings(db);
  let n = 0;
  for (const o of rows) {
    const delivery = o.handover === "delivery";
    // Switched off on the Emails screen (§11.5): nothing goes, and nothing goes late when it is switched back on.
    if (delivery ? !sw.onTheDay : !sw.collectionDay) continue;
    const deadline = londonInstant(
      day,
      delivery ? (WINDOW_START[o.window ?? ""] ?? 12) : 12,
    );
    if (
      o.email &&
      (await queueMail(
        db,
        {
          key: `order:${o.id}:${delivery ? "3" : "3b"}:${day}`,
          template: delivery ? "on-the-day" : "collection-day",
          data: { orderId: o.id },
          to: o.email,
          deadline,
        },
        now,
      )) === "queued"
    )
      n++;
  }
  return n;
}

/** 06:00 · e-mail 4 to the team when Today has any row (until 12:00). The team is Linda until the admin's Team (8.x). */
async function dailyList(db: Db, day: CalendarDate, now: Date) {
  if (!(await readMailSettings(db)).dailyList) return 0;
  const rows = await todayRows(db, day);
  if (!rows.handovers.length && !rows.notCollected.length) return 0;
  const team = [(await readSettings(db)).email];
  let n = 0;
  for (const to of team)
    if (
      (await queueMail(
        db,
        {
          key: `daily:${to}:${day}`,
          template: "daily-list",
          data: { day },
          to,
          deadline: londonInstant(day, 12),
        },
        now,
      )) === "queued"
    )
      n++;
  return n;
}

/** The order dates whose anniversary is `day`: a year earlier; on 28 February also a leap year's 29 February. */
export function anniversaryDates(day: CalendarDate): CalendarDate[] {
  const [y, m, d] = day.split("-").map(Number);
  const prev = `${y - 1}-${day.slice(5)}`;
  const leap = (n: number) => (n % 4 === 0 && n % 100 !== 0) || n % 400 === 0;
  const out = m === 2 && d === 29 ? [] : [prev];
  if (m === 2 && d === 28 && leap(y - 1)) out.push(`${y - 1}-02-29`);
  return out;
}

/**
 * 10:00 · e-mail 5 (§8.1, §12): catalogue orders, confirmed or completed, whose anniversary is today or one of the 6
 * days before that has no key yet (days while the switch was off are skipped); only for an address opted in; at
 * most one per address in any 30 days; several on one day → the newest order. On the broadcast stream.
 */
async function yearLater(db: Db, day: CalendarDate, now: Date) {
  const sw = await readMailSettings(db);
  if (!sw.yearLater) return 0;
  const since = londonDate(sw.yearLaterSince);
  let n = 0;
  for (let k = 0; k < 7; k++) {
    const anniversary = addDays(day, -k);
    if (anniversary < since) break;
    const dates = anniversaryDates(anniversary);
    if (!dates.length) continue;
    const rows = await db
      .select({
        id: orders.id,
        email: orders.email,
        confirmedAt: orders.confirmedAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.kind, "catalogue"),
          inArray(orders.status, ["confirmed", "completed"]),
          inArray(orders.date, dates),
        ),
      )
      .orderBy(desc(orders.confirmedAt));
    const seen = new Set<string>();
    for (const o of rows) {
      const to = normalEmail(o.email);
      if (!to || seen.has(to)) continue;
      seen.add(to);
      if (!(await yearlyOptedIn(db, emailHash(to)))) continue;
      const [recent] = await db
        .select({ id: mailSends.id })
        .from(mailSends)
        .where(
          and(
            eq(mailSends.template, "year-later"),
            sql`lower(${mailSends.to}) = ${to}`,
            gte(mailSends.createdAt, new Date(now.getTime() - 30 * 86_400_000)),
            sql`${mailSends.status} not in ('failed', 'failed-too-late')`,
          ),
        )
        .limit(1);
      if (recent) continue;
      if (
        (await queueMail(
          db,
          {
            key: `order:${o.id}:5:${anniversary.slice(0, 4)}`,
            template: "year-later",
            data: { orderId: o.id, late: k > 0 },
            to: o.email,
            stream: "broadcast",
            deadline: new Date(
              londonInstant(anniversary, 10).getTime() + 7 * 86_400_000,
            ),
          },
          now,
        )) === "queued"
      )
        n++;
    }
  }
  return n;
}

/**
 * 10:00 · e-mail 18 (§8.1): the day after Mark handed over, or two days after the date when nobody marked it.
 * Not for a cancelled or refunded order, not without a Place ID, not after No more thank-you e-mails; once per order.
 */
async function thankYou(db: Db, day: CalendarDate, now: Date) {
  const sw = await readMailSettings(db);
  if (!sw.thankYou || !reviewLink(sw.googlePlaceId)) return 0;
  const yesterday = addDays(day, -1);
  const rows = await db
    .select({ id: orders.id, email: orders.email })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["confirmed", "completed"]),
        or(
          and(isNull(orders.handedOverAt), eq(orders.date, addDays(day, -2))),
          and(
            gte(orders.handedOverAt, londonInstant(yesterday, 0)),
            lt(orders.handedOverAt, londonInstant(day, 0)),
          ),
        ),
      ),
    );
  let n = 0;
  for (const o of rows) {
    if (!o.email || !(await thanksAllowed(db, emailHash(o.email)))) continue;
    if (
      (await queueMail(
        db,
        {
          key: `order:${o.id}:18`,
          template: "thank-you",
          data: { orderId: o.id },
          to: o.email,
        },
        now,
      )) === "queued"
    )
      n++;
  }
  return n;
}

export const JOBS: Job[] = [
  {
    name: "stale-uploads",
    hour: 3,
    run: (db, _day, now) => deleteStaleUploads(db, now),
  },
  { name: "daily-list", hour: 6, run: dailyList },
  { name: "on-the-day", hour: 7, run: onTheDay },
  { name: "two-days-before", hour: 8, run: twoDaysBefore },
  { name: "year-later", hour: 10, run: yearLater },
  { name: "thank-you", hour: 10, run: thankYou },
];

/** Every job whose time has passed today and that has not completed today runs now (called every 15 minutes). */
export async function runDueJobs(
  db: Db,
  now = new Date(),
): Promise<Record<string, number>> {
  const day = londonDate(now);
  const done = new Set(
    (
      await db
        .select({ job: jobRuns.job })
        .from(jobRuns)
        .where(eq(jobRuns.day, day))
    ).map((r) => r.job),
  );
  const out: Record<string, number> = {};
  for (const job of JOBS) {
    if (
      done.has(job.name) ||
      now.getTime() < londonInstant(day, job.hour).getTime()
    )
      continue;
    out[job.name] = await job.run(db, day, now);
    await db
      .insert(jobRuns)
      .values({ job: job.name, day, doneAt: now })
      .onConflictDoNothing();
  }
  return out;
}
