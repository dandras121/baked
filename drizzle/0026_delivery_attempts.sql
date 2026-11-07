CREATE TABLE "delivery_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"attempt" integer NOT NULL,
	"day" date NOT NULL,
	"delivery_window" text,
	"outcome" text DEFAULT 'none' NOT NULL,
	"recorded_on" date,
	"recorded_at" timestamp with time zone,
	"token" text,
	"choice" text DEFAULT 'none' NOT NULL,
	"chosen_at" timestamp with time zone,
	"collect_day" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_attempts_token_unique" UNIQUE("token"),
	CONSTRAINT "delivery_outcome" CHECK ("delivery_attempts"."outcome" in ('none', 'nobody-in', 'handed-over')),
	CONSTRAINT "delivery_choice" CHECK ("delivery_attempts"."choice" in ('none', 'collect', 'redeliver'))
);
--> statement-breakpoint
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_attempt_order" ON "delivery_attempts" USING btree ("order_id","attempt");