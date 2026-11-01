ALTER TABLE "drafts" ADD COLUMN "handover" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "town" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "postcode" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "delivery_window" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "draft_handover" CHECK ("drafts"."handover" is null or "drafts"."handover" in ('delivery', 'collection'));--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "draft_window" CHECK ("drafts"."delivery_window" is null or "drafts"."delivery_window" in ('morning', 'afternoon', 'evening'));