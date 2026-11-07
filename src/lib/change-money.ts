// The money of a change (§6.4): the net difference over all cakes, and Stripe's minimum — a difference under £0.30
// either way counts as £0 (nothing charged or refunded; the lines keep their price paid; the history notes it).
import { tierWords } from "./cake-config";

export const STRIPE_MINIMUM_PENCE = 30;

export type MoneyKind = "up" | "down" | "none" | "waived";

export function changeMoney(netPence: number): {
  kind: MoneyKind;
  pence: number;
} {
  if (netPence === 0) return { kind: "none", pence: 0 };
  if (Math.abs(netPence) < STRIPE_MINIMUM_PENCE)
    return { kind: "waived", pence: netPence };
  return netPence > 0
    ? { kind: "up", pence: netPence }
    : { kind: "down", pence: -netPence };
}

/** “Two tiers · serves 24”, as the order line writes it. */
export const sizeLine = (s: { tiers: number; serves: number }) =>
  `${tierWords(s.tiers)} · serves ${s.serves}`;

/** “Serves 30 · three tiers” (the editor's radio list, 1799:12997). */
export const sizeChoiceLabel = (s: { tiers: number; serves: number }) =>
  `Serves ${s.serves} · ${tierWords(s.tiers).toLowerCase()}`;

/** The serves in “Two tiers · serves 24” (lines made before the size id was kept). */
export const servesOf = (line: string) =>
  Number(/serves (\d+)/i.exec(line)?.[1] ?? NaN);
