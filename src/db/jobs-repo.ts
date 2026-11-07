// The daily jobs (§12, Europe/London): 06:00 e-mail 4, 07:00 e-mails 3 / 3b, 08:00 e-mail 2. Each runs once per day
// (job + date), is marked done only when it has completed, and a later tick runs a missed one, still within the
// e-mails' deadlines (§8.4 Late jobs). The never-twice keys make a re-run or a second worker harmless.
import { and, eq, lt } from "drizzle-orm";
import {
  addDays,
  londonDate,
  londonInstant,
  type CalendarDate,
} from "@/lib/london-time";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { todayRows } from "./order-mail-repo";
import { jobRuns, orders } from "./schema";
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
  let n = 0;
  for (const o of rows) {
    const delivery = o.handover === "delivery";
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

export const JOBS: Job[] = [
  { name: "daily-list", hour: 6, run: dailyList },
  { name: "on-the-day", hour: 7, run: onTheDay },
  { name: "two-days-before", hour: 8, run: twoDaysBefore },
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
