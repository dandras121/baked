// Deadlines and refund tiers — SITE-FLOWS §10.1, §13. All in calendar days in London.
import { RULES } from "./constants";
import {
  addDays,
  daysBetween,
  londonInstant,
  type CalendarDate,
} from "./london-time";
import { halfRoundedUp } from "./money";

/** Last day to change or cancel online: the order's current date − 2, until 23:59 (Decided D2). */
export function lastChangeDay(currentDate: CalendarDate): CalendarDate {
  return addDays(currentDate, -RULES.changeWindowDaysBefore);
}

export function isChangeWindowOpen(
  currentDate: CalendarDate,
  today: CalendarDate,
): boolean {
  return daysBetween(today, lastChangeDay(currentDate)) >= 0;
}

/** The instant the change window closes: 00:00 London on D-1 (i.e. just after 23:59 on D-2). */
export function changeWindowClosesAt(currentDate: CalendarDate): Date {
  return londonInstant(addDays(lastChangeDay(currentDate), 1));
}

export type RefundTier = "full" | "half" | "none";

/**
 * Full while (earliest date − today) > 7; otherwise half while today is before the current date (also when the order
 * was moved later and its earliest date has passed); none on or after the current date (Decided 2026-10-17).
 */
export function refundTier(
  earliestDate: CalendarDate,
  currentDate: CalendarDate,
  today: CalendarDate,
): RefundTier {
  if (daysBetween(today, earliestDate) > RULES.fullRefundDaysBefore)
    return "full";
  if (daysBetween(today, currentDate) > 0) return "half";
  return "none";
}

/** Last day for a full refund: the earliest date − 8, until 23:59 (§10.1 Deadlines in customer copy). */
export function lastFullRefundDay(earliestDate: CalendarDate): CalendarDate {
  return addDays(earliestDate, -(RULES.fullRefundDaysBefore + 1));
}

/** What a tier gives back of what counts for a refund (§10.6), in pence; half rounds up (§10.7). */
export function refundAmount(
  countsForRefundPence: number,
  tier: RefundTier,
): number {
  if (tier === "full") return countsForRefundPence;
  if (tier === "half") return halfRoundedUp(countsForRefundPence);
  return 0;
}

export function assertLeadTimeDays(days: number): number {
  if (
    !Number.isInteger(days) ||
    days < RULES.catalogueLeadTimeMinDays ||
    days > RULES.catalogueLeadTimeMaxDays
  ) {
    throw new Error(
      `Lead time must be ${RULES.catalogueLeadTimeMinDays}–${RULES.catalogueLeadTimeMaxDays} days`,
    );
  }
  return days;
}

/** Earliest selectable catalogue date = today + lead time (§10.1). */
export function earliestSelectableDate(
  today: CalendarDate,
  leadTimeDays: number,
): CalendarDate {
  return addDays(today, assertLeadTimeDays(leadTimeDays));
}

/** “{n} more minutes” on the hold: whole minutes left, rounded down, at least 1 (§13). */
export function holdMinutesLeft(expiresAt: Date, now: Date): number {
  return Math.max(
    1,
    Math.floor((expiresAt.getTime() - now.getTime()) / 60_000),
  );
}
