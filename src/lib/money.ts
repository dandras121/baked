// Money is integer pence, GBP only (SITE-FLOWS §10.7).

export function assertPence(value: number): number {
  if (!Number.isSafeInteger(value))
    throw new Error(`Money must be whole pence, got ${value}`);
  return value;
}

const grouped = (pounds: number) => pounds.toLocaleString("en-GB");

/** Customer display (§10.7): £185 when whole, £92.50 otherwise; thousands with a comma. */
export function formatPrice(pence: number): string {
  assertPence(pence);
  const sign = pence < 0 ? "−" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}£${grouped(pounds)}${rest === 0 ? "" : `.${String(rest).padStart(2, "0")}`}`;
}

/** Admin display (§9.1 Money format): breakdowns and amount fields always two decimals; labels as the customer. */
export function formatAdminMoney(
  pence: number,
  where: "breakdown" | "label",
): string {
  assertPence(pence);
  if (where === "label") return formatPrice(pence);
  const sign = pence < 0 ? "−" : "";
  const abs = Math.abs(pence);
  return `${sign}£${grouped(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, "0")}`;
}

/** Half refunds round up to the penny, in the customer's favour (§10.7 Rounding). */
export function halfRoundedUp(pence: number): number {
  return Math.ceil(assertPence(pence) / 2);
}

/** Size difference shown as “+£55” (§13). */
export function formatDifference(pence: number): string {
  return pence > 0 ? `+${formatPrice(pence)}` : formatPrice(pence);
}
