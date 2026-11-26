-- Sizes keep their id when edited (§9.13): checked when the save ends, so serves can be swapped in one save.
ALTER TABLE "cake_sizes" DROP CONSTRAINT "cake_size_serves_unique";--> statement-breakpoint
ALTER TABLE "cake_sizes" ADD CONSTRAINT "cake_size_serves_unique" UNIQUE ("cake_id", "serves") DEFERRABLE INITIALLY DEFERRED;
