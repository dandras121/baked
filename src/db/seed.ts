// One command re-seeds the development database (CLAUDE.md §7): `pnpm db:seed`.
// Slice 0.6 seeds the Settings; 2.3 the five Home cakes; the full Figma catalogue (3.1), orders (4.6) and
// the rest join as their tables arrive.
import type { ApiReviewPage } from "@/lib/reviews";
import { INITIAL_SETTINGS } from "@/lib/settings";
import fixture from "./fixtures/google-reviews.json";
import { ensureSampleCatalogue } from "./cake-repo";
import { ensureFaq } from "./faq-repo";
import { ensureSampleGallery } from "./gallery-repo";
import { ensureLegalPages } from "./legal-repo";
import { importReviews } from "./reviews-repo";
import { connect } from "./client";
import {
  cakes,
  closedDays,
  faqQuestions,
  galleryPhotos,
  legalRevisions,
} from "./schema";
import { writeSettings } from "./settings-repo";

export { slugify } from "@/lib/slug";

type Db = ReturnType<typeof connect>["db"];

/** Linda's Google reviews from the fixture (Business Profile API shape); development and previews only. */
export async function importSampleReviews(db: Db) {
  await importReviews(db, fixture as ApiReviewPage, SAMPLE_REVIEWS_URL);
}

/** A Google Maps search for the business, until Linda's profile link exists (§14.1). */
export const SAMPLE_REVIEWS_URL =
  "https://www.google.com/maps/search/?api=1&query=Baked+by+Linda+Winchburgh";

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
    await ensureSampleGallery(db);
    await db.delete(cakes);
    await ensureSampleCatalogue(db);
    await importSampleReviews(db);
    await db.delete(faqQuestions);
    await ensureFaq(db);
    await db.delete(legalRevisions);
    await ensureLegalPages(db);
  } finally {
    await close();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(() =>
      console.log(
        "Seeded: settings, closed days, gallery, sample catalogue, sample reviews, FAQ, legal pages",
      ),
    )
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
