import { like } from "drizzle-orm";
import { connect, databaseUrl } from "../src/db/client";
import { orders } from "../src/db/schema";

/**
 * Before a run: the orders earlier runs left behind (numbers BBL-E2E-…) are removed, so they never fill the daily
 * and weekly caps that later date tests depend on. Only test data has that prefix.
 */
export default async function globalSetup() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // CI sets the variables directly.
  }
  if (!databaseUrl()) return;
  const { db, close } = connect();
  try {
    await db.delete(orders).where(like(orders.number, "BBL-E2E-%"));
  } finally {
    await close();
  }
}
