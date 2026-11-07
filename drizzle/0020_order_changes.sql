CREATE TABLE "order_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"by" text NOT NULL,
	"changes" jsonb NOT NULL,
	"money_kind" text DEFAULT 'none' NOT NULL,
	"money_pence" integer DEFAULT 0 NOT NULL,
	"new_total_pence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_by" CHECK ("order_changes"."by" in ('customer', 'linda')),
	CONSTRAINT "change_money" CHECK ("order_changes"."money_kind" in ('none', 'up', 'down', 'owed'))
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_changes" ADD CONSTRAINT "order_changes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_changes_order" ON "order_changes" USING btree ("order_id","created_at");