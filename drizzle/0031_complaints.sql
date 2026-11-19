CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"form_key" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"order_number" text,
	"order_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"body" text NOT NULL,
	"wanted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_reference_unique" UNIQUE("reference"),
	CONSTRAINT "complaints_form_key_unique" UNIQUE("form_key"),
	CONSTRAINT "complaint_status" CHECK ("complaints"."status" in ('new', 'spam'))
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "complaint_id" integer;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaints_order" ON "complaints" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_complaint" ON "uploads" USING btree ("complaint_id");