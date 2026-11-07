import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { placeholderValues } from "@/lib/placeholders";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { connect } from "./client";
import { legalPdfFor } from "./legal-pdf-repo";
import { ensureLegalPages, readLegalRevision } from "./legal-repo";
import { legalPdfs } from "./schema";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)(
  "database: e-mail 1's legal PDFs (§8.1 Durable record)",
  () => {
    const conn = url ? connect(url) : null;
    const db = () => conn!.db;
    beforeAll(async () => {
      await migrate(db(), { migrationsFolder: "drizzle" });
      await ensureLegalPages(db());
      await db().delete(legalPdfs);
    });
    afterAll(async () => conn?.close());

    it("a PDF of the revision with the kept facts filled in; made once, the same file afterwards", async () => {
      const rev = (await readLegalRevision(db(), "terms"))!;
      const facts = placeholderValues(INITIAL_SETTINGS);
      const a = (await legalPdfFor(db(), rev.id, facts, "terms.pdf"))!;
      const bytes = Buffer.from(a, "base64");
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(2000);
      const b = await legalPdfFor(db(), rev.id, facts, "terms.pdf");
      expect(b).toBe(a);
      expect(await db().select().from(legalPdfs)).toHaveLength(1);
      // Other facts (Linda moved): a new file.
      const c = await legalPdfFor(
        db(),
        rev.id,
        { ...facts, town: "Linlithgow" },
        "terms.pdf",
      );
      expect(c).not.toBe(a);
    }, 30_000);
  },
);
