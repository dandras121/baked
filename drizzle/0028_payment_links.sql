CREATE TABLE "payment_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"token" text NOT NULL,
	"purpose" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payment_intent_id" text,
	"paid_pence" integer DEFAULT 0 NOT NULL,
	"sent_on" date NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_token_unique" UNIQUE("token"),
	CONSTRAINT "payment_links_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "payment_link_purpose" CHECK ("payment_links"."purpose" in ('deposit', 'rest', 'difference')),
	CONSTRAINT "payment_link_status" CHECK ("payment_links"."status" in ('open', 'paid', 'withdrawn')),
	CONSTRAINT "payment_link_amount" CHECK ("payment_links"."amount_pence" >= 30)
);
--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_links_order" ON "payment_links" USING btree ("order_id");