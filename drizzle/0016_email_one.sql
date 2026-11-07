CREATE TABLE "legal_pdfs" (
	"revision_id" integer NOT NULL,
	"facts_hash" text NOT NULL,
	"file_name" text NOT NULL,
	"base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_pdfs_revision_id_facts_hash_pk" PRIMARY KEY("revision_id","facts_hash")
);
--> statement-breakpoint
ALTER TABLE "mail_sends" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "flavour" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "facts" jsonb;