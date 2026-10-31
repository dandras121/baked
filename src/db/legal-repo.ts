import { desc, eq } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { LEGAL_SEED, type LegalSlug } from "@/lib/legal-seed";
import { londonDate } from "@/lib/london-time";
import { connect, databaseUrl } from "./client";
import { legalRevisions } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Saving a legal page in the admin (9.x) revalidates this tag. */
export const LEGAL_TAG = "legal";

export type LegalRevision = {
  id: number;
  slug: string;
  title: string;
  intro: string;
  body: string;
  updatedOn: string;
};

/** The page as shown: its newest revision. */
export async function readLegalRevision(
  db: Db,
  slug: LegalSlug,
): Promise<LegalRevision | null> {
  const [row] = await db
    .select()
    .from(legalRevisions)
    .where(eq(legalRevisions.slug, slug))
    .orderBy(desc(legalRevisions.createdAt), desc(legalRevisions.id))
    .limit(1);
  return row
    ? {
        id: row.id,
        slug: row.slug,
        title: row.title,
        intro: row.intro,
        body: row.body,
        updatedOn: String(row.updatedOn),
      }
    : null;
}

/** Saving a page: a new revision dated today in London; earlier revisions are never changed (§9.12). */
export async function saveLegalRevision(
  db: Db,
  page: { slug: LegalSlug; title: string; intro: string; body: string },
  now = new Date(),
): Promise<number> {
  const [row] = await db
    .insert(legalRevisions)
    .values({ ...page, updatedOn: londonDate(now) })
    .returning({ id: legalRevisions.id });
  return row.id;
}

/** The starting text (§4.5) for every page that has no revision yet; pages Linda saved are kept. */
export async function ensureLegalPages(db: Db): Promise<number> {
  let added = 0;
  for (const page of LEGAL_SEED) {
    if (await readLegalRevision(db, page.slug)) continue;
    await saveLegalRevision(db, page);
    added++;
  }
  return added;
}

/** A legal page for the public site (cached until a page is saved). Null without a database. */
export async function getLegalPage(
  slug: LegalSlug,
): Promise<LegalRevision | null> {
  "use cache";
  cacheTag(LEGAL_TAG);
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    return await readLegalRevision(db, slug);
  } finally {
    await close();
  }
}
