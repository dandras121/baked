// The cancel page's words (§6.6, 1037:9182) and the E state's refund line (§6.3), worked out from the quote and the
// cancellation record. Every date and amount is generated; nothing is typed copy.
import { RULES } from "./constants";
import type { RefundTier } from "./deadlines";
import { daysBetween, formatLongDate, type CalendarDate } from "./london-time";
import { formatPrice } from "./money";
import { numberInWords } from "./words";

export type CancelQuote = {
  tier: Exclude<RefundTier, "none">;
  refundPence: number;
  /** What counts for a refund (§10.6): net paid, every refund already made taken off. */
  basisPence: number;
  /** The tier counts from an earlier date than the order's current one (§10.1). */
  earliestDiffers: boolean;
  date: CalendarDate;
  earliest: CalendarDate;
  /** Each card payment: the checkout, then paid changes. */
  payments: { pence: number; on: CalendarDate }[];
  /** Every refund already made that has not failed. */
  refundsMade: { pence: number; on: CalendarDate }[];
};

const days = (n: number) =>
  n === 1 ? "tomorrow" : `${n <= 99 ? numberInWords(n) : n} days away`;

/** “12 September” / “31 Aug” — day and month only. */
const dayMonth = (d: CalendarDate, today: CalendarDate, short = false) => {
  const s = formatLongDate(d, today).replace(/^\w+ /, "");
  return short ? s.replace(/(\d+ \w{3})\w*/, "$1") : s;
};

export function cancelCopy(q: CancelQuote, today: CalendarDate) {
  const due =
    q.tier === "full"
      ? `the full ${formatPrice(q.refundPence)} back`
      : `half — ${formatPrice(q.refundPence)} back`;
  const n = daysBetween(today, q.date);
  const lead = q.earliestDiffers
    ? `${formatLongDate(q.date, today)} is ${days(n)}, but your refund counts from ${formatLongDate(q.earliest, today)}, the earliest date your order has had, so you are due ${due}.`
    : `${formatLongDate(q.date, today)} is ${days(n)}, so you are due ${due}.`;
  const total = q.payments.reduce((s, p) => s + p.pence, 0);
  const paid =
    q.payments.length === 0
      ? "Nothing was paid by card."
      : q.payments.length === 1
        ? `You paid ${formatPrice(total)} on ${dayMonth(q.payments[0].on, today)}.`
        : `You paid ${formatPrice(total)} in total — ${q.payments
            .map(
              (p) =>
                `${formatPrice(p.pence)} on ${dayMonth(p.on, today, true)}`,
            )
            .join(", ")}.`;
  const made = q.refundsMade.map(
    (r) =>
      `${formatPrice(r.pence)} back to your card on ${dayMonth(r.on, today, true)}.`,
  );
  return {
    lead,
    paid,
    made,
    /** Only when the refund is not worked out from a single payment as it stands. */
    basis:
      made.length || q.payments.length > 1
        ? `Your refund is worked out from ${formatPrice(q.basisPence)}.`
        : null,
    /** The line when the amount changed between showing and pressing (§6.6). */
    changed:
      q.tier === "half"
        ? `It is now inside seven days, so the refund is ${formatPrice(q.refundPence)}. Cancel anyway?`
        : `The refund is now ${formatPrice(q.refundPence)}. Cancel anyway?`,
    ladder: `More than ${numberInWords(RULES.fullRefundDaysBefore)} days ahead: the full price. Inside ${numberInWords(RULES.fullRefundDaysBefore)} days: half, because the ingredients are already bought. On the day itself: no refund. None of this affects your statutory rights.`,
  };
}

/** What the E state shows from the kept cancellation (CancelledView) and the refunds' progress (§6.3 E). */
export function cancelledCopy(
  c: {
    tier: "full" | "half" | "own" | "none";
    cardPence: number;
    handPence: number;
    earliestDiffers: boolean;
    cancelledOn: CalendarDate;
    byLinda: boolean;
  },
  progress: "pending" | "done" | "failed" | "none",
  doneOn: CalendarDate | null,
  today: CalendarDate,
) {
  const on = dayMonth(c.cancelledOn, today);
  const total = c.cardPence + c.handPence;
  let boxTitle: string;
  if (total === 0)
    boxTitle =
      c.tier === "own"
        ? "No refund is due"
        : "No refund — the cancellation was on or after your date";
  else if (c.handPence > 0 && c.cardPence === 0)
    boxTitle = `I will return ${formatPrice(c.handPence)} the way you paid`;
  else if (c.tier === "half")
    boxTitle = `${formatPrice(c.cardPence)} back to your card — half, as the cancellation was inside seven days${c.earliestDiffers ? " of the earliest date your order has had" : ""}`;
  else boxTitle = `${formatPrice(c.cardPence)} back to your card`;
  const refund = total > 0;
  const who = c.byLinda ? "This order was cancelled" : "You cancelled";
  return {
    intro: !refund
      ? `${who} on ${on}.`
      : progress === "done"
        ? !doneOn || doneOn === c.cancelledOn
          ? `${who} on ${on}, and the refund went back the same day.`
          : `${who} on ${on}, and the refund went back on ${dayMonth(doneOn, today)}.`
        : `${who} on ${on}, and the refund is on its way.`,
    eyebrow: !refund
      ? "No refund"
      : progress === "done"
        ? "Refunded"
        : "Refund on its way",
    boxTitle,
    boxText: !refund
      ? null
      : [
          c.cardPence > 0
            ? "It goes to the card you paid with. Most banks show it within 5–10 working days."
            : "",
          progress === "failed"
            ? "I am sorting this — nothing for you to do."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
    tick: refund && progress === "done",
  };
}
