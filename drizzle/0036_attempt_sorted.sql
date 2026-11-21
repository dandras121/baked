ALTER TABLE "delivery_attempts" ADD COLUMN "sorted_by" text;--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD COLUMN "fee_refund_due" boolean DEFAULT false NOT NULL;