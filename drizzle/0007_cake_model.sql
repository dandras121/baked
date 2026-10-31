CREATE TABLE "cake_card_videos" (
	"cake_id" integer PRIMARY KEY NOT NULL,
	"path_1080" text NOT NULL,
	"path_1440" text NOT NULL,
	"still_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cake_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"cake_id" integer NOT NULL,
	"kind" text NOT NULL,
	"position" integer NOT NULL,
	"path" text NOT NULL,
	"poster_path" text,
	"alt_text" text DEFAULT '' NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	CONSTRAINT "media_kind" CHECK ("cake_media"."kind" in ('photo', 'video')),
	CONSTRAINT "media_focal" CHECK ("cake_media"."focal_x" between 0 and 1 and "cake_media"."focal_y" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "cake_option_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"option_id" integer NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"price_pence" integer DEFAULT 0 NOT NULL,
	"allergens" text[] DEFAULT '{}'::text[] NOT NULL,
	"gluten_kinds" text DEFAULT '' NOT NULL,
	"nut_kinds" text DEFAULT '' NOT NULL,
	"also_contains" text DEFAULT '' NOT NULL,
	CONSTRAINT "choice_label_length" CHECK (char_length("cake_option_choices"."label") between 1 and 40),
	CONSTRAINT "choice_price_range" CHECK ("cake_option_choices"."price_pence" between 0 and 100000),
	CONSTRAINT "choice_allergen_keys" CHECK ("cake_option_choices"."allergens" <@ array['celery','cereals containing gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','nuts','peanuts','sesame','soya','sulphites']::text[]),
	CONSTRAINT "choice_gluten_named" CHECK (not ('cereals containing gluten' = any("cake_option_choices"."allergens")) or char_length(trim("cake_option_choices"."gluten_kinds")) > 0),
	CONSTRAINT "choice_nuts_named" CHECK (not ('nuts' = any("cake_option_choices"."allergens")) or char_length(trim("cake_option_choices"."nut_kinds")) > 0)
);
--> statement-breakpoint
CREATE TABLE "cake_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"cake_id" integer NOT NULL,
	"position" integer NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"help" text DEFAULT '' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"min_picks" integer DEFAULT 0 NOT NULL,
	"max_picks" integer DEFAULT 10 NOT NULL,
	"max_length" integer DEFAULT 40 NOT NULL,
	CONSTRAINT "option_type" CHECK ("cake_options"."type" in ('choice', 'choices', 'text', 'yesno')),
	CONSTRAINT "option_label_length" CHECK (char_length("cake_options"."label") between 1 and 40),
	CONSTRAINT "option_help_length" CHECK (char_length("cake_options"."help") <= 120),
	CONSTRAINT "option_picks" CHECK ("cake_options"."min_picks" between 0 and 10 and "cake_options"."max_picks" between 0 and 10 and "cake_options"."min_picks" <= "cake_options"."max_picks"),
	CONSTRAINT "option_max_length" CHECK ("cake_options"."max_length" between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "allergens" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "gluten_kinds" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "nut_kinds" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "also_contains" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "categories" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "cakes" ADD COLUMN "offer_inscription" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cake_card_videos" ADD CONSTRAINT "cake_card_videos_cake_id_cakes_id_fk" FOREIGN KEY ("cake_id") REFERENCES "public"."cakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cake_media" ADD CONSTRAINT "cake_media_cake_id_cakes_id_fk" FOREIGN KEY ("cake_id") REFERENCES "public"."cakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cake_option_choices" ADD CONSTRAINT "cake_option_choices_option_id_cake_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."cake_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cake_options" ADD CONSTRAINT "cake_options_cake_id_cakes_id_fk" FOREIGN KEY ("cake_id") REFERENCES "public"."cakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_cake" ON "cake_media" USING btree ("cake_id","position");--> statement-breakpoint
CREATE INDEX "choice_option" ON "cake_option_choices" USING btree ("option_id","position");--> statement-breakpoint
CREATE INDEX "option_cake" ON "cake_options" USING btree ("cake_id","position");--> statement-breakpoint
ALTER TABLE "cakes" ADD CONSTRAINT "cake_allergen_keys" CHECK ("cakes"."allergens" <@ array['celery','cereals containing gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','nuts','peanuts','sesame','soya','sulphites']::text[]);--> statement-breakpoint
ALTER TABLE "cakes" ADD CONSTRAINT "cake_gluten_named" CHECK (not ('cereals containing gluten' = any("cakes"."allergens")) or char_length(trim("cakes"."gluten_kinds")) > 0);--> statement-breakpoint
ALTER TABLE "cakes" ADD CONSTRAINT "cake_nuts_named" CHECK (not ('nuts' = any("cakes"."allergens")) or char_length(trim("cakes"."nut_kinds")) > 0);--> statement-breakpoint
ALTER TABLE "cakes" ADD CONSTRAINT "cake_also_contains_length" CHECK (char_length("cakes"."also_contains") <= 120);--> statement-breakpoint
ALTER TABLE "cakes" ADD CONSTRAINT "cake_category_keys" CHECK ("cakes"."categories" <@ array['birthdays','kids','weddings','corporate']::text[]);