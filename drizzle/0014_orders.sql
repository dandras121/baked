CREATE TABLE "order_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"position" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"size_line" text NOT NULL,
	"options" text DEFAULT '' NOT NULL,
	"message" text,
	"price_pence" integer NOT NULL,
	"allergen_text" text NOT NULL,
	"allergen_keys" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"kind" text DEFAULT 'catalogue' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"draft_id" uuid,
	"token" text NOT NULL,
	"date" date NOT NULL,
	"earliest_date" date NOT NULL,
	"handover" text NOT NULL,
	"delivery_window" text,
	"address" text,
	"town" text,
	"postcode" text,
	"customer_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"phone_e164" text,
	"cake_for" text,
	"allergy_note" text,
	"consents" jsonb NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"delivery_charge_pence" integer DEFAULT 0 NOT NULL,
	"total_pence" integer NOT NULL,
	"amount_received_pence" integer NOT NULL,
	"payment_intent_id" text,
	"snapshot" jsonb NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_draft_id_unique" UNIQUE("draft_id"),
	CONSTRAINT "orders_token_unique" UNIQUE("token"),
	CONSTRAINT "orders_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "order_kind" CHECK ("orders"."kind" in ('catalogue', 'manual')),
	CONSTRAINT "order_status" CHECK ("orders"."status" in ('confirmed', 'completed', 'cancelled', 'refunded')),
	CONSTRAINT "order_handover" CHECK ("orders"."handover" in ('delivery', 'collection'))
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_line_order" ON "order_lines" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "order_date" ON "orders" USING btree ("date","status");