CREATE TABLE "link_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"connection" text NOT NULL,
	"ok" boolean NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link_checks" ADD CONSTRAINT "link_checks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_checks_order" ON "link_checks" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "link_checks_connection" ON "link_checks" USING btree ("connection","at");