import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readCakePage } from "./cake-page-repo";
import { ensureSampleCatalogue } from "./cake-repo";
import { connect } from "./client";
import {
  addLine,
  DRAFT_IDLE_MS,
  draftStatus,
  readLine,
  updateLine,
  draftIsFull,
  draftLineViews,
  liveDraft,
} from "./draft-repo";
import { draftLines, drafts } from "./schema";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("database: the checkout draft (§5.1, §10.2)", () => {
  const conn = url ? connect(url) : null;
  let line: {
    cakeId: number;
    sizeId: number;
    answers: { picks: Record<number, number[]>; texts: Record<number, string> };
    inscription: string;
  };
  let bramble: Awaited<ReturnType<typeof readCakePage>>;

  beforeAll(async () => {
    const db = conn!.db;
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.delete(drafts);
    await ensureSampleCatalogue(db);
    const lothian = (await readCakePage(db, "the-lothian"))!;
    bramble = await readCakePage(db, "bramble-and-cream");
    line = {
      cakeId: lothian.id,
      sizeId: lothian.sizes[0].id,
      answers: { picks: {}, texts: {} },
      inscription: "Happy 30th, Mairi",
    };
  });
  afterAll(async () => conn?.close());

  it("the first Add makes a draft; later ones add to it in order", async () => {
    const db = conn!.db;
    const a = await addLine(db, undefined, line);
    expect(a.kind).toBe("added");
    const sponge = bramble!.options[0];
    const b = await addLine(db, a.draftId, {
      cakeId: bramble!.id,
      sizeId: bramble!.sizes[1].id,
      answers: { picks: { [sponge.id]: [sponge.choices[1].id] }, texts: {} },
      inscription: "",
    });
    expect(b.draftId).toBe(a.draftId);
    const views = await draftLineViews(db, a.draftId);
    expect(views.map((v) => [v.title, v.options, v.pricePence])).toEqual([
      ["The Lothian · serves 24 · “Happy 30th, Mairi”", "", 18_500],
      ["Bramble & Cream · serves 32 · no message", "Sponge: Chocolate", 24_500],
    ]);
  });

  it("five cakes at most: the sixth is refused and nothing is added", async () => {
    const db = conn!.db;
    const first = await addLine(db, undefined, line);
    for (let i = 0; i < 4; i++) await addLine(db, first.draftId, line);
    expect(await draftIsFull(db, first.draftId)).toBe(true);
    const sixth = await addLine(db, first.draftId, line);
    expect(sixth.kind).toBe("cap");
    const rows = await db
      .select()
      .from(draftLines)
      .where(eq(draftLines.draftId, first.draftId));
    expect(rows).toHaveLength(5);
  });

  it("two Adds at the same moment on four cakes: one gets in, one is refused", async () => {
    const db = conn!.db;
    const first = await addLine(db, undefined, line);
    for (let i = 0; i < 3; i++) await addLine(db, first.draftId, line);
    const both = await Promise.all([
      addLine(db, first.draftId, line),
      addLine(db, first.draftId, line),
    ]);
    expect(both.map((r) => r.kind).sort()).toEqual(["added", "cap"]);
  });

  it("24 hours without activity: the draft is gone and the next Add starts a new one", async () => {
    const db = conn!.db;
    const t0 = new Date("2026-11-02T10:00:00Z");
    const a = await addLine(db, undefined, line, t0);
    const nearly = new Date(t0.getTime() + DRAFT_IDLE_MS - 1000);
    expect(await liveDraft(db, a.draftId, nearly)).not.toBeNull();
    const after = new Date(t0.getTime() + DRAFT_IDLE_MS + 1000);
    expect(await liveDraft(db, a.draftId, after)).toBeNull();
    const b = await addLine(db, a.draftId, line, after);
    expect(b.draftId).not.toBe(a.draftId);
  });

  it("a cookie value that is not a draft id finds nothing", async () => {
    expect(await liveDraft(conn!.db, "not-a-uuid")).toBeNull();
    expect(
      await liveDraft(conn!.db, "00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });

  it("a draft idle for 24 hours is reported as cleared (and marked abandoned) — once a step looks", async () => {
    const db = conn!.db;
    const t0 = new Date("2026-11-03T10:00:00Z");
    const a = await addLine(db, undefined, line, t0);
    expect(await draftStatus(db, a.draftId, t0)).toBe("live");
    const later = new Date(t0.getTime() + DRAFT_IDLE_MS + 60_000);
    expect(await draftStatus(db, a.draftId, later)).toBe("cleared");
    const [d] = await db.select().from(drafts).where(eq(drafts.id, a.draftId));
    expect(d.status).toBe("abandoned");
    expect(await draftStatus(db, a.draftId, later)).toBe("cleared");
    expect(await draftStatus(db, undefined)).toBe("none");
  });

  it("edit mode: a line is read and saved in place, keeping its position; another draft's line is not", async () => {
    const db = conn!.db;
    const a = await addLine(db, undefined, line);
    const b = await addLine(db, a.draftId, { ...line, inscription: "Second" });
    if (a.kind !== "added" || b.kind !== "added") throw new Error("not added");
    const read = await readLine(db, a.draftId, a.lineId);
    expect(read).toMatchObject({
      slug: "the-lothian",
      inscription: "Happy 30th, Mairi",
    });
    const bigger = (await readCakePage(db, "the-lothian"))!.sizes[2].id;
    expect(
      await updateLine(db, a.draftId, a.lineId, {
        ...line,
        sizeId: bigger,
        inscription: "Changed",
      }),
    ).toBe(true);
    const views = await draftLineViews(db, a.draftId);
    expect(views.map((v) => v.title)).toEqual([
      "The Lothian · serves 40 · “Changed”",
      "The Lothian · serves 24 · “Second”",
    ]);
    const other = await addLine(db, undefined, line);
    expect(await readLine(db, other.draftId, a.lineId)).toBeNull();
    expect(await updateLine(db, other.draftId, a.lineId, line)).toBe(false);
  });
});
