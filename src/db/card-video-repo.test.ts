import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { inArray, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import ffmpegPath from "ffmpeg-static";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkCakeForm, EMPTY_CAKE } from "@/lib/admin/cake-form";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { saveCake } from "./admin-cake-form-repo";
import { cardVideoOf, removeCardVideo, setCardVideo } from "./card-video-repo";
import { connect } from "./client";
import { readCakeRows } from "./home-repo";
import { cakes, storedFiles } from "./schema";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;

async function clip(seconds: number, side: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "bbl-card-"));
  try {
    const out = join(dir, "clip.mp4");
    await promisify(execFile)(ffmpegPath as unknown as string, [
      "-f",
      "lavfi",
      "-i",
      `testsrc=size=${side}x${side}:rate=30:duration=${seconds}`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-pix_fmt",
      "yuv420p",
      "-y",
      out,
    ]);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const keys = (v: { v1080: string; v1440: string; still: string }) =>
  [v.v1080, v.v1440, v.still].map((u) => u.slice("/media/".length));

describe.skipIf(!url)("database: the card video (§9.13)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let cakeId = 0;

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Card%"));
    const r = await saveCake(
      db(),
      null,
      checkCakeForm({
        ...EMPTY_CAKE,
        name: "Zz Card Cake",
        whatItIs: "x",
        flavour: "y",
        sizes: [{ id: null, serves: "12", tiers: "1", price: "95" }],
      }).value!,
    );
    cakeId = (r as { id: number }).id;
  });
  afterAll(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Card%"));
    await db().delete(storedFiles).where(like(storedFiles.key, "cakes/%"));
    await conn?.close();
  });

  const stored = async (k: string[]) =>
    (
      await db()
        .select({ key: storedFiles.key, type: storedFiles.contentType })
        .from(storedFiles)
        .where(inArray(storedFiles.key, k))
    )
      .map((r) => r.type)
      .sort();

  it("Add, then Replace: the card shows the new one and the old files go; Remove brings the main photo back", async () => {
    const first = await setCardVideo(db(), cakeId, await clip(5, 1440));
    if (!first.ok) throw new Error(first.words);
    expect(await stored(keys(first.video))).toEqual([
      "image/webp",
      "video/mp4",
      "video/mp4",
    ]);
    const row = (await readCakeRows(db())).find(
      (c) => c.name === "Zz Card Cake",
    );
    expect(row?.cardVideo).toEqual(first.video);

    const second = await setCardVideo(db(), cakeId, await clip(5, 1440));
    if (!second.ok) throw new Error(second.words);
    expect(await cardVideoOf(db(), cakeId)).toEqual(second.video);
    expect(await stored(keys(first.video))).toEqual([]);

    await removeCardVideo(db(), cakeId);
    expect(await cardVideoOf(db(), cakeId)).toBeNull();
    expect(await stored(keys(second.video))).toEqual([]);
    const after = (await readCakeRows(db())).find(
      (c) => c.name === "Zz Card Cake",
    );
    expect(after?.cardVideo).toBeNull();
  }, 120_000);

  it("a wrong file changes nothing and says why", async () => {
    const first = await setCardVideo(db(), cakeId, await clip(5, 1440));
    if (!first.ok) throw new Error(first.words);
    const r = await setCardVideo(db(), cakeId, await clip(2, 1440));
    expect(r).toEqual({
      ok: false,
      words:
        "The card video must be a square video of about 5 seconds, at least 1440 × 1440.",
    });
    expect(await cardVideoOf(db(), cakeId)).toEqual(first.video);
  }, 120_000);
});
