// Order confirmed (SITE-FLOWS §5.6): WHAT HAPPENS NEXT and the line under it, worked out from the order.
import { WINDOWS } from "./handover";
import {
  addDays,
  formatLongDate,
  londonInstant,
  type CalendarDate,
} from "./london-time";

export type NextRow = { label: string; text: string };

export const CONFIRMED_COPY = {
  rightNow: (email: string) =>
    `A confirmation is on its way to ${email}. If it is not there in ten minutes, check your spam folder.`,
  twoDaysBefore: "Two days before",
  /** §5.6: the drawn “I will email you nearer the time…” is replaced; no refund tier or date is named. */
  lastDay: (d2: string) => `${d2} is the last day to change or cancel online.`,
  delivery: (times: string) =>
    `Delivery between ${times.replace(" – ", " and ")}. I will text you that morning with a tighter window.`,
  collection: (address: string) =>
    `Collection from ${address}, at a time we agree. I will be in touch to arrange it.`,
  /** “Something not right?” — the phone from Settings; Appendix A replaces “Changes are free until 48 hours before.” */
  help: "Something not right? Reply to the confirmation email, or call",
  changeUntil: (d2: string) =>
    `You can change the size, message, date or window until 23:59 on ${d2}.`,
  keep: "Keep this. You can look your order up with it at any time, for 30 days after the date.",
};

/**
 * The rows: Right now · Two days before (left out when the order was confirmed after 08:00 on D-2, the day the
 * reminder goes) · the date with the handover. `changeUntil` is the D-2 date while online changes are still open
 * (until 23:59 on D-2), else null.
 */
export function whatHappensNext(o: {
  email: string;
  date: CalendarDate;
  today: CalendarDate;
  confirmedAt: Date;
  now: Date;
  handover: "delivery" | "collection";
  window: string | null;
  collectionAddress: string;
}): { rows: NextRow[]; changeUntil: string | null } {
  const d2 = addDays(o.date, -2);
  const d2Label = formatLongDate(d2, o.today);
  const rows: NextRow[] = [
    { label: "Right now", text: CONFIRMED_COPY.rightNow(o.email) },
  ];
  if (o.confirmedAt.getTime() < londonInstant(d2, 8).getTime())
    rows.push({
      label: CONFIRMED_COPY.twoDaysBefore,
      text: CONFIRMED_COPY.lastDay(d2Label),
    });
  const times = WINDOWS.find((w) => w.key === o.window)?.times;
  rows.push({
    label: formatLongDate(o.date, o.today),
    text:
      o.handover === "delivery" && times
        ? CONFIRMED_COPY.delivery(times)
        : CONFIRMED_COPY.collection(o.collectionAddress),
  });
  const open = o.now.getTime() < londonInstant(addDays(d2, 1), 0).getTime();
  return { rows, changeUntil: open ? d2Label : null };
}
