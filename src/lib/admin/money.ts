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
