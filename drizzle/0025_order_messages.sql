CREATE TABLE "order_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"body" text NOT NULL,
	"form_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_messages_order" ON "order_messages" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_messages_key" ON "order_messages" USING btree ("order_id","form_key");