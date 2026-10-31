// Runs before every hosted build (vercel.json): creates or updates the tables and adds the starting
// Settings once. Nothing happens where no DATABASE_URL is configured. It never re-seeds: Settings saved
// in the admin and every order stay as they are.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect, databaseUrl } from "./client";
import { cakes, googleReviews } from "./schema";
import { importSampleReviews, insertSampleCakes } from "./seed";
import { ensureSettings } from "./settings-repo";

async function main() {
  if (!databaseUrl()) {
    console.log(
      "deploy-setup: no database address (DATABASE_URL / POSTGRES_URL), skipped",
    );
    return;
  }
  const { db, close } = connect();
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const added = await ensureSettings(db, INITIAL_SETTINGS);
    // Previews only: an empty catalogue gets the five Home sample cakes, so the Home row can be checked.
    // Never on the live site (launch: production gets its own database, PROGRESS “Later”).
    if (process.env.VERCEL_ENV === "preview") {
      const [any] = await db.select({ id: cakes.id }).from(cakes).limit(1);
      if (!any) {
        await insertSampleCakes(db);
        console.log("deploy-setup: preview sample cakes added");
      }
      const [review] = await db
        .select({ id: googleReviews.id })
        .from(googleReviews)
        .limit(1);
      if (!review) {
        await importSampleReviews(db);
        console.log("deploy-setup: preview sample reviews added");
      }
    }
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
