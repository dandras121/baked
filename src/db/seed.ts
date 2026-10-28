// One command re-seeds the development database (CLAUDE.md §7): `pnpm db:seed`.
// Slice 0.6 seeds the Settings; the Figma cakes (3.1), orders (4.6) and the rest join as their tables arrive.
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { closedDays } from "./schema";
import { writeSettings } from "./settings-repo";

export async function seed(url?: string) {
  const { db, close } = connect(url);
  try {
    await writeSettings(db, INITIAL_SETTINGS);
    await db.delete(closedDays);
    // The drawn sample: 21–22 Sep closed (§11.2 demo value).
    await db
      .insert(closedDays)
      .values([{ day: "2026-09-21" }, { day: "2026-09-22" }]);
  } finally {
    await close();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(() => console.log("Seeded: settings, closed days"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
