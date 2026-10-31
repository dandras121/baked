// Runs before every hosted build (vercel.json): creates or updates the tables and adds the starting
// Settings once. Nothing happens where no DATABASE_URL is configured. It never re-seeds: Settings saved
// in the admin and every order stay as they are.
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect, databaseUrl } from "./client";
import { googleReviews } from "./schema";
import { ensureFaq } from "./faq-repo";
import { ensureLegalPages } from "./legal-repo";
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
    // The starting FAQ (§4.4) on every site, once; afterwards Linda's edits are kept.
    if (await ensureFaq(db)) console.log("deploy-setup: starting FAQ added");
    // The starting legal pages (§4.5) on every site, once per page; saved revisions are kept.
    const legal = await ensureLegalPages(db);
    if (legal) console.log(`deploy-setup: ${legal} starting legal pages added`);
    // Previews only: the Home sample cakes (missing ones added), so the Home row can be checked.
    // Never on the live site (launch: production gets its own database, PROGRESS “Later”).
    if (process.env.VERCEL_ENV === "preview") {
      await insertSampleCakes(db);
      console.log("deploy-setup: preview sample cakes in place");
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
