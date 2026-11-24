// Send a payment link (§9.8): what it is for, the amount and its checks, the lines around it.
import { readPounds } from "@/lib/admin/cancel";
import { formatAdminMoney } from "@/lib/money";

export const LINK_PURPOSES = [
  { value: "deposit", label: "Deposit" },
  { value: "rest", label: "The rest" },
  { value: "difference", label: "A difference" },
] as const;
export type LinkPurpose = (typeof LINK_PURPOSES)[number]["value"];

/** Stripe's smallest card payment. */
export const STRIPE_MINIMUM = 30;

const money = (p: number) => formatAdminMoney(p, "breakdown");

/** The amount field (§9.8): “120”, “120.5” or “£120.50”; £0.30 up to still to pay. */
export function checkLinkAmount(
  raw: string,
  stillToPayPence: number,
): { pence: number; error: null } | { pence: null; error: string } {
  const pence = readPounds(raw);
  if (pence === null)
    return { pence: null, error: "Type an amount, for example 120 or 120.50." };
  if (pence < STRIPE_MINIMUM)
    return { pence: null, error: "The smallest card payment is £0.30." };
  if (pence > stillToPayPence)
    return {
      pence: null,
      error: `That is more than the ${money(stillToPayPence)} still to pay.`,
    };
  return { pence, error: null };
}

/** Opens with The rest and the amount = still to pay; the other kinds start empty (§9.8). */
export const prefill = (purpose: LinkPurpose, stillToPayPence: number) =>
  purpose === "rest"
    ? stillToPayPence % 100
      ? (stillToPayPence / 100).toFixed(2)
      : String(stillToPayPence / 100)
    : "";

/** “Total £380.00 · paid so far £0.00 · still to pay £380.00” (1607:10918). */
export const linkSums = (m: {
  totalPence: number;
  paidPence: number;
  stillToPayPence: number;
}) =>
  `Total ${money(m.totalPence)} · paid so far ${money(m.paidPence)} · still to pay ${money(m.stillToPayPence)}`;

export const purposeLabel = (p: string) =>
  p === "redelivery"
    ? "Redelivery"
    : (LINK_PURPOSES.find((x) => x.value === p)?.label ?? "Payment");

/** “Link sent · £120.00 · Deposit” (§9.8). */
export const sentLine = (pence: number, purpose: string) =>
  `Link sent · ${money(pence)} · ${purposeLabel(purpose)}`;
