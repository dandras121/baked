ALTER TABLE "uploads" DROP CONSTRAINT "upload_purpose";--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "upload_purpose" CHECK ("uploads"."purpose" in ('enquiry', 'complaint', 'order'));