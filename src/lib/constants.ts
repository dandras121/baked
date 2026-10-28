// Fixed rules that appear in copy (SITE-FLOWS §11.8): written once, here. Settings values live in the database.
export const RULES = {
  changeWindowDaysBefore: 2, // until 23:59 on D-2 (§10.1, Decided D2)
  fullRefundDaysBefore: 7, // full refund while earliest date − today > 7 (§10.1)
  holdMinutes: 20, // the date hold (§10.3, §11.2 ops/hold-minutes, fixed)
  statusLinkDays: 30, // status-link lifetime (§10.5, §11.2, fixed)
  maxCakesPerOrder: 5, // §11.2, Decided D1
  cancellationRightsExclusionDays: 14, // “the 14-day exclusion” in the before-you-pay terms (§5.4, §11.8)
  noShowWaitMinutes: 15, // “I wait fifteen minutes” on a missed delivery (§6.8, §11.8)
  collectTodayBeforeHour: 18, // “Collect it today … before 6pm?” (§6.8, §11.8)
  collectTomorrowBeforeHour: 12, // “Collect it free … tomorrow before 12 noon” (e-mail 13, §11.8)
  refundWorkingDays: "5–10", // “5–10 working days” (§11.8 list)
  allergyNoteDays: 90, // “90 days” (§11.8 list, §10.10)
  catalogueLeadTimeMinDays: 3, // ops/lead-time-days range (§10.1, Decided 2026-10-17)
  catalogueLeadTimeMaxDays: 60,
  stripeMinimumPence: 30, // £0.30 (§11.1, §11.6)
  draftHours: 24, // §10.2
} as const;

/** The 14 UK allergens (Food Information Regulations), in label order. */
export const UK_ALLERGENS = [
  "celery",
  "cereals containing gluten",
  "crustaceans",
  "eggs",
  "fish",
  "lupin",
  "milk",
  "molluscs",
  "mustard",
  "nuts",
  "peanuts",
  "sesame",
  "soya",
  "sulphites",
] as const;
export type Allergen = (typeof UK_ALLERGENS)[number];
