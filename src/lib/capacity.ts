// Capacity and the step-2 calendar (SITE-FLOWS §10.4, §5.2, Decided D1). Pure: the server counts, this decides.
import {
  addDays,
  daysBetween,
  weekStart,
  weekdayIndex,
  type CalendarDate,
} from "./london-time";
import { leadTimeWords } from "./words";

export type DayState = "selected" | "past" | "too-soon" | "full" | "available";

export type CapacityInput = {
  today: CalendarDate;
  leadTimeDays: number;
  dailyCap: number;
  weeklyCap: number;
  closed: ReadonlySet<CalendarDate>;
  /** Cakes on each day: confirmed and completed orders' cakes plus other customers' live holds (§10.4 What counts). */
  dayCounts: ReadonlyMap<CalendarDate, number>;
  /** The customer's own live hold: it never blocks them and shows as Selected above every other state (§10.3). */
  ownHold: CalendarDate | null;
};

/** Cakes in the Monday–Sunday week of `date`. */
export function weekCount(
  date: CalendarDate,
  counts: ReadonlyMap<CalendarDate, number>,
): number {
  const start = weekStart(date);
  let n = 0;
  for (let i = 0; i < 7; i++) n += counts.get(addDays(start, i)) ?? 0;
  return n;
}

/**
 * One day's state (§5.2 Day states): own hold → Selected; else past or too soon (today + lead time) → TooSoon;
 * else closed, no free slot that day, or no free slot in its week → fully booked; else available.
 */
export function dayState(date: CalendarDate, c: CapacityInput): DayState {
  if (c.ownHold === date) return "selected";
  if (daysBetween(c.today, date) < 0) return "past";
  if (daysBetween(c.today, date) < c.leadTimeDays) return "too-soon";
  if (c.closed.has(date)) return "full";
  if ((c.dayCounts.get(date) ?? 0) >= c.dailyCap) return "full";
  if (weekCount(date, c.dayCounts) >= c.weeklyCap) return "full";
  return "available";
}

/** A date can be held now: available (or already the customer's own hold, §10.3 “your own hold never blocks you”). */
export function canHold(date: CalendarDate, c: CapacityInput): boolean {
  const s = dayState(date, c);
  return s === "available" || s === "selected";
}

export type Month = { year: number; month: number };

/** The current month and the 12 following (§5.2 Calendar). */
export function calendarMonths(today: CalendarDate): Month[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: 13 }, (_, i) => {
    const k = m - 1 + i;
    return { year: y + Math.floor(k / 12), month: (k % 12) + 1 };
  });
}

const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (m: Month) => `${m.year}-${pad(m.month)}`;

/** The days of a month with their weekday column (Monday first) — `lead` empty cells before the 1st. */
export function monthDays(m: Month): { lead: number; days: CalendarDate[] } {
  const first = `${m.year}-${pad(m.month)}-01`;
  const days: CalendarDate[] = [];
  for (
    let d = first;
    d.startsWith(`${m.year}-${pad(m.month)}`);
    d = addDays(d, 1)
  )
    days.push(d);
  return { lead: weekdayIndex(first), days };
}

/** The first month with a day available for this order (§5.2: the calendar opens there); null if none. */
export function firstOpenMonth(c: CapacityInput): Month | null {
  for (const m of calendarMonths(c.today))
    if (monthDays(m).days.some((d) => canHold(d, c))) return m;
  return null;
}

/** Up to three nearest available dates either side of `date`, never before the earliest date (§5.2 B). */
export function nearestDates(
  date: CalendarDate,
  c: CapacityInput,
  max = 3,
): CalendarDate[] {
  const found: CalendarDate[] = [];
  const last = addDays(c.today, 400);
  for (let i = 1; found.length < max && i < 400; i++) {
    for (const d of [addDays(date, -i), addDays(date, i)]) {
      if (found.length >= max) break;
      if (daysBetween(d, last) < 0) continue;
      if (dayState(d, { ...c, ownHold: null }) === "available") found.push(d);
    }
  }
  return found.sort();
}

/** “Greyed-out days are too soon (I need five days’ notice), already full, or closed.” (§5.2 caption). */
export function calendarCaption(leadTimeDays: number): string {
  return `Greyed-out days are too soon (I need ${leadTimeWords(leadTimeDays)}’ notice), already full, or closed.`;
}

/** A day button's name (§5.2): “Saturday 12 September, available / fully booked / too soon / selected”. */
export const STATE_WORDS: Record<DayState, string> = {
  selected: "selected",
  past: "too soon",
  "too-soon": "too soon",
  full: "fully booked",
  available: "available",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const monthLabel = (m: Month) => `${MONTH_NAMES[m.month - 1]} ${m.year}`;

export type CalendarDay = { date: CalendarDate; n: number; state: DayState };
export type CalendarMonth = {
  key: string;
  label: string;
  lead: number;
  days: CalendarDay[];
  open: boolean;
};

/** The thirteen months with every day's state (§5.2), and the month the calendar opens on. */
export function buildCalendar(c: CapacityInput): {
  months: CalendarMonth[];
  start: number;
} {
  const months = calendarMonths(c.today).map((m) => {
    const { lead, days } = monthDays(m);
    const list = days.map((date) => ({
      date,
      n: Number(date.slice(8)),
      state: dayState(date, c),
    }));
    return {
      key: monthKey(m),
      label: monthLabel(m),
      lead,
      days: list,
      open: list.some((d) => d.state === "available" || d.state === "selected"),
    };
  });
  const own = c.ownHold
    ? months.findIndex((m) => c.ownHold!.startsWith(m.key))
    : -1;
  const first = months.findIndex((m) => m.open);
  return { months, start: own >= 0 ? own : Math.max(0, first) };
}
