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
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
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
    /** The cake's own allergens: keys of UK_ALLERGENS (§9.13, Decided D17). */
    allergens: text("allergens")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Which cereals and which tree nuts, required when those are ticked (“wheat”, “almonds, hazelnuts”). */
    glutenKinds: text("gluten_kinds").notNull().default(""),
    nutKinds: text("nut_kinds").notNull().default(""),
    /** The free “Also contains” line (max 120). */
    alsoContains: text("also_contains").notNull().default(""),
    /** The fixed four occasions (§4.2 filters); a cake can be in several. */
    categories: text("categories")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** “Offer an inscription” (§5.8), on by default. */
    offerInscription: boolean("offer_inscription").notNull().default(true),
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
    check(
      "cake_allergen_keys",
      sql`${t.allergens} <@ array['celery','cereals containing gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','nuts','peanuts','sesame','soya','sulphites']::text[]`,
    ),
    check(
      "cake_gluten_named",
      sql`not ('cereals containing gluten' = any(${t.allergens})) or char_length(trim(${t.glutenKinds})) > 0`,
    ),
    check(
      "cake_nuts_named",
      sql`not ('nuts' = any(${t.allergens})) or char_length(trim(${t.nutKinds})) > 0`,
    ),
    check(
      "cake_also_contains_length",
      sql`char_length(${t.alsoContains}) <= 120`,
    ),
    check(
      "cake_category_keys",
      sql`${t.categories} <@ array['birthdays','kids','weddings','corporate']::text[]`,
    ),
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

/**
 * A cake's options (§5.8, Decided 2026-10-21): Choice (pick one), Choices (tick several), Text (a short answer),
 * Yes/no (one tick box). At most 6 per cake (checked when saving, §9.13).
 */
