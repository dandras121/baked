// The database connection. DATABASE_URL comes from the environment (.env.local in development, never in git).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function connect(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  // prepare: false — hosted poolers (Neon's pgbouncer) do not keep prepared statements between calls.
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
