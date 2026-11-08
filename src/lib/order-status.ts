// The status page (§6.2, §6.3; states 1036:9106): which state shows — the first match wins — and its words.
import type { cancelledCopy } from "./cancel-copy";
import type { collectingCopy, nobodyCopy, redeliveryCopy } from "./delivery";
import { WINDOWS } from "./handover";
import { addDays, formatLongDate, type CalendarDate } from "./london-time";

export type StatusState = "E" | "NOBODY" | "MISSED" | "C" | "B2" | "B" | "A";

/** The order's latest delivery attempt, when one is recorded (§6.8). */
type LatestAttempt = {
  outcome: string;
  choice: string;
  collectDay: CalendarDate | null;
  /** 2+ = a booked redelivery, on `day`. */
  attempt?: number;
  day?: CalendarDate;
} | null;

/**
 * E cancelled or refunded → NOBODY nobody was in and no choice yet → MISSED a choice whose day has not passed → C completed or the date has passed → B2 the date is today → B the change window has
 * closed (from 00:00 on D-1) → A booked.
 */
export function statusState(
  o: { status: string; date: CalendarDate },
  today: CalendarDate,
  attempt: LatestAttempt = null,
): StatusState {
  if (o.status === "cancelled" || o.status === "refunded") return "E";
  if (attempt && o.status !== "completed") {
    if (attempt.outcome === "nobody-in" && attempt.choice === "none")
      return "NOBODY";
    if (
      attempt.choice === "collect" &&
      attempt.collectDay &&
      attempt.collectDay >= today
    )
      return "MISSED";
    // A booked redelivery, up to and on its day.
    if (
      (attempt.attempt ?? 1) > 1 &&
      attempt.outcome === "none" &&
      attempt.day &&
      attempt.day >= today
    )
      return "MISSED";
  }
  if (o.status === "completed" || o.date < today) return "C";
  if (o.date === today) return "B2";
  if (today >= addDays(o.date, -1)) return "B";
  return "A";
}

/** The last day to change or cancel online: D-2, until 23:59 (§10.1, §13). */
export const lastChangeDay = (date: CalendarDate) => addDays(date, -2);

type View = {
  state: StatusState;
  date: CalendarDate;
  today: CalendarDate;
  handover: "delivery" | "collection";
  window: string | null;
  manual: boolean;
  completed: boolean;
  /** “20 Church View, Winchburgh” (Settings). */
  collectAt: string;
  /** E: the words of the kept cancellation (§6.3 E). */
  cancelled?: ReturnType<typeof cancelledCopy> | null;
  /** NOBODY: the Nobody-was-in words (§6.8). */
  nobody?: ReturnType<typeof nobodyCopy> | null;
  /** MISSED: the collection the customer chose. */
  collecting?: ReturnType<typeof collectingCopy> | null;
  /** MISSED: the redelivery booked, and its day. */
  redelivery?:
    | (ReturnType<typeof redeliveryCopy> & { day: CalendarDate; times: string })
    | null;
};

const times = (w: string | null) => WINDOWS.find((x) => x.key === w)?.times;

/** Heading, line under it, the NEXT box and the line under the buttons (Design; Proposal where not drawn). */
export function statusCopy(v: View) {
  const long = formatLongDate(v.date, v.today);
  const t = times(v.window);
  const delivery = v.handover === "delivery";
  const when = delivery
    ? `${long}${t ? `, ${t}` : ""}`
    : `${long} — collection time to agree`;
  const bespoke =
    "Changes and cancellations for a bespoke cake go through me — send me a message.";
  switch (v.state) {
    case "A":
      return {
        title: "Your cake is booked",
        intro: "Everything below is what I have written down. Check it over.",
        eyebrow: "Next",
        nextTitle: when,
        nextText: delivery
          ? "I will be with you then. Nothing for you to do until the morning."
          : `I will have it boxed and ready at ${v.collectAt}.`,
        note: v.manual
          ? bespoke
          : `Changes are possible until ${formatLongDate(lastChangeDay(v.date), v.today)}. After that the cake is already being made.`,
      };
    case "B":
      return {
        title: "Your cake is booked",
        intro: "Everything below is what I have written down. Check it over.",
        eyebrow: "Next",
        nextTitle: when,
        nextText:
          "I am baking yours now. The details are fixed — message me if something urgent has changed.",
        note: v.manual
          ? bespoke
          : "The design is fixed now, but ring me if something urgent has changed.",
      };
    case "B2":
      return {
        title: "Today is the day",
        intro: delivery
          ? "It leaves my kitchen today. Everything below is what is coming."
          : "It is boxed and ready for you. Everything below is what is coming.",
        eyebrow: "Today",
        nextTitle: delivery
          ? `Today${t ? `, ${t}` : ""}`
          : "Today, at the time we agreed",
        nextText: delivery
          ? "It leaves my kitchen today. I will text you when I set off."
          : `It is boxed and ready for you at ${v.collectAt}.`,
        note: delivery
          ? "If nobody can be in, ring me now — I wait fifteen minutes before I bring it back."
          : null,
      };
    case "C":
      return {
        title: "That was your cake",
        intro: "I hope it was everything you wanted.",
        eyebrow:
          v.completed && v.date === v.today
            ? "Handed over"
            : "That date has passed",
        nextTitle: delivery ? `${long}${t ? `, ${t}` : ""}` : long,
        nextText: "Anything not right? Message me.",
        note: `Keep this link if you like — it works until ${formatLongDate(addDays(v.date, 30), v.today)}.`,
      };
    case "NOBODY":
      return {
        title: "Nobody was in",
        intro: v.nobody?.intro ?? "",
        eyebrow: "What now",
        nextTitle: "",
        nextText: null,
        note: null,
      };
    case "MISSED":
      // Redelivery: its NEXT box before the day, the B2 words on it (§6.3 After a missed delivery).
      if (v.redelivery)
        return v.redelivery.day === v.today
          ? {
              title: "Today is the day",
              intro:
                "It leaves my kitchen today. Everything below is what is coming.",
              eyebrow: "Today",
              nextTitle: `Today, ${v.redelivery.times}`,
              nextText:
                "It leaves my kitchen today. I will text you when I set off.",
              note: null,
            }
          : {
              title: "Your cake is coming again",
              intro: "Nobody was in, so I am bringing it back.",
              eyebrow: "Next",
              nextTitle: v.redelivery.nextTitle,
              nextText: v.redelivery.nextText,
              note: null,
            };
      return {
        title: "Your cake is waiting for you",
        intro: "Nobody was in, so you are collecting it instead.",
        eyebrow: "Next",
        nextTitle: v.collecting?.nextTitle ?? "",
        nextText: v.collecting?.nextText ?? null,
        note: null,
      };
    case "E":
      return {
        title: "This order was cancelled",
        intro: v.cancelled?.intro ?? "This order was cancelled.",
        eyebrow: v.cancelled?.eyebrow ?? "Cancelled",
        nextTitle: v.cancelled?.boxTitle ?? long,
        nextText: v.cancelled ? v.cancelled.boxText : null,
        note: "Your date is back in the calendar.",
      };
  }
}

/** The panel's date row: “Sat 12 September”, “Today, Sat 12 September” on the day. */
export function panelDate(date: CalendarDate, today: CalendarDate) {
  const long = formatLongDate(date, today).replace(
    /^(\w{3})\w*/,
    (_, d: string) => d,
  );
  return date === today ? `Today, ${long}` : long;
}
