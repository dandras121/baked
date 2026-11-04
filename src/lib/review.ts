// Step 4 — Review & pay (SITE-FLOWS §5.4, §10.1, §11.8): the BEFORE YOU PAY lines and the handover line.
import { RULES } from "./constants";
import { isChangeWindowOpen, lastChangeDay, refundTier } from "./deadlines";
import { WINDOWS } from "./handover";
import { formatLongDate, type CalendarDate } from "./london-time";
import { formatPrice } from "./money";
import { listInWords } from "./placeholders";

const WORDS: Record<number, string> = { 2: "two", 7: "seven" };
const word = (n: number) => WORDS[n] ?? String(n);

/**
 * The BEFORE YOU PAY box (641:3471, §5.4), worked out when step 4 loads (London). The tiers show as drawn while a
 * full refund is still possible; otherwise the half-refund line with its last day; once the change window has
 * closed, both are replaced by “Changes and cancellation go through me.” No line names a date that has passed.
 * The kitchen sentence comes last, once, and only when the list is not empty.
 */
export function beforeYouPay(o: {
  /** The earliest date the order has had (at checkout: the chosen date) and its current date. */
  earliest: CalendarDate;
  date: CalendarDate;
  today: CalendarDate;
  /** Settings → the kitchen also handles, minus the allergens of every cake in the order, as words. */
  kitchenOthers: string[];
}): string[] {
  const lines = [
    `This cake is made to your specification, so the ${RULES.cancellationRightsExclusionDays}-day right to cancel under the Consumer Contracts Regulations 2013 does not apply once I start work.`,
  ];
  const tier = refundTier(o.earliest, o.date, o.today);
  if (!isChangeWindowOpen(o.date, o.today)) {
    lines.push("Changes and cancellation go through me.");
  } else {
    lines.push(
      tier === "full"
        ? `Cancel more than ${word(RULES.fullRefundDaysBefore)} days before your date and I refund in full. Inside ${word(RULES.fullRefundDaysBefore)} days I refund half, and on the day itself I cannot refund — the ingredients are bought and the cake is made.`
        : `Cancel online until 23:59 on ${formatLongDate(lastChangeDay(o.date), o.today)} for half the price back.`,
    );
    lines.push(
      `Changes and cancelling online until 23:59 ${word(RULES.changeWindowDaysBefore)} days before your date.`,
    );
    if (tier === "full")
      lines.push(
        "If you move your date, the refund counts from the earliest date your order has had.",
      );
  }
  lines.push(
    "You pay in full today. Ready-made designs are paid at checkout; bespoke cakes are arranged with me directly.",
  );
  if (o.kitchenOthers.length)
    lines.push(
      `Made in a kitchen that also handles ${listInWords(o.kitchenOthers)}, so I cannot rule out traces of those.`,
    );
  return lines;
}

/**
 * The handover line (§5.4): “Delivery · Saturday 12 September, morning · Free” or
 * “Collection · Saturday 12 September, at a time we agree · Free”.
 */
export function reviewHandoverLine(o: {
  handover: "delivery" | "collection";
  window: string | null;
  dateLabel: string;
  chargePence: number;
}): { label: string; value: string } {
  if (o.handover === "collection")
    return {
      label: `Collection · ${o.dateLabel}, at a time we agree`,
      value: "Free",
    };
  const w = WINDOWS.find((x) => x.key === o.window);
  return {
    label: `Delivery · ${o.dateLabel}${w ? `, ${w.name.toLowerCase()}` : ""}`,
    value: o.chargePence === 0 ? "Free" : formatPrice(o.chargePence),
  };
}

/** “Nothing further to pay…” under Due today (641:3481, §5.4 copy). */
export const NOTHING_FURTHER =
  "Nothing further to pay. Your date is booked the moment this goes through.";
