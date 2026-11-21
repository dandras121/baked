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

type Connection = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  close: () => Promise<void>;
};

/** Inside the running site one pool is kept and shared by every request, so a page does not pay for a new
 *  connection (TCP and TLS to the database) each time; idle connections close after 20 s. */
let shared: Connection | null = null;

export function connect(url = databaseUrl()): Connection {
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  // In the Next.js server (not in scripts or tests, which open and close their own) reuse one pool.
  if (process.env.NEXT_RUNTIME === "nodejs" && url === databaseUrl()) {
    if (!shared) {
      const client = postgres(url, {
        // A page reads several things side by side; 10 lets them run at once.
        max: 10,
        prepare: false,
        idle_timeout: 20,
        onnotice: () => {},
      });
      shared = { db: drizzle(client, { schema }), close: async () => {} };
    }
    return shared;
  }
  // prepare: false — hosted poolers (Neon's pgbouncer) do not keep prepared statements between calls.
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
