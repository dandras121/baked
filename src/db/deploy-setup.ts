// Runs before every hosted build (vercel.json): creates or updates the tables and adds the starting
// Settings once. Nothing happens where no DATABASE_URL is configured. It never re-seeds: Settings saved
// in the admin and every order stay as they are.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { ensureSettings } from "./settings-repo";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("deploy-setup: no DATABASE_URL, skipped");
    return;
  }
  const { db, close } = connect();
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const added = await ensureSettings(db, INITIAL_SETTINGS);
    console.log(
      added
        ? "deploy-setup: tables ready, starting Settings added"
        : "deploy-setup: tables ready, Settings kept",
    );
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
