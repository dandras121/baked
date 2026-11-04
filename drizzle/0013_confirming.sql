CREATE TABLE "payment_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payment_intent_id" text NOT NULL,
	"draft_id" uuid,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_alert_kind" CHECK ("payment_alerts"."kind" in ('check-payment', 'no-order', 'booked-after-hold'))
);
--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "amount_received_pence" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_alert_once" ON "payment_alerts" USING btree ("kind","payment_intent_id");