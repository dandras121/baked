// Record a payment and Record a refund given back (§9.5; 1801:12967, 1801:13035): cash or bank transfer, with a date.
import { readPounds } from "@/lib/admin/cancel";
import type { CalendarDate } from "@/lib/london-time";
import { formatAdminMoney } from "@/lib/money";

export type HandForm = {
  amount: string;
  method: "" | "cash" | "bank";
  date: string;
};
export type HandValue = {
  pence: number;
  method: "cash" | "bank";
  date: CalendarDate;
};

const money = (p: number) => formatAdminMoney(p, "breakdown");
export const METHOD = { cash: "Cash", bank: "Bank transfer" } as const;

/** £0.01 up to `maxPence` (still to pay, or what is still to give back), Cash or Bank transfer, today or earlier. */
export function checkHand(
  f: HandForm,
  maxPence: number,
  kind: "payment" | "refund",
  today: CalendarDate,
):
  | { value: HandValue; errors: null }
  | { value: null; errors: Partial<Record<keyof HandForm, string>> } {
  const e: Partial<Record<keyof HandForm, string>> = {};
  const pence = readPounds(f.amount);
  if (pence === null || pence < 1)
    e.amount = "Type an amount, for example 100 or 92.50.";
  else if (pence > maxPence) e.amount = tooMuch(kind, maxPence);
  if (f.method !== "cash" && f.method !== "bank")
    e.method = "Choose Cash or Bank transfer.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || Number.isNaN(Date.parse(f.date)))
    e.date = "Pick the day.";
  else if (f.date > today) e.date = "Pick today or an earlier day.";
  if (Object.keys(e).length || pence === null)
    return { value: null, errors: e };
  return {
    value: { pence, method: f.method as "cash" | "bank", date: f.date },
    errors: null,
  };
}

/** Above the limit: “That is more than the £240.00 still to pay.” (§9.5) */
export const tooMuch = (kind: "payment" | "refund", maxPence: number) =>
  kind === "payment"
    ? `That is more than the ${money(maxPence)} still to pay.`
    : `That is more than the ${money(maxPence)} still to give back.`;

/** “Still to pay £260.00 — you can record up to this.” · “£92.50 still to give back by hand.” */
export const handHint = (kind: "payment" | "refund", maxPence: number) =>
  kind === "payment"
    ? `Still to pay ${money(maxPence)} — you can record up to this.`
    : `${money(maxPence)} still to give back by hand.`;

/** Remove (§9.5): “Remove the £100.00 cash payment of 9 Sep? Still to pay goes back up. It stays listed in HISTORY.” */
export const removeQuestion = (pence: number, method: string, on: string) =>
  `Remove the ${money(pence)} ${method === "cash" ? "cash" : "bank transfer"} payment of ${on}?`;

/** Under Record a refund given back (1801:13035): what it completes and when the Money flag clears. */
export const handBackNote = (cancelled: boolean, pence: number) =>
  `It completes the ${cancelled ? "cancellation refund" : "refund for the lowered total"}. The Money flag “${money(pence)} to give back by hand” clears once the whole amount is recorded.`;
