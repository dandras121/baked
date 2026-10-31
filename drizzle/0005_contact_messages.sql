CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_key" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"page" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_form_key" UNIQUE("form_key"),
	CONSTRAINT "contact_message_length" CHECK (char_length("contact_messages"."message") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "form_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"form" text NOT NULL,
	"connection" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_created" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "form_sends_lookup" ON "form_sends" USING btree ("form","connection","at");