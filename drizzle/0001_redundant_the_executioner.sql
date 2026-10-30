CREATE TABLE "cake_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"cake_id" integer NOT NULL,
	"serves" integer NOT NULL,
	"tiers" integer NOT NULL,
	"price_pence" integer NOT NULL,
	CONSTRAINT "cake_size_serves_unique" UNIQUE("cake_id","serves"),
	CONSTRAINT "size_serves_range" CHECK ("cake_sizes"."serves" between 1 and 500),
	CONSTRAINT "size_tiers_positive" CHECK ("cake_sizes"."tiers" >= 1),
	CONSTRAINT "size_price_range" CHECK ("cake_sizes"."price_pence" between 100 and 500000)
);
--> statement-breakpoint
CREATE TABLE "cakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"what_it_is" text DEFAULT '' NOT NULL,
	"flavour" text NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cakes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "cake_name_length" CHECK (char_length("cakes"."name") between 2 and 60),
	CONSTRAINT "cake_flavour_length" CHECK (char_length("cakes"."flavour") between 1 and 60),
	CONSTRAINT "cake_what_it_is_length" CHECK (char_length("cakes"."what_it_is") <= 300)
);
--> statement-breakpoint
CREATE TABLE "gallery_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"image_path" text,
	"showing" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"home_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caption_length" CHECK (char_length("gallery_photos"."caption") <= 80),
	CONSTRAINT "home_order_range" CHECK ("gallery_photos"."home_order" between 1 and 4)
);
--> statement-breakpoint
ALTER TABLE "cake_sizes" ADD CONSTRAINT "cake_sizes_cake_id_cakes_id_fk" FOREIGN KEY ("cake_id") REFERENCES "public"."cakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cake_name_unique_live" ON "cakes" USING btree (lower("name")) WHERE "cakes"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "cake_position" ON "cakes" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "home_order_unique" ON "gallery_photos" USING btree ("home_order") WHERE "gallery_photos"."home_order" is not null;