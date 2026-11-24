// Money (§9.9): the words around the numbers.
import { dayMonth } from "@/lib/admin/order-detail";
import type { CalendarDate } from "@/lib/london-time";
import { formatAdminMoney } from "@/lib/money";

const label = (p: number) => formatAdminMoney(p, "label");

/** “£240 still to pay across 1 order” (§9.9). */
export const moneySubtitle = (pence: number, orders: number) =>
  orders === 0
    ? "Nothing still to pay"
    : `${label(pence)} still to pay across ${orders} ${orders === 1 ? "order" : "orders"}`;

/** LINK SENT: “Sent 1 Sep · £240”, several open: “Sent 1 Sep +1”, none: “—” (§9.9). */
export const linkSent = (
  l: { sentOn: CalendarDate; pence: number; more: number } | null,
) =>
  !l
    ? "—"
    : l.more > 0
      ? `Sent ${dayMonth(l.sentOn)} +${l.more}`
      : `Sent ${dayMonth(l.sentOn)} · ${label(l.pence)}`;

/** “39 orders · £5,582 · nothing outstanding” (§9.9). */
export const paidInFullLine = (p: { count: number; totalPence: number }) =>
  `${p.count} ${p.count === 1 ? "order" : "orders"} · ${label(p.totalPence)} · nothing outstanding`;

const LONG_MONTHS = [
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
const longDay = (d: CalendarDate) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${LONG_MONTHS[m - 1]}`;
};
const breakdown = (p: number) => formatAdminMoney(p, "breakdown");
const ref = (pi: string) =>
  pi.length > 12 ? `${pi.slice(0, 6)}…${pi.slice(-4)}` : pi;

/** The flags' words (§9.9; 934:8321 for the first). */
export const FLAG = {
  noOrderTitle: (n: number) =>
    n === 1
      ? "1 Stripe payment has no order"
      : `${n} Stripe payments have no order`,
  noOrder: (pence: number | null, on: CalendarDate, pi: string) =>
    `${pence === null ? "A payment" : breakdown(pence)} was taken on ${longDay(on)} (${ref(pi)}) but no order exists for it — the confirmation webhook never arrived. Nothing is booked against this payment. Check the charge in Stripe and create or refund the order by hand.`,
  refundFailedTitle: "Refund failed — try again",
  refundFailed: (
    pence: number,
    number: string,
    name: string,
    on: CalendarDate,
    error: string | null,
  ) =>
    `${breakdown(pence)} back to the card for ${number} (${name}) did not go through on ${dayMonth(on)}${error ? `: ${error}` : ""}. Nothing has gone back yet.`,
  checkDayTitle: (number: string) =>
    `Booked after its hold ran out — ${number}`,
  checkDay: (name: string, day: string) =>
    `${name}’s order for ${day} was paid after its hold ran out, and that day is now full, closed or too soon. Check you can make it.`,
  feeTitle: (pence: number, number: string) =>
    `${label(pence)} redelivery to refund — ${number}`,
  fee: (pence: number, name: string) =>
    `Delivered after all was recorded on a paid redelivery. Refund the ${breakdown(pence)} to ${name}’s card, or keep it.`,
  handTitle: (pence: number, number: string) =>
    `${breakdown(pence)} to give back by hand — ${number}`,
  hand: "Give it back in cash or by bank transfer, then record it on the order.",
};
