CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"token" text NOT NULL,
	"form_key" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"answers" jsonb NOT NULL,
	"with_gaps" boolean DEFAULT false NOT NULL,
	"call_me" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"inspired_photo_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_reference_unique" UNIQUE("reference"),
	CONSTRAINT "enquiries_token_unique" UNIQUE("token"),
	CONSTRAINT "enquiries_form_key_unique" UNIQUE("form_key"),
	CONSTRAINT "enquiry_status" CHECK ("enquiries"."status" in ('new', 'spam'))
);
--> statement-breakpoint
CREATE TABLE "reference_counters" (
	"kind" text NOT NULL,
	"year" integer NOT NULL,
	"last" integer NOT NULL,
	CONSTRAINT "reference_counters_kind_year_pk" PRIMARY KEY("kind","year")
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_inspired_photo_id_gallery_photos_id_fk" FOREIGN KEY ("inspired_photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiries_created" ON "enquiries" USING btree ("created_at");