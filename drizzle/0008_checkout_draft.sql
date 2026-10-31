CREATE TABLE "draft_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"cake_id" integer NOT NULL,
	"size_id" integer NOT NULL,
	"answers" jsonb DEFAULT '{"picks":{},"texts":{}}'::jsonb NOT NULL,
	"inscription" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_inscription_length" CHECK (char_length("draft_lines"."inscription") <= 48)
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"furthest_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_status" CHECK ("drafts"."status" in ('draft', 'pending', 'confirmed', 'abandoned')),
	CONSTRAINT "draft_step" CHECK ("drafts"."furthest_step" between 1 and 4)
);
--> statement-breakpoint
ALTER TABLE "draft_lines" ADD CONSTRAINT "draft_lines_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_lines" ADD CONSTRAINT "draft_lines_cake_id_cakes_id_fk" FOREIGN KEY ("cake_id") REFERENCES "public"."cakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_lines" ADD CONSTRAINT "draft_lines_size_id_cake_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."cake_sizes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_draft" ON "draft_lines" USING btree ("draft_id","position");--> statement-breakpoint
CREATE INDEX "draft_activity" ON "drafts" USING btree ("last_activity_at");