CREATE TABLE "closed_days" (
	"day" date PRIMARY KEY NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"trading_name" text NOT NULL,
	"legal_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"address_line" text NOT NULL,
	"postcode" text NOT NULL,
	"town" text NOT NULL,
	"council" text NOT NULL,
	"hygiene_rating" text NOT NULL,
	"instagram" jsonb NOT NULL,
	"facebook" jsonb NOT NULL,
	"delivery_area" text NOT NULL,
	"postcode_districts" text NOT NULL,
	"beyond_the_area" text NOT NULL,
	"delivery_charge_pence" integer NOT NULL,
	"second_attempt_fee_pence" integer NOT NULL,
	"bespoke_minimum_pence" integer NOT NULL,
	"kitchen_handles" text[] NOT NULL,
	"daily_cap" integer NOT NULL,
	"weekly_cap" integer NOT NULL,
	"lead_time_days" integer NOT NULL,
	"bespoke_lead_time_weeks" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "lead_time_range" CHECK ("settings"."lead_time_days" between 3 and 60),
	CONSTRAINT "bespoke_lead_time_range" CHECK ("settings"."bespoke_lead_time_weeks" between 1 and 26),
	CONSTRAINT "delivery_charge_not_negative" CHECK ("settings"."delivery_charge_pence" >= 0),
	CONSTRAINT "second_attempt_fee_rule" CHECK ("settings"."second_attempt_fee_pence" = 0 or "settings"."second_attempt_fee_pence" >= 30),
	CONSTRAINT "bespoke_minimum_range" CHECK ("settings"."bespoke_minimum_pence" between 100 and 500000),
	CONSTRAINT "caps_positive" CHECK ("settings"."daily_cap" >= 0 and "settings"."weekly_cap" >= 0)
);
