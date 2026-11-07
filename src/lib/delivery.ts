// Nobody was in (§6.8): when the choices are open, today or tomorrow for collecting, and the words of the status page
// and the delivery link. “Today” and “tomorrow” count from the day Nobody was in was recorded (Europe/London).
import {
  addDays,
  formatLongDate,
  londonDate,
  londonOffsetMinutes,
  type CalendarDate,
} from "./london-time";
import { formatPrice } from "./money";

/** From 18:00 London, collection moves to the next day before 12 noon (§6.8 Collect, §8.1 e-mail 13 late). */
export const LATE_HOUR = 18;

export const londonHour = (now: Date) =>
  new Date(now.getTime() + londonOffsetMinutes(now) * 60_000).getUTCHours();

export type Attempt = {
  attempt: number;
  outcome: string;
  choice: string;
  recordedOn: CalendarDate | null;
  collectDay: CalendarDate | null;
};

/**
 * choose: the choices are open (until 23:59 on the recorded day) · closed: no choice by then · collect / redeliver:
 * chosen (final).
 */
export function deliveryPhase(a: Attempt, now: Date) {
  if (a.choice === "collect" || a.choice === "redeliver") return a.choice;
  return a.recordedOn && londonDate(now) <= a.recordedOn ? "choose" : "closed";
}

/** Collecting, as offered right now: today before 6pm, or after 18:00 tomorrow before 12 noon. */
export function collectOffer(recordedOn: CalendarDate, now: Date) {
  const late = londonDate(now) > recordedOn || londonHour(now) >= LATE_HOUR;
  return late
    ? { day: addDays(recordedOn, 1), when: "tomorrow", by: "12 noon" }
    : { day: recordedOn, when: "today", by: "6pm" };
}

/** Redelivery is offered on a first attempt only, when the next day is open (§6.8). */
export const redeliveryOffered = (attempt: number, nextDayClosed: boolean) =>
  attempt === 1 && !nextDayClosed;

/** The status page's Nobody-was-in words (1102:9106) and the delivery link's WHAT NOW (1102:9131). */
export function nobodyCopy(v: {
  day: CalendarDate;
  today: CalendarDate;
  recordedOn: CalendarDate;
  now: Date;
  town: string;
  collectAt: string;
  feePence: number;
  offerRedelivery: boolean;
  phone: string;
}) {
  const c = collectOffer(v.recordedOn, v.now);
  const fee =
    v.feePence > 0 ? `for ${formatPrice(v.feePence)}` : "free of charge";
  const feeButton =
    v.feePence > 0 ? `— ${formatPrice(v.feePence)}` : "— free";
  return {
    intro: `I waited fifteen minutes on ${formatLongDate(v.day, v.today)}, then brought your cake back to ${v.town}.`,
    collectLine: `Collect it ${c.when} — free, any time before ${c.by}, from ${v.collectAt}.`,
    redeliverLine: v.offerRedelivery
      ? `Or I run it out again tomorrow ${fee}, at a time that suits you.`
      : null,
    // Only while today's collection is on offer: a cake is best on the day it was made.
    bestLine:
      c.when === "today"
        ? "A cake is always best on the day it was made, so today is the better of the two."
        : null,
    collectButton: `I will collect it ${c.when}`,
    redeliverButton: v.offerRedelivery ? `Try again tomorrow ${feeButton}` : null,
    neither: `Ring me on ${v.phone} if neither of those works and we will sort something out.`,
    closed: `These choices have closed. Ring me on ${v.phone} and we will sort it out.`,
    confirmCollect: `Collect it ${c.when} from ${v.collectAt}, before ${c.by}?`,
  };
}

/** G · Collecting it (1199:9305) and the status page's NEXT box after the choice (§6.3 After a missed delivery). */
export function collectingCopy(v: {
  collectDay: CalendarDate;
  recordedOn: CalendarDate;
  today: CalendarDate;
  collectAt: string;
}) {
  const sameDay = v.collectDay === v.recordedOn;
  const by = sameDay ? "6pm" : "12 noon";
  const when =
    v.collectDay === v.today
      ? "today"
      : v.collectDay === addDays(v.today, 1)
        ? "tomorrow"
        : `on ${formatLongDate(v.collectDay, v.today)}`;
  return {
    noticeTitle: `Collection ${when}, confirmed`,
    noticeText: `Your cake is waiting at ${v.collectAt}, any time before ${by} ${when}.`,
    ready: `Any time before ${by} ${when}`,
    nextTitle: `Collect it ${when} before ${by}`,
    nextText: `From ${v.collectAt}.`,
  };
}
