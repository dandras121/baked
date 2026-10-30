// The database connection. DATABASE_URL comes from the environment (.env.local in development, never in git).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The database address. DATABASE_URL first; hosted integrations name it differently (Vercel's Neon and
 * Postgres integrations add POSTGRES_URL), so those names are accepted too.
 */
export function databaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    undefined
  );
}

export function connect(url = databaseUrl()) {
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  // prepare: false — hosted poolers (Neon's pgbouncer) do not keep prepared statements between calls.
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
