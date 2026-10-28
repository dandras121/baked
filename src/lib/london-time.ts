// Every date, deadline and “today” uses Europe/London (SITE-FLOWS §10.1). Calendar dates are “YYYY-MM-DD” strings:
// the deadlines count calendar days, so clock changes never shift them.
export const TIME_ZONE = "Europe/London";

export type CalendarDate = string; // YYYY-MM-DD

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: CalendarDate): [number, number, number] {
  const m = DATE.exec(date);
  if (!m) throw new Error(`Not a calendar date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function fromUtcDay(ms: number): CalendarDate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const dayMs = (date: CalendarDate) => {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
};

/** The calendar date in London at an instant. */
export function londonDate(instant: Date): CalendarDate {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(instant);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcDay(dayMs(date) + days * 86_400_000);
}

/** Whole calendar days from `from` to `to` (to − from). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((dayMs(to) - dayMs(from)) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday (the week runs Monday to Sunday, §10.1). */
export function weekdayIndex(date: CalendarDate): number {
  return (new Date(dayMs(date)).getUTCDay() + 6) % 7;
}

export function weekStart(date: CalendarDate): CalendarDate {
  return addDays(date, -weekdayIndex(date));
}

/** London's offset from UTC in minutes at an instant (60 in summer time, 0 in winter). */
export function londonOffsetMinutes(instant: Date): number {
  const name = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((p) => p.type === "timeZoneName")!.value; // “GMT” or “GMT+01:00”
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

/** The instant of a London wall-clock time on a calendar date. */
export function londonInstant(
  date: CalendarDate,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Date {
  const [y, m, d] = parts(date);
  const wall = Date.UTC(y, m - 1, d, hours, minutes, seconds, ms);
  let guess = wall - londonOffsetMinutes(new Date(wall)) * 60_000;
  guess = wall - londonOffsetMinutes(new Date(guess)) * 60_000;
  return new Date(guess);
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const MONTHS = [
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

/** Customer date (§10.7): “Saturday 12 September”, the year added when it is not the current year. */
export function formatLongDate(
  date: CalendarDate,
  today: CalendarDate,
): string {
  const [y, m, d] = parts(date);
  const base = `${WEEKDAYS[weekdayIndex(date)]} ${d} ${MONTHS[m - 1]}`;
  return y === parts(today)[0] ? base : `${base} ${y}`;
}

/** Short date for chips (§10.7): “Sat 12 Sep”. */
export function formatShortDate(date: CalendarDate): string {
  const [, m, d] = parts(date);
  return `${WEEKDAYS[weekdayIndex(date)].slice(0, 3)} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

/** Customer times (§10.7): 12-hour, “3:42pm”, “9am”, “12pm”. */
export function formatClockTime(hours: number, minutes = 0): string {
  const suffix = hours < 12 ? "am" : "pm";
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${h}${suffix}` : `${h}:${pad(minutes)}${suffix}`;
}

/** Admin logs (§10.7): 24-hour times, London. */
export function formatAdminTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}
