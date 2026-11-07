// E-mail 1's legal PDFs, one per revision and facts version (§8.1): a resend attaches the very same file.
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { legalPdf } from "@/lib/mail/legal-pdf";
import type { Placeholder } from "@/lib/placeholders";
import type { connect } from "./client";
import { legalPdfs, legalRevisions } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export const factsHash = (facts: Record<Placeholder, string>) =>
  createHash("sha256")
    .update(JSON.stringify(Object.entries(facts).sort()))
    .digest("hex")
    .slice(0, 32);

/** The PDF (base64) of a legal revision filled with these facts: from the cache, or made once and kept. */
export async function legalPdfFor(
  db: Db,
  revisionId: number,
  facts: Record<Placeholder, string>,
  fileName: string,
): Promise<string | null> {
  const hash = factsHash(facts);
  const [hit] = await db
    .select({ base64: legalPdfs.base64 })
    .from(legalPdfs)
    .where(
      and(eq(legalPdfs.revisionId, revisionId), eq(legalPdfs.factsHash, hash)),
    );
  if (hit) return hit.base64;
  const [rev] = await db
    .select()
    .from(legalRevisions)
    .where(eq(legalRevisions.id, revisionId));
  if (!rev) return null;
  const pdf = await legalPdf({
    title: rev.title,
    intro: rev.intro,
    body: rev.body,
    updatedOn: String(rev.updatedOn),
    facts,
  });
  const base64 = pdf.toString("base64");
  await db
    .insert(legalPdfs)
    .values({ revisionId, factsHash: hash, fileName, base64 })
    .onConflictDoNothing();
  return base64;
}
