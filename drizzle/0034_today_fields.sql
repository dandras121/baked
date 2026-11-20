ALTER TABLE "orders" ADD COLUMN "collection_time" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "check_day" boolean DEFAULT false NOT NULL;