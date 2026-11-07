CREATE TABLE "consent_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_hash" text NOT NULL,
	"list" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text NOT NULL,
	"wording" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_list" CHECK ("consent_events"."list" in ('yearly', 'thanks')),
	CONSTRAINT "consent_kind" CHECK ("consent_events"."kind" in ('in', 'out'))
);
--> statement-breakpoint
CREATE TABLE "mail_addresses" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_addresses_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "mail_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"on_the_day" boolean DEFAULT true NOT NULL,
	"collection_day" boolean DEFAULT true NOT NULL,
	"daily_list" boolean DEFAULT true NOT NULL,
	"year_later" boolean DEFAULT true NOT NULL,
	"year_later_since" timestamp with time zone DEFAULT now() NOT NULL,
	"thank_you" boolean DEFAULT true NOT NULL,
	"sign_off" text DEFAULT 'Linda' NOT NULL,
	"year_note" text NOT NULL,
	"google_place_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_sends" ADD COLUMN "headers" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "handed_over_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "consent_latest" ON "consent_events" USING btree ("email_hash","list","at");