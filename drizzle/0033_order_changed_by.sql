ALTER TABLE "orders" ADD COLUMN "changed_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "changed_at" timestamp with time zone;