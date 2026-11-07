// The status page (§6.2, §6.3; states 1036:9106): which state shows — the first match wins — and its words.
// Nobody was in and After a missed delivery come with 6.5 (delivery attempts).
import type { cancelledCopy } from "./cancel-copy";
import { WINDOWS } from "./handover";
import { addDays, formatLongDate, type CalendarDate } from "./london-time";

export type StatusState = "E" | "C" | "B2" | "B" | "A";

/**
 * E cancelled or refunded → C completed or the date has passed → B2 the date is today → B the change window has
 * closed (from 00:00 on D-1) → A booked.
 */
export function statusState(
  o: { status: string; date: CalendarDate },
  today: CalendarDate,
): StatusState {
  if (o.status === "cancelled" || o.status === "refunded") return "E";
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
