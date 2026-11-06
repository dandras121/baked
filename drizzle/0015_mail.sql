CREATE TABLE "mail_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"template" text NOT NULL,
	"data" jsonb NOT NULL,
	"to" text NOT NULL,
	"reply_to" text,
	"stream" text DEFAULT 'transactional' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"transport" text,
	"provider_id" text,
	"subject" text,
	"html" text,
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "mail_sends_key_unique" UNIQUE("key"),
	CONSTRAINT "mail_status" CHECK ("mail_sends"."status" in ('queued', 'sent', 'failed', 'failed-too-late')),
	CONSTRAINT "mail_stream" CHECK ("mail_sends"."stream" in ('transactional', 'broadcast'))
);
--> statement-breakpoint
CREATE INDEX "mail_due" ON "mail_sends" USING btree ("status","next_attempt_at");