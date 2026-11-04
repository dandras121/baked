ALTER TABLE "drafts" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "phone_e164" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "cake_for" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "allergy_note" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "allergy_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "allergy_consent_wording" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "terms_revision_id" integer;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "cancellations_revision_id" integer;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "marketing_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "marketing_wording" text;