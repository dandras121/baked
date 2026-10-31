import { cacheTag } from "next/cache";
import { FAQ_SEED, type FaqCategory, type FaqRow } from "@/lib/faq";
import { connect, databaseUrl } from "./client";
import { faqQuestions } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Saving the FAQ in the admin (9.x) revalidates this tag. */
export const FAQ_TAG = "faq";

export async function readFaq(db: Db): Promise<FaqRow[]> {
  const rows = await db.select().from(faqQuestions);
  return rows.map((r) => ({
    category: r.category as FaqCategory,
    question: r.question,
    answer: r.answer,
    position: r.position,
  }));
}

/** The starting FAQ (§4.4) once, into an empty table; Linda's edits are never overwritten. */
export async function ensureFaq(db: Db): Promise<boolean> {
  const [any] = await db
    .select({ id: faqQuestions.id })
    .from(faqQuestions)
    .limit(1);
  if (any) return false;
  await db.insert(faqQuestions).values(FAQ_SEED);
  return true;
}

/** The FAQ rows for the public page (cached until the FAQ is saved). Empty without a database. */
export async function getFaq(): Promise<FaqRow[]> {
  "use cache";
  cacheTag(FAQ_TAG);
  if (!databaseUrl()) return [];
  const { db, close } = connect();
  try {
    return await readFaq(db);
  } finally {
    await close();
  }
}
