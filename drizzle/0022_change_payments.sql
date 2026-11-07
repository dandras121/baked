ALTER TABLE "order_changes" ADD COLUMN "status" text DEFAULT 'saved' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_changes" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "order_changes" ADD COLUMN "base_version" integer;--> statement-breakpoint
ALTER TABLE "order_changes" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "order_changes" ADD COLUMN "paid_pence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_payment_intent_id_unique" UNIQUE("payment_intent_id");