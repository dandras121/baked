ALTER TABLE "payment_alerts" ADD COLUMN "amount_pence" integer;--> statement-breakpoint
ALTER TABLE "payment_alerts" ADD COLUMN "dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_alerts" ADD COLUMN "dismissed_by" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "idempotency_key" text;