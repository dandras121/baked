CREATE TABLE "legal_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"intro" text NOT NULL,
	"body" text NOT NULL,
	"updated_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "legal_slug_newest" ON "legal_revisions" USING btree ("slug","created_at");