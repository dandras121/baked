CREATE TABLE "stored_files" (
	"key" text PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"form_key" uuid NOT NULL,
	"name" text NOT NULL,
	"file_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"enquiry_id" integer,
	"attached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_purpose" CHECK ("uploads"."purpose" in ('enquiry', 'complaint'))
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_enquiry_id_enquiries_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_form" ON "uploads" USING btree ("form_key");--> statement-breakpoint
CREATE INDEX "uploads_enquiry" ON "uploads" USING btree ("enquiry_id");