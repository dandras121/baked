// E-mail 1's cancellation rights (§8.1 row 1, §10.1), worked out at confirmation from the earliest date the order
// has had (at confirmation: its date). Full refund until 23:59 on D-8 of the earliest date; changes and online
// cancelling until 23:59 on D-2 of the order's date.
import { addDays, formatLongDate, type CalendarDate } from "../london-time";

const REFUNDS_COUNT =
  "Refunds count from the earliest date your order has had, so moving your date later does not change them.";

export function rightsText(o: {
  date: CalendarDate;
  earliestDate: CalendarDate;
  /** The London calendar day of confirmation. */
  today: CalendarDate;
  manual?: boolean;
}): string {
  if (o.manual) return "To change anything, just reply to this e-mail.";
  const d2 = addDays(o.date, -2);
  const fullUntil = addDays(o.earliestDate, -8);
  const long = (d: CalendarDate) => formatLongDate(d, o.today);
  if (o.today > d2) return "Changes and cancellation go through me.";
  if (o.today <= fullUntil)
    return `Change or cancel online until 23:59 on ${long(d2)}. Cancel by ${long(fullUntil)} for a full refund, after that for half; after ${long(d2)} changes and cancellation go through me. ${REFUNDS_COUNT}`;
  return `Change online until 23:59 on ${long(d2)}. Cancelling online now gives a half refund, until 23:59 on ${long(d2)}. After that, changes and cancellation go through me. ${REFUNDS_COUNT}`;
}