export const cakeOptions = pgTable(
  "cake_options",
  {
    id: serial("id").primaryKey(),
    cakeId: integer("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: text("type").notNull(),
    label: text("label").notNull(),
    help: text("help").notNull().default(""),
    /** Choice and Text: required or not. */
    required: boolean("required").notNull().default(false),
    /** Choices: how many may be ticked (0–10). */
    minPicks: integer("min_picks").notNull().default(0),
    maxPicks: integer("max_picks").notNull().default(10),
    /** Text: the longest answer (1–200, default 40). */
    maxLength: integer("max_length").notNull().default(40),
  },
  (t) => [
    check(
      "option_type",
      sql`${t.type} in ('choice', 'choices', 'text', 'yesno')`,
    ),
    check("option_label_length", sql`char_length(${t.label}) between 1 and 40`),
    check("option_help_length", sql`char_length(${t.help}) <= 120`),
    check(
      "option_picks",
      sql`${t.minPicks} between 0 and 10 and ${t.maxPicks} between 0 and 10 and ${t.minPicks} <= ${t.maxPicks}`,
    ),
    check("option_max_length", sql`${t.maxLength} between 1 and 200`),
    index("option_cake").on(t.cakeId, t.position),
  ],
);

/**
 * The choices of a Choice / Choices option, or the one tick of a Yes/no (§5.8): a price add-on (£0–£1,000) and the
 * allergens it adds. At most 10 per option.
 */
export const cakeOptionChoices = pgTable(
  "cake_option_choices",
  {
    id: serial("id").primaryKey(),
    optionId: integer("option_id")
      .notNull()
      .references(() => cakeOptions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    label: text("label").notNull(),
    pricePence: integer("price_pence").notNull().default(0),
    allergens: text("allergens")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    glutenKinds: text("gluten_kinds").notNull().default(""),
    nutKinds: text("nut_kinds").notNull().default(""),
    alsoContains: text("also_contains").notNull().default(""),
  },
  (t) => [
    check("choice_label_length", sql`char_length(${t.label}) between 1 and 40`),
    check("choice_price_range", sql`${t.pricePence} between 0 and 100000`),
    check(
      "choice_allergen_keys",
      sql`${t.allergens} <@ array['celery','cereals containing gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','nuts','peanuts','sesame','soya','sulphites']::text[]`,
    ),
    check(
      "choice_gluten_named",
      sql`not ('cereals containing gluten' = any(${t.allergens})) or char_length(trim(${t.glutenKinds})) > 0`,
    ),
    check(
      "choice_nuts_named",
      sql`not ('nuts' = any(${t.allergens})) or char_length(trim(${t.nutKinds})) > 0`,
    ),
    index("choice_option").on(t.optionId, t.position),
  ],
);

/**
 * The cake page's photos and videos (§9.13): up to 8 photos (the first = the card photo) and 2 videos, in order.
 * Each photo keeps Linda's focal point (0–1, default the centre) for every crop (§0.6). Files arrive with the
 * media pipeline (9.2).
 */
export const cakeMedia = pgTable(
  "cake_media",
  {
    id: serial("id").primaryKey(),
    cakeId: integer("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    position: integer("position").notNull(),
    path: text("path").notNull(),
    /** Videos: the cover picture. */
    posterPath: text("poster_path"),
    altText: text("alt_text").notNull().default(""),
    focalX: real("focal_x").notNull().default(0.5),
    focalY: real("focal_y").notNull().default(0.5),
  },
  (t) => [
    check("media_kind", sql`${t.kind} in ('photo', 'video')`),
    check(
      "media_focal",
      sql`${t.focalX} between 0 and 1 and ${t.focalY} between 0 and 1`,
    ),
    index("media_cake").on(t.cakeId, t.position),
  ],
);

/**
 * The card video (§9.13, Decided 2026-10-22; claude/torta-video-szabalyrendszer.md): one per cake, shown only on
 * the cake card — closed: its first frame, open: playing (ANIM-11). Web versions 1080 and 1440 square, and a still.
 */
export const cakeCardVideos = pgTable("cake_card_videos", {
  cakeId: integer("cake_id")
    .primaryKey()
    .references(() => cakes.id, { onDelete: "cascade" }),
  path1080: text("path_1080").notNull(),
  path1440: text("path_1440").notNull(),
  stillPath: text("still_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The checkout draft (§10.2): its id lives in the httpOnly cookie `bbl_session`. Deleted after 24 hours without
 * activity. Phase 3 stores the cakes; the date, handover, details, hold and payment fields arrive with phase 4.
 */
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("draft"),
    /** 1 the cake · 2 when & where · 3 your details · 4 review & pay (§5). */
    furthestStep: integer("furthest_step").notNull().default(1),
    /** The date hold (§10.3): the held day, until when, how often it was extended (at most twice), from which
     *  connection (a hash; deleted with the draft). No hold: all null / 0. */
    holdDate: date("hold_date"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    holdExtensions: integer("hold_extensions").notNull().default(0),
    holdConnection: text("hold_connection"),
    /** Step 2's handover (§5.2): delivery or collection; for delivery the address, the postcode (normalised) and the
     *  window (morning / afternoon / evening). Not chosen yet: all null. */
    handover: text("handover"),
    address: text("address"),
    town: text("town"),
    postcode: text("postcode"),
    deliveryWindow: text("delivery_window"),
    /** Step 3 (§5.3): as typed, saved on blur and on Continue; the phone also in E.164 once it is a valid mobile.
     *  The allergy consent (D16), the terms acceptance with the revisions shown, and the yearly e-mail opt-in are
     *  set on Continue; the opt-in becomes a marketing consent when the order is confirmed (§10.10). */
    customerName: text("customer_name"),
    email: text("email"),
    phone: text("phone"),
    phoneE164: text("phone_e164"),
    cakeFor: text("cake_for"),
    allergyNote: text("allergy_note"),
    allergyConsentAt: timestamp("allergy_consent_at", { withTimezone: true }),
    allergyConsentWording: text("allergy_consent_wording"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsRevisionId: integer("terms_revision_id"),
    cancellationsRevisionId: integer("cancellations_revision_id"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    marketingWording: text("marketing_wording"),
    /** Paying (§5.5): the one PaymentIntent of this draft, the snapshot taken at Pay with its amount, and when the
     *  draft was locked for paying (status `pending`). */
    paymentIntentId: text("payment_intent_id"),
    snapshot: jsonb("snapshot"),
    snapshotAmountPence: integer("snapshot_amount_pence"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    /** Confirmed (§10.6): only by Stripe — the `payment_intent.succeeded` webhook or the reconciliation job (§12). */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    amountReceivedPence: integer("amount_received_pence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "draft_status",
      sql`${t.status} in ('draft', 'pending', 'confirmed', 'abandoned')`,
    ),
    check("draft_step", sql`${t.furthestStep} between 1 and 4`),
    check("draft_hold_extensions", sql`${t.holdExtensions} between 0 and 2`),
    check(
      "draft_handover",
      sql`${t.handover} is null or ${t.handover} in ('delivery', 'collection')`,
    ),
    check(
      "draft_window",
      sql`${t.deliveryWindow} is null or ${t.deliveryWindow} in ('morning', 'afternoon', 'evening')`,
    ),
    index("draft_hold").on(t.holdDate, t.holdExpiresAt),
    index("draft_activity").on(t.lastActivityAt),
  ],
);

/** One cake in a draft: the size, the option answers (option and choice ids) and the inscription (§10.2). */
export const draftLines = pgTable(
  "draft_lines",
  {
    id: serial("id").primaryKey(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    cakeId: integer("cake_id")
      .notNull()
      .references(() => cakes.id, { onDelete: "cascade" }),
    // A size Linda removes takes the line out of the draft with it (§5.5 notices come with phase 4).
    sizeId: integer("size_id")
      .notNull()
      .references(() => cakeSizes.id, { onDelete: "cascade" }),
    /** { picks: { optionId: choiceId[] }, texts: { optionId: text } } */
    answers: jsonb("answers")
      .notNull()
      .default(sql`'{"picks":{},"texts":{}}'::jsonb`),
    inscription: text("inscription").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("line_inscription_length", sql`char_length(${t.inscription}) <= 48`),
    index("line_draft").on(t.draftId, t.position),
  ],
);

/**
 * “Check this payment” and the other payment flags for Linda (§8.3, §12 reconciliation). Logged here until the
 * e-mails of phase 5 and the admin of phase 7 show them; one per kind and PaymentIntent, so a replay adds nothing.
 */
export const paymentAlerts = pgTable(
  "payment_alerts",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(),
    paymentIntentId: text("payment_intent_id").notNull(),
    draftId: uuid("draft_id"),
    detail: text("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "payment_alert_kind",
      sql`${t.kind} in ('check-payment', 'no-order', 'booked-after-hold')`,
    ),
    uniqueIndex("payment_alert_once").on(t.kind, t.paymentIntentId),
  ],
);

/** The order-number sequence: one row per year of confirmation (§10.7 BBL-YYYY-NNNN, no gaps from drafts). */
export const orderCounters = pgTable("order_counters", {
  year: integer("year").primaryKey(),
  last: integer("last").notNull(),
});

/**
 * An order (§10.6): made at confirmation from the draft and the snapshot taken at Pay (§1 Snapshot), which it keeps
 * for good — later admin edits never change it. Business facts are not copied here: order pages read current
 * Settings (§11.1); e-mail 1's frozen copy arrives with phase 5.
 */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(),
    kind: text("kind").notNull().default("catalogue"),
    status: text("status").notNull().default("confirmed"),
    draftId: uuid("draft_id").unique(),
    /** The status link /my-order/[token] (§6, §10.5). */
    token: text("token").notNull().unique(),
    date: date("date").notNull(),
    /** The refund tiers count from the earliest date the order has had (§10.1). */
    earliestDate: date("earliest_date").notNull(),
    handover: text("handover").notNull(),
    deliveryWindow: text("delivery_window"),
    address: text("address"),
    town: text("town"),
    postcode: text("postcode"),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    phoneE164: text("phone_e164"),
    cakeFor: text("cake_for"),
    allergyNote: text("allergy_note"),
    /** The consents as given at checkout: wording, time and the legal revisions shown (§5.3). */
    consents: jsonb("consents").notNull(),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    deliveryChargePence: integer("delivery_charge_pence").notNull().default(0),
    totalPence: integer("total_pence").notNull(),
    amountReceivedPence: integer("amount_received_pence").notNull(),
    paymentIntentId: text("payment_intent_id").unique(),
    snapshot: jsonb("snapshot").notNull(),
    /** The business facts at confirmation (§11.8 placeholder values): e-mail 1's key terms, footer and legal PDFs
     *  are filled from these, never from today's Settings (§8.1). */
    facts: jsonb("facts"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
    /** Mark handed over (admin Today, §9.3); e-mail 18 goes at 10:00 the day after (§8.1). */
    handedOverAt: timestamp("handed_over_at", { withTimezone: true }),
    /** Raised by every saved change: a save from an out-of-date page changes nothing (§6.4, §9.7). */
    version: integer("version").notNull().default(1),
    /** A size-up payment is going through (§6.4): nothing else can change until it finishes or the lock lapses. */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    /** A move paid for with a size-up (§6.4): the new day held for 20 minutes, owned by the order (§11.6). */
    holdDate: date("hold_date"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** Cancelled (§6.6, §9.5): when, and what was decided then — by whom, the tier and the refund (CancelledView). */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellation: jsonb("cancellation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("order_kind", sql`${t.kind} in ('catalogue', 'manual')`),
    check(
      "order_status",
      sql`${t.status} in ('confirmed', 'completed', 'cancelled', 'refunded')`,
    ),
    check("order_handover", sql`${t.handover} in ('delivery', 'collection')`),
    index("order_date").on(t.date, t.status),
  ],
);

/** One cake of an order, copied from the snapshot: what was bought, at what price, with which allergens. */
export const orderLines = pgTable(
  "order_lines",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sizeLine: text("size_line").notNull(),
    flavour: text("flavour").notNull().default(""),
    options: text("options").notNull().default(""),
    /** The inscription; null when the cake offers none. */
    message: text("message"),
    /** The line price paid (§11 Line price paid), from the snapshot. */
    pricePence: integer("price_pence").notNull(),
    allergenText: text("allergen_text").notNull(),
    allergenKeys: jsonb("allergen_keys").notNull(),
    /** The size and what was paid for it (§11.6 “Line price paid”, updated with every size change); null on lines
     *  made before slice 6.2b, which Change your order finds by the serves in `size_line`. */
    sizeId: integer("size_id"),
    sizePricePence: integer("size_price_pence"),
    /** The option answers ({ picks, texts }, §5.8), for changing the options (§6.4). */
    answers: jsonb("answers"),
  },
  (t) => [index("order_line_order").on(t.orderId, t.position)],
);

/**
 * The send log and queue (§8.4): one row per e-mail ever asked for. `key` is its never-twice key (e.g.
 * “order:12:1:12”), so the same e-mail for the same event is queued once only. The template and its data are
 * kept, not the HTML: every attempt renders again, so time-dependent copy is current. In development and on
 * previews nothing leaves the site: `transport` = “outbox”, and /dev/mail shows the rendered e-mail.
 */
export const mailSends = pgTable(
  "mail_sends",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    template: text("template").notNull(),
    data: jsonb("data").notNull(),
    to: text("to").notNull(),
    replyTo: text("reply_to"),
    stream: text("stream").notNull().default("transactional"),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastError: text("last_error"),
    transport: text("transport"),
    providerId: text("provider_id"),
    subject: text("subject"),
    /** The attachments' file names (e-mail 1's legal PDFs); their bytes come from `legal_pdfs`. */
    attachments: jsonb("attachments"),
    html: text("html"),
    text: text("text"),
    /** Extra headers it was sent with (e-mail 5: List-Unsubscribe, §8.4). */
    headers: jsonb("headers"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "mail_status",
      sql`${t.status} in ('queued', 'sent', 'failed', 'failed-too-late')`,
    ),
    check("mail_stream", sql`${t.stream} in ('transactional', 'broadcast')`),
    index("mail_due").on(t.status, t.nextAttemptAt),
  ],
);

/**
 * The Terms and Cancellations PDFs of e-mail 1 (§8.1 Durable record): one per legal revision and business-facts
 * version, so a resend attaches the same file. Stored base64.
 */
export const legalPdfs = pgTable(
  "legal_pdfs",
  {
    revisionId: integer("revision_id").notNull(),
    factsHash: text("facts_hash").notNull(),
    fileName: text("file_name").notNull(),
    base64: text("base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.revisionId, t.factsHash] })],
);

/** Each daily job once per London day (§12): marked done only when it has completed; a missed one runs again. */
export const jobRuns = pgTable(
  "job_runs",
  {
    job: text("job").notNull(),
    day: date("day").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.job, t.day] })],
);

/**
 * Settings → Emails (§11.5): the switches of 3, 3b, 4, 5 and 18, the sign-off, e-mail 5's note, and the Google
 * Place ID the review links need (§11.4). One row. Each switch keeps when it was last turned on, so switching it
 * back on sends nothing late (§8.1 e-mail 5).
 */
export const mailSettings = pgTable("mail_settings", {
  id: integer("id").primaryKey().default(1),
  onTheDay: boolean("on_the_day").notNull().default(true),
  collectionDay: boolean("collection_day").notNull().default(true),
  dailyList: boolean("daily_list").notNull().default(true),
  yearLater: boolean("year_later").notNull().default(true),
  yearLaterSince: timestamp("year_later_since", { withTimezone: true })
    .notNull()
    .defaultNow(),
  thankYou: boolean("thank_you").notNull().default(true),
  signOff: text("sign_off").notNull().default("Linda"),
  yearNote: text("year_note").notNull(),
  googlePlaceId: text("google_place_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One unsubscribe link per e-mail address (§10.5: never expires). The address is kept only as its hash. */
export const mailAddresses = pgTable("mail_addresses", {
  emailHash: text("email_hash").primaryKey(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Consent per address (§10.10 Marketing consent, §6.10): every explicit event with its time and wording; the latest
 * wins. list = “yearly” (e-mail 5) or “thanks” (e-mail 18). The tick at an order counts from the order itself
 * (orders.marketing_opt_in at confirmed_at), so only unsubscribes, complaints, deletions and Turn emails back on
 * are rows here; a hashed address keeps its “out” after the customer is deleted.
 */
export const consentEvents = pgTable(
  "consent_events",
  {
    id: serial("id").primaryKey(),
    emailHash: text("email_hash").notNull(),
    list: text("list").notNull(),
    kind: text("kind").notNull(),
    reason: text("reason").notNull(),
    wording: text("wording"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("consent_list", sql`${t.list} in ('yearly', 'thanks')`),
    check("consent_kind", sql`${t.kind} in ('in', 'out')`),
    index("consent_latest").on(t.emailHash, t.list, t.at),
  ],
);

/**
 * Answers to a status link's second check (§6.1): 5 wrong on one link within 15 minutes lock it for 15 minutes;
 * at most 20 wrong per connection per hour across all links. The connection is a salted hash (§10.10).
 */
export const linkChecks = pgTable(
  "link_checks",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    connection: text("connection").notNull(),
    ok: boolean("ok").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("link_checks_order").on(t.orderId, t.at),
    index("link_checks_connection").on(t.connection, t.at),
  ],
);

/**
 * A saved change to an order (§6.4, §9.7): who made it, what changed (old → new, as e-mail 12 shows it) and the money.
 * E-mail 12 is rendered from this record, never from today's order (§8.4 Send again).
 */
export const orderChanges = pgTable(
  "order_changes",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    by: text("by").notNull(),
    /** [what, before, after] rows, e.g. ["Message", "“Happy 30th”", "“Happy 30th, Mairi”"]. */
    changes: jsonb("changes").notNull(),
    moneyKind: text("money_kind").notNull().default("none"),
    moneyPence: integer("money_pence").notNull().default(0),
    newTotalPence: integer("new_total_pence").notNull(),
    /** saved · pending (a size-up waiting for its payment, §6.4) · dropped (the payment never came). */
    status: text("status").notNull().default("saved"),
    /** A pending change: what to apply once paid, on top of the order at this version. */
    payload: jsonb("payload"),
    baseVersion: integer("base_version"),
    paymentIntentId: text("payment_intent_id").unique(),
    /** What Stripe took for this change (net paid counts it, §10.6). */
    paidPence: integer("paid_pence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("change_by", sql`${t.by} in ('customer', 'linda')`),
    check(
      "change_money",
      sql`${t.moneyKind} in ('none', 'up', 'down', 'owed')`,
    ),
    index("order_changes_order").on(t.orderId, t.createdAt),
  ],
);

/**
 * Money back to the customer (§10.6): one row per Stripe refund, with what it was for (a change, a cancellation, an
 * excess payment). A failed call stays here as `failed` for Linda's Try again (§9.x) and raises an alert (§8.3).
 */
/**
 * Delivery attempts (§6.8): one row per attempt once something happens on it. Without a row the first attempt is the
 * order's own date and window. Nobody was in gives the attempt its delivery token (`/delivery/[token]`) and the day
 * it was recorded — “today” and “tomorrow” count from that day; the customer's choice is final.
 */
export const deliveryAttempts = pgTable(
  "delivery_attempts",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** 1 = the order's date; 2 = a redelivery. */
    attempt: integer("attempt").notNull(),
    day: date("day").notNull(),
    deliveryWindow: text("delivery_window"),
    outcome: text("outcome").notNull().default("none"),
    recordedOn: date("recorded_on"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }),
    token: text("token").unique(),
    choice: text("choice").notNull().default("none"),
    chosenAt: timestamp("chosen_at", { withTimezone: true }),
    /** Collect: the day it is collected (the recorded day, or the next before 12 noon after 18:00). */
    collectDay: date("collect_day"),
    /** Redeliver (§6.8): the window asked for while its fee is being paid, the fee, its payment and what Stripe took.
     *  A fee is never part of net paid (§10.6). */
    pendingWindow: text("pending_window"),
    feePence: integer("fee_pence"),
    paymentIntentId: text("payment_intent_id").unique(),
    feePaidPence: integer("fee_paid_pence").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("delivery_attempt_order").on(t.orderId, t.attempt),
    check(
      "delivery_outcome",
      sql`${t.outcome} in ('none', 'nobody-in', 'handed-over')`,
    ),
    check(
      "delivery_choice",
      sql`${t.choice} in ('none', 'collect', 'redeliver')`,
    ),
  ],
);

/** Message Linda (§6.5): what the customer wrote from the status link, kept on the order (admin Order detail →
 *  Messages, 9.x). One per form key, so a repeated press is one message (§10.8). */
export const orderMessages = pgTable(
  "order_messages",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    formKey: uuid("form_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_messages_order").on(t.orderId, t.createdAt),
    uniqueIndex("order_messages_key").on(t.orderId, t.formKey),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    changeId: integer("change_id"),
    kind: text("kind").notNull(),
    amountPence: integer("amount_pence").notNull(),
    paymentIntentId: text("payment_intent_id").notNull(),
    stripeRefundId: text("stripe_refund_id"),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "refund_kind",
      sql`${t.kind} in ('change', 'cancel', 'excess', 'goodwill', 'fee')`,
    ),
    check(
      "refund_status",
      sql`${t.status} in ('pending', 'succeeded', 'failed')`,
    ),
    index("refunds_order").on(t.orderId),
  ],
);
