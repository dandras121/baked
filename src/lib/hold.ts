// The date hold (SITE-FLOWS §10.3): its length, limits and words. Pure.
import { RULES } from "./constants";
import { numberInWords } from "./words";

/** At most two extensions (Keep holding, or Continue on the same date) — about an hour in all (Decided 2026-10-17). */
export const MAX_EXTENSIONS = 2;
/** At most two live holds per connection: a third draft from it cannot take one (Decided 2026-10-17). */
export const MAX_CONNECTION_HOLDS = 2;
/** The hold line offers Keep holding, or says it can't, with this many minutes left (§10.3 Running out). */
export const WARN_SECONDS = 120;

/**
 * Minutes a hold lasts: 20 (ops/hold-minutes, fixed); 2 on previews so the expiry can be tried (Bohoka 2026-11-01,
 * answer 2a); `BBL_HOLD_MINUTES` overrides it for tests.
 */
export function holdMinutes(
  env: Record<string, string | undefined> = process.env,
): number {
  const forced = Number(env.BBL_HOLD_MINUTES);
  if (Number.isInteger(forced) && forced > 0) return forced;
  return env.VERCEL_ENV === "preview" ? 2 : RULES.holdMinutes;
}

/** “m:ss” from milliseconds left, never below 0:00. */
export function clock(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const HOLD_COPY = {
  /** Under step 2's button (637:3302, Proposal copy). */
  before: (date: string, minutes: number) =>
    `Continue and I will hold ${date} for you for ${minutes} minutes.`,
  /** Under the stepper on steps 3–4 (§5.3). */
  held: (date: string, left: string) => `${date} is held for ${left}`,
  /** No extension left, 2 minutes to go (§10.3 Reaching a limit). */
  last: (date: string, left: string) =>
    `${date} is held for ${left} more — I can’t hold it any longer, so please pay before then.`,
  keep: (minutes: number) => `Keep holding for ${minutes} more minutes`,
  /** A third hold from one connection (§10.3). */
  connection: (phone: string | null) =>
    `Two dates are already being held from this connection. Finish one of those orders, or try again once one of the holds has run out${phone ? ` — or call me on ${phone}` : ""}.`,
  /** 974:9104 · B. */
  takenTitle: (date: string) => `${date} has just gone`,
  takenText:
    "Someone booked it while you were filling this in. The nearest free dates are below — nothing else you entered is lost.",
  /** 975:9087 · G, “twenty” follows the hold length. */
  ranOutTitle: (minutes: number) =>
    `Your ${numberInWords(minutes)} ${minutes === 1 ? "minute is" : "minutes are"} up`,
  ranOutText: (date: string) =>
    `${date} has gone back into the calendar and nothing has been charged. Everything you typed is still here.`,
  noDates: "There are no free dates in the next twelve months.",
  pickDay: "Pick a day in the calendar.",
} as const;
