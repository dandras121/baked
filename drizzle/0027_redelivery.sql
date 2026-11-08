ALTER TABLE "refunds" DROP CONSTRAINT "refund_kind";--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "pending_window" text;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "fee_pence" integer;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "fee_paid_pence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_payment_intent_id_unique" UNIQUE("payment_intent_id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refund_kind" CHECK ("refunds"."kind" in ('change', 'cancel', 'excess', 'goodwill', 'fee'));