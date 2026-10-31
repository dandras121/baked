import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LEGAL_SEED } from "@/lib/legal-seed";
import { connect } from "./client";
import {
  ensureLegalPages,
  readLegalRevision,
  saveLegalRevision,
} from "./legal-repo";
import { legalRevisions } from "./schema";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)(
  "database: legal page revisions (§4.5, §9.12, §8.1)",
  () => {
    const conn = url ? connect(url) : null;
    beforeAll(async () => {
      await migrate(conn!.db, { migrationsFolder: "drizzle" });
      await conn!.db.delete(legalRevisions);
    });
    afterAll(async () => conn?.close());

    it("the starting text once per page; a second run adds nothing", async () => {
      expect(await ensureLegalPages(conn!.db)).toBe(LEGAL_SEED.length);
      expect(await ensureLegalPages(conn!.db)).toBe(0);
    });

    it("saving is a new revision dated in London; the earlier one is kept unchanged for orders", async () => {
      const before = (await readLegalRevision(conn!.db, "terms"))!;
      const id = await saveLegalRevision(
        conn!.db,
        {
          slug: "terms",
          title: before.title,
          intro: "New intro.",
          body: before.body,
        },
        new Date("2026-11-03T23:30:00Z"), // still 3 November in London (GMT)
      );
      const now = (await readLegalRevision(conn!.db, "terms"))!;
      expect(now.id).toBe(id);
      expect(now.intro).toBe("New intro.");
      expect(now.updatedOn).toBe("2026-11-03");
      const [old] = await conn!.db
        .select()
        .from(legalRevisions)
        .where(eq(legalRevisions.id, before.id));
      expect(old.intro).toBe(before.intro);
    });
  },
);
