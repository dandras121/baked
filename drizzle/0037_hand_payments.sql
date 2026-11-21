CREATE TABLE "hand_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text DEFAULT 'payment' NOT NULL,
	"method" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"paid_on" date NOT NULL,
	"by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "hand_payment_kind" CHECK ("hand_payments"."kind" in ('payment', 'refund')),
	CONSTRAINT "hand_payment_method" CHECK ("hand_payments"."method" in ('cash', 'bank')),
	CONSTRAINT "hand_payment_amount" CHECK ("hand_payments"."amount_pence" > 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hand_payments" ADD CONSTRAINT "hand_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hand_payments_order" ON "hand_payments" USING btree ("order_id");