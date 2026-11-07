ALTER TABLE "orders" ADD COLUMN "hold_date" date;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "hold_expires_at" timestamp with time zone;