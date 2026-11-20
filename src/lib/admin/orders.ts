// Orders (§9.4): the filters, the search words and the PAID cell — the rules that need no database.
import { formatPrice } from "@/lib/money";

export const ORDER_FILTERS = [
  { key: "all", label: "All" },
  { key: "week", label: "This week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "topay", label: "To pay" },
] as const;

export type OrderFilter = (typeof ORDER_FILTERS)[number]["key"];

/** The phone shows All · This week · To pay (948:8869); a Helper never sees To pay (§9.4). */
export const PHONE_FILTERS: OrderFilter[] = ["all", "week", "topay"];

export const PAGE = 20;

/** The filter from the URL; anything else, or To pay for a Helper, reads as All. */
export function readFilter(v: string | undefined, owner: boolean): OrderFilter {
  const f = ORDER_FILTERS.find((x) => x.key === v)?.key ?? "all";
  return f === "topay" && !owner ? "all" : f;
}

/** How many rows to show: 20, 40, … from `?shown=`. */
export function readShown(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > PAGE ? Math.ceil(n / PAGE) * PAGE : PAGE;
}

/**
 * The search (§9.4): from 2 characters; name, town, e-mail as typed; the postcode without spaces; the order number
 * with or without “BBL-”; the phone by its digits (07700… also finds +447700…).
 */
export function searchWords(raw: string | undefined) {
  const text = (raw ?? "").trim();
  if (text.length < 2) return null;
  const digits = text.replace(/\D/g, "");
  return {
    text,
    postcode: text.replace(/\s+/g, "").toUpperCase(),
    number: text.replace(/^bbl-?/i, ""),
    digits: digits.length >= 3 ? digits : null,
    international:
      digits.length >= 3 && digits.startsWith("0")
        ? `44${digits.slice(1)}`
        : null,
  };
}

/** The PAID cell (§9.4): “£185 · paid”, “£80 of £320”, “£320 · refunded”, “refund pending”, “£140 · refund due”. */
export function paidCell(
  status: string,
  m: {
    totalPence: number;
    netPaidPence: number;
    refundedPence: number;
    refundPending: boolean;
  },
) {
  if (m.refundPending) return "refund pending";
  if (status === "cancelled" || status === "refunded") {
    if (m.netPaidPence > 0)
      return `${formatPrice(m.netPaidPence)} · refund due`;
    return m.refundedPence > 0
      ? `${formatPrice(m.refundedPence)} · refunded`
      : "Nothing paid";
  }
  if (m.netPaidPence >= m.totalPence)
    return `${formatPrice(m.totalPence)} · paid`;
  return `${formatPrice(Math.max(0, m.netPaidPence))} of ${formatPrice(m.totalPence)}`;
}

export const STATUS_TAG: Record<string, string> = {
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** “42 this year · £6,020 taken · £240 still to pay” (§13; Owner). */
export const ordersSubtitle = (n: number, taken: number, still: number) =>
  `${n} this year · ${formatPrice(taken)} taken · ${formatPrice(still)} still to pay`;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** The DATE cell: “12 Sep”; the year added when it is not this year (“12 Sep 2025”). */
export function listDate(date: string, today: string) {
  const [y, m, d] = date.split("-").map(Number);
  const base = `${d} ${MONTHS[m - 1]}`;
  return String(y) === today.slice(0, 4) ? base : `${base} ${y}`;
}
