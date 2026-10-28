// Database schema (Drizzle). Money in integer pence (§10.7); dates as calendar dates (§10.1).
import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** One row: the Settings values of §11.1 and §11.2 (admin Settings §9.14, Availability §9.11). */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    tradingName: text("trading_name").notNull(),
    legalName: text("legal_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    addressLine: text("address_line").notNull(),
    postcode: text("postcode").notNull(),
    town: text("town").notNull(),
    council: text("council").notNull(),
    hygieneRating: text("hygiene_rating").notNull(),
    instagram: jsonb("instagram")
      .$type<{ url: string; label: string }>()
      .notNull(),
    facebook: jsonb("facebook")
      .$type<{ url: string; label: string }>()
      .notNull(),
    deliveryArea: text("delivery_area").notNull(),
    postcodeDistricts: text("postcode_districts").notNull(),
    beyondTheArea: text("beyond_the_area").notNull(),
    deliveryChargePence: integer("delivery_charge_pence").notNull(),
    secondAttemptFeePence: integer("second_attempt_fee_pence").notNull(),
    bespokeMinimumPence: integer("bespoke_minimum_pence").notNull(),
    kitchenHandles: text("kitchen_handles").array().notNull(),
    dailyCap: integer("daily_cap").notNull(),
    weeklyCap: integer("weekly_cap").notNull(),
    leadTimeDays: integer("lead_time_days").notNull(),
    bespokeLeadTimeWeeks: integer("bespoke_lead_time_weeks").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check("lead_time_range", sql`${t.leadTimeDays} between 3 and 60`),
    check(
      "bespoke_lead_time_range",
      sql`${t.bespokeLeadTimeWeeks} between 1 and 26`,
    ),
    check("delivery_charge_not_negative", sql`${t.deliveryChargePence} >= 0`),
    check(
      "second_attempt_fee_rule",
      sql`${t.secondAttemptFeePence} = 0 or ${t.secondAttemptFeePence} >= 30`,
    ),
    check(
      "bespoke_minimum_range",
      sql`${t.bespokeMinimumPence} between 100 and 500000`,
    ),
    check("caps_positive", sql`${t.dailyCap} >= 0 and ${t.weeklyCap} >= 0`),
  ],
);

/** Closed days (§11.2): stored one day at a time; a range closes each of its days. */
export const closedDays = pgTable("closed_days", {
  day: date("day").primaryKey(),
  note: text("note"),
});
