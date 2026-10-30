// One command re-seeds the development database (CLAUDE.md §7): `pnpm db:seed`.
// Slice 0.6 seeds the Settings; 2.3 the five Home cakes; the full Figma catalogue (3.1), orders (4.6) and
// the rest join as their tables arrive.
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { cakeSizes, cakes, closedDays, galleryPhotos } from "./schema";
import { writeSettings } from "./settings-repo";

/** "Bramble & Cream" → "bramble-and-cream". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Db = ReturnType<typeof connect>["db"];

/** The five Home sample cakes (2.3); also used on an empty preview database (deploy-setup). */
export async function insertSampleCakes(db: Db) {
  const names = [
    "The Lothian",
    "Bramble & Cream",
    "Wee Beastie",
    "Sugar Peony",
    "Confetti Drum",
  ];
  const rows = await db
    .insert(cakes)
    .values(
      names.map((name, i) => ({
        slug: slugify(name),
        name,
        flavour: "Vanilla sponge, raspberry conserve, Scottish butter icing",
        visible: true,
        position: i + 1,
      })),
    )
    .returning({ id: cakes.id });
  await db.insert(cakeSizes).values(
    rows.map((r) => ({
      cakeId: r.id,
      serves: 24,
      tiers: 2,
      pricePence: 18500,
    })),
  );
}

export async function seed(url?: string) {
  const { db, close } = connect(url);
  try {
    await writeSettings(db, INITIAL_SETTINGS);
    await db.delete(closedDays);
    // The drawn sample: 21–22 Sep closed (§11.2 demo value).
    await db
      .insert(closedDays)
      .values([{ day: "2026-09-21" }, { day: "2026-09-22" }]);
    // The Home row (2.3): the five names drawn on Home (518:2687); every card carries the one drawn sample
    // (flavour, two tiers, serves 24, £185) — Bohoka 2026-10-30: "Lothian-minta, más névvel".
    await db.delete(galleryPhotos);
    await db.delete(cakes);
    await insertSampleCakes(db);
  } finally {
    await close();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(() => console.log("Seeded: settings, closed days, Home cakes"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
