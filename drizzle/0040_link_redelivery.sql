ALTER TABLE "payment_links" DROP CONSTRAINT "payment_link_purpose";--> statement-breakpoint
ALTER TABLE "payment_links" ADD COLUMN "attempt_id" integer;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_attempt_id_delivery_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."delivery_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_link_purpose" CHECK ("payment_links"."purpose" in ('deposit', 'rest', 'difference', 'redelivery'));