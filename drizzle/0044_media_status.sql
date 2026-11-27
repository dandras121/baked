ALTER TABLE "cake_media" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "cake_media" ADD COLUMN "problem" text;--> statement-breakpoint
ALTER TABLE "cake_media" ADD CONSTRAINT "media_status" CHECK ("cake_media"."status" in ('ready', 'preparing', 'failed'));