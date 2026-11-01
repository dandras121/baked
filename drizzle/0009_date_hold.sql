ALTER TABLE "drafts" ADD COLUMN "hold_date" date;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "hold_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "hold_extensions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "hold_connection" text;--> statement-breakpoint
CREATE INDEX "draft_hold" ON "drafts" USING btree ("hold_date","hold_expires_at");--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "draft_hold_extensions" CHECK ("drafts"."hold_extensions" between 0 and 2);