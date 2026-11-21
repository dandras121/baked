// Cancel the order, from the admin (§9.5): the proposed refund, its split between card and by hand, and the words.
import type { RefundTier } from "@/lib/deadlines";
import { formatAdminMoney } from "@/lib/money";

const money = (p: number) => formatAdminMoney(p, "breakdown");

/** The card part comes first, up to what can go back to the card; the rest is given back by hand (§9.5). */
export const splitRefund = (amountPence: number, cardPence: number) => ({
  card: Math.min(amountPence, Math.max(0, cardPence)),
  hand: Math.max(0, amountPence - Math.max(0, cardPence)),
});

/** “£280.00 back to the card · £20.00 to give back by hand”, or “No refund”. */
export function splitLine(s: { card: number; hand: number }) {
  if (s.card + s.hand === 0) return "No refund";
  return [
    s.card > 0 && `${money(s.card)} back to the card`,
    s.hand > 0 && `${money(s.hand)} to give back by hand`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What the terms give today, said in one line above the amount. */
export function termsLine(tier: RefundTier, proposedPence: number) {
  if (tier === "full")
    return `The terms give a full refund today: ${money(proposedPence)}.`;
  if (tier === "half")
    return `The terms give half back today: ${money(proposedPence)}.`;
  return "The terms give no refund on or after the day.";
}

/** The amount as typed (“185”, “£92.50”) in pence, or null when it is not an amount. */
export function readPounds(raw: string): number | null {
  const t = raw.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [p, d = ""] = t.split(".");
  return Number(p) * 100 + Number(d.padEnd(2, "0"));
}

/** The amount check: £0 up to what was paid. */
export function amountError(pence: number | null, paidPence: number) {
  if (pence === null) return "Type an amount, for example 185 or 92.50.";
  if (pence > paidPence)
    return `That is more than the ${money(paidPence)} paid.`;
  return null;
}

/** The main button: “Cancel and refund £280.00”; with no refund “Cancel with no refund”. */
export const cancelButton = (pence: number) =>
  pence > 0 ? `Cancel and refund ${money(pence)}` : "Cancel with no refund";

/** The e-mail 8 tier: the terms' own, “own” when Linda changed the amount, “none” for nothing back on the day. */
export function emailTier(
  tier: RefundTier,
  proposedPence: number,
  amountPence: number,
) {
  if (amountPence !== proposedPence) return "own" as const;
  return tier;
}
