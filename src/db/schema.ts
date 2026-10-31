// Database schema (Drizzle). Money in integer pence (§10.7); dates as calendar dates (§10.1).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
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

/**
 * The catalogue (§9.13, §11.3) — the part slice 2.3 needs for the Home cake row (Bohoka 2026-10-30:
 * "most csak a szükséges rész"); options, allergens, categories, photos and the card video join in 3.1.
 * A deleted cake is kept (soft delete): its slug is never reused, its name can be.
 */
export const cakes = pgTable(
  "cakes",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    whatItIs: text("what_it_is").notNull().default(""),
    flavour: text("flavour").notNull(),
    visible: boolean("visible").notNull().default(false),
    /** Linda's drag order: the catalogue order; the Home row is the first five visible. */
    position: integer("position").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("cake_name_length", sql`char_length(${t.name}) between 2 and 60`),
    check(
      "cake_flavour_length",
      sql`char_length(${t.flavour}) between 1 and 60`,
    ),
    check("cake_what_it_is_length", sql`char_length(${t.whatItIs}) <= 300`),
    uniqueIndex("cake_name_unique_live")
      .on(sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    index("cake_position").on(t.position),
  ],
);

/** A cake's sizes (§9.13): serves · tiers · price; each keeps its id when edited. */
export const cakeSizes = pgTable(
  "cake_sizes",
  {
    id: serial("id").primaryKey(),
    cakeId: integer("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    serves: integer("serves").notNull(),
    tiers: integer("tiers").notNull(),
    pricePence: integer("price_pence").notNull(),
  },
  (t) => [
    unique("cake_size_serves_unique").on(t.cakeId, t.serves),
    check("size_serves_range", sql`${t.serves} between 1 and 500`),
    check("size_tiers_positive", sql`${t.tiers} >= 1`),
    check("size_price_range", sql`${t.pricePence} between 100 and 500000`),
  ],
);

/**
 * Gallery photos (§9.18, §11.4) — the fields the Home "Special idea?" squares need. The file itself
 * arrives with uploads (slice 9.x); until then `imagePath` is empty and the square shows the placeholder.
 */
export const galleryPhotos = pgTable(
  "gallery_photos",
  {
    id: serial("id").primaryKey(),
    caption: text("caption").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    imagePath: text("image_path"),
    /** One of the four occasions (§4.8 lightbox line), or null. */
    occasion: text("occasion"),
    showing: boolean("showing").notNull().default(false),
    position: integer("position").notNull(),
    /** Linda's Home pick, 1–4 in her order; null = not on Home. */
    homeOrder: integer("home_order"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("caption_length", sql`char_length(${t.caption}) <= 80`),
    check(
      "gallery_occasion",
      sql`${t.occasion} in ('birthdays', 'kids', 'weddings', 'corporate')`,
    ),
    check("home_order_range", sql`${t.homeOrder} between 1 and 4`),
    uniqueIndex("home_order_unique")
      .on(t.homeOrder)
      .where(sql`${t.homeOrder} is not null`),
  ],
);

/**
 * Linda's Google reviews (§11.4, Decided 2026-10-22): a copy of what the Business Profile API returns, synced
 * daily (slice 12.x) — until then filled from a fixture in development and on previews only. Only the
 * listed fields are kept. Reviews without text count in the rating line but are not cards.
 */
export const googleReviews = pgTable(
  "google_reviews",
  {
    id: text("id").primaryKey(),
    stars: integer("stars").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    text: text("text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("review_stars_range", sql`${t.stars} between 1 and 5`),
    index("review_newest").on(t.createdAt, t.id),
  ],
);

/** The Google score and count (§11.4): one row, with the time of the last successful fetch. */
export const googleRating = pgTable(
  "google_rating",
  {
    id: integer("id").primaryKey().default(1),
    /** The average in tenths: 4.9 → 49. */
    ratingTenths: integer("rating_tenths").notNull(),
    reviewCount: integer("review_count").notNull(),
    /** Linda's reviews on Google (new tab); null until her profile is connected (§14.1). */
    reviewsUrl: text("reviews_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    check("rating_single_row", sql`${t.id} = 1`),
    check("rating_range", sql`${t.ratingTenths} between 10 and 50`),
    check("review_count_positive", sql`${t.reviewCount} >= 0`),
  ],
);

/** FAQ (§4.4, §9.12): Linda's questions and answers; answers may hold {placeholders} (§11.8). */
export const faqQuestions = pgTable(
  "faq_questions",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    /** Order within its category (drag in the admin). */
    position: integer("position").notNull(),
  },
  (t) => [
    check(
      "faq_category",
      sql`${t.category} in ('ordering', 'paying', 'food', 'delivery', 'after', 'kitchen')`,
    ),
    check(
      "faq_question_length",
      sql`char_length(${t.question}) between 1 and 140`,
    ),
    check(
      "faq_answer_length",
      sql`char_length(${t.answer}) between 1 and 2000`,
    ),
  ],
);

/**
 * Legal page revisions (§4.5, §9.12): every save of a legal page is a new revision, never changed or deleted;
 * the newest is the page. Orders and e-mail 1 point to the revisions accepted (§5.3, §8.1).
 * `body` is the small format of the editor: "## " section headings, paragraphs, "- " lists, **bold**,
 * [links](href), and {placeholders} (§11.8).
 */
export const legalRevisions = pgTable(
  "legal_revisions",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    intro: text("intro").notNull(),
    body: text("body").notNull(),
    /** “Last updated”, a London calendar date, set when the page is saved. */
    updatedOn: date("updated_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("legal_slug_newest").on(t.slug, t.createdAt)],
);

/**
 * Contact messages (§7.4): kept 30 days on the site, then deleted by the daily job (§10.10, §12); the e-mail stays
 * in Linda's mailbox. Shown read-only at /admin/messages/[id] (slice 9.8). `formKey` makes a repeated send one
 * message (§10.8 Double submit).
 */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    formKey: text("form_key").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** E.164 (§10.8), or null. */
    phone: text("phone"),
    message: text("message").notNull(),
    /** The page the form was sent from. */
    page: text("page").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("contact_form_key").on(t.formKey),
    index("contact_created").on(t.createdAt),
    // The form allows 400 characters as the customer counts them (an emoji is one); the database only guards
    // against something far larger.
    check(
      "contact_message_length",
      sql`char_length(${t.message}) between 1 and 2000`,
    ),
  ],
);

/**
 * Form sends per connection (§10.9): one row per send, the connection kept only as a salted hash. Rows older than
 * an hour no longer count; the daily job removes them (§12).
 */
export const formSends = pgTable(
  "form_sends",
  {
    id: serial("id").primaryKey(),
    form: text("form").notNull(),
    connection: text("connection").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("form_sends_lookup").on(t.form, t.connection, t.at)],
);
