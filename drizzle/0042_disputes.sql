CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_dispute_id" text NOT NULL,
	"payment_intent_id" text NOT NULL,
	"order_id" integer,
	"amount_pence" integer NOT NULL,
	"status" text NOT NULL,
	"respond_by" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "disputes_stripe_dispute_id_unique" UNIQUE("stripe_dispute_id")
);
--> statement-breakpoint
ALTER TABLE "refunds" DROP CONSTRAINT "refund_kind";--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "disputes_order" ON "disputes" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refund_kind" CHECK ("refunds"."kind" in ('change', 'cancel', 'excess', 'goodwill', 'fee', 'dispute'));