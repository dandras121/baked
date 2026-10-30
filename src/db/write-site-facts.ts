// Writes public/site-facts.json before every build: the phone and e-mail the 500 page shows
// (SITE-FLOWS §4.7: a static page with the last saved Settings, no database call when it is shown).
// Rebuilt with every deploy; saving Settings in the admin will trigger a rebuild (slice 9.x).
import { writeFileSync } from "node:fs";
import { connect, databaseUrl } from "./client";
import { readSettings } from "./settings-repo";

async function main() {
  let facts: { email?: string; phone?: string } = {};
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      const s = await readSettings(db);
      facts = { email: s.email, phone: s.phone };
    } finally {
      await close();
    }
  }
  writeFileSync("public/site-facts.json", JSON.stringify(facts));
  console.log(`site-facts: ${facts.phone ? "written" : "no database, empty"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
