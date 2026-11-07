CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"change_id" integer,
	"kind" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"payment_intent_id" text NOT NULL,
	"stripe_refund_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_kind" CHECK ("refunds"."kind" in ('change', 'cancel', 'excess', 'goodwill')),
	CONSTRAINT "refund_status" CHECK ("refunds"."status" in ('pending', 'succeeded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "size_id" integer;--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "size_price_pence" integer;--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refunds_order" ON "refunds" USING btree ("order_id");