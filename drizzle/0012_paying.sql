ALTER TABLE "drafts" ADD COLUMN "payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "snapshot_amount_pence" integer;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "locked_at" timestamp with time zone;