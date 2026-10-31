CREATE TABLE "google_rating" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"rating_tenths" integer NOT NULL,
	"review_count" integer NOT NULL,
	"reviews_url" text,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rating_single_row" CHECK ("google_rating"."id" = 1),
	CONSTRAINT "rating_range" CHECK ("google_rating"."rating_tenths" between 10 and 50),
	CONSTRAINT "review_count_positive" CHECK ("google_rating"."review_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "google_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"stars" integer NOT NULL,
	"reviewer_name" text NOT NULL,
	"text" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "review_stars_range" CHECK ("google_reviews"."stars" between 1 and 5)
);
--> statement-breakpoint
CREATE INDEX "review_newest" ON "google_reviews" USING btree ("created_at","id");