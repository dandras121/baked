import { eq, like } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkCakeForm, EMPTY_CAKE } from "@/lib/admin/cake-form";
import { INITIAL_SETTINGS } from "@/lib/settings";
import { saveCake } from "./admin-cake-form-repo";
import {
  addCakePhoto,
  cakeMediaList,
  cakeVideoStatus,
  finishCakeVideo,
  PREPARING_LIMIT_MS,
  setVideoCover,
  startCakeVideo,
  makeMainPhoto,
  removeCakeMedia,
  reorderCakeMedia,
  updateCakePhoto,
} from "./cake-media-repo";
import { connect } from "./client";
import { readCakePage } from "./cake-page-repo";
import { readCakeRows } from "./home-repo";
import { cakeMedia, cakes, storedFiles } from "./schema";
import { VIDEO_WORDS } from "@/lib/uploads/video-rules";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { ensureSettings } from "./settings-repo";

const url = process.env.TEST_DATABASE_URL;
const photo = () =>
  sharp({
    create: {
      width: 1800,
      height: 2200,
      channels: 3,
      background: { r: 230, g: 200, b: 210 },
    },
  })
    .jpeg()
    .toBuffer();

async function clip(): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "bbl-clip-"));
  try {
    const out = join(dir, "clip.mp4");
    await promisify(execFile)(ffmpegPath as unknown as string, [
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x480:rate=10:duration=1",
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

describe.skipIf(!url)("database: a cake's photos (§9.13)", () => {
  const conn = url ? connect(url) : null;
  const db = () => conn!.db;
  let cakeId = 0;

  beforeAll(async () => {
    await migrate(db(), { migrationsFolder: "drizzle" });
    await ensureSettings(db(), INITIAL_SETTINGS);
  });
  beforeEach(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Photo%"));
    const r = await saveCake(
      db(),
      null,
      checkCakeForm({
        ...EMPTY_CAKE,
        name: "Zz Photo Cake",
        whatItIs: "x",
        flavour: "y",
        sizes: [{ id: null, serves: "12", tiers: "1", price: "95" }],
      }).value!,
    );
    cakeId = (r as { id: number }).id;
  });
  afterAll(async () => {
    await db().delete(cakes).where(like(cakes.name, "Zz Photo%"));
    await db().delete(storedFiles).where(like(storedFiles.key, "cakes/%"));
    await conn?.close();
  });

  it("adds photos in upload order as public media; the first is the card photo", async () => {
    const a = await addCakePhoto(db(), cakeId, await photo());
    const b = await addCakePhoto(db(), cakeId, await photo());
    expect(a.ok && b.ok).toBe(true);
    const list = await cakeMediaList(db(), cakeId);
    expect(list.map((m) => m.kind)).toEqual(["photo", "photo"]);
    expect(list[0].src).toMatch(
      new RegExp(`^/media/cakes/${cakeId}/[0-9a-f-]+\\.jpg$`),
    );
    const [row] = await db()
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.key, list[0].src.slice("/media/".length)));
    expect(row.contentType).toBe("image/jpeg");
    const card = (await readCakeRows(db())).find(
      (c) => c.name === "Zz Photo Cake",
    )!;
    expect(card.photo).toMatchObject({
      src: list[0].src,
      alt: "Zz Photo Cake",
      focalX: 0.5,
      focalY: 0.5,
    });
  });

  it("refuses a ninth photo and a small one, with the words", async () => {
    expect(
      await addCakePhoto(
        db(),
        cakeId,
        await sharp({
          create: { width: 800, height: 600, channels: 3, background: "#fff" },
        })
          .jpeg()
          .toBuffer(),
      ),
    ).toEqual({
      ok: false,
      words:
        "That photo is too small — it needs at least 1600 pixels on its long side. Nothing was added.",
    });
    for (let i = 0; i < 8; i++) await addCakePhoto(db(), cakeId, await photo());
    expect(await addCakePhoto(db(), cakeId, await photo())).toEqual({
      ok: false,
      words:
        "Up to 8 photos and 2 videos — remove one first. Nothing was added.",
    });
  });

  it("Make the main photo, the order, alt text and the focal point (kept between 0 and 1)", async () => {
    const a = (await addCakePhoto(db(), cakeId, await photo())) as {
      ok: true;
      media: { id: number };
    };
    const b = (await addCakePhoto(db(), cakeId, await photo())) as {
      ok: true;
      media: { id: number };
    };
    expect(await makeMainPhoto(db(), cakeId, b.media.id)).toBe(true);
    expect((await cakeMediaList(db(), cakeId)).map((m) => m.id)).toEqual([
      b.media.id,
      a.media.id,
    ]);
    expect(await reorderCakeMedia(db(), cakeId, [a.media.id])).toBe(false);
    expect(
      await updateCakePhoto(db(), cakeId, b.media.id, {
        alt: " Three ivory tiers ",
        focalX: 1.4,
        focalY: 0.25,
      }),
    ).toBe(true);
    const [main] = await cakeMediaList(db(), cakeId);
    expect(main).toMatchObject({
      alt: "Three ivory tiers",
      focalX: 1,
      focalY: 0.25,
    });
  });

  it("a showing cake keeps its last photo; a hidden one may lose it", async () => {
    const a = (await addCakePhoto(db(), cakeId, await photo())) as {
      ok: true;
      media: { id: number };
    };
    await db().update(cakes).set({ visible: true }).where(eq(cakes.id, cakeId));
    expect(await removeCakeMedia(db(), cakeId, a.media.id)).toEqual({
      kind: "last-photo",
    });
    await db()
      .update(cakes)
      .set({ visible: false })
      .where(eq(cakes.id, cakeId));
    expect(await removeCakeMedia(db(), cakeId, a.media.id)).toEqual({
      kind: "removed",
    });
    expect(await cakeMediaList(db(), cakeId)).toEqual([]);
  });

  it("a video: preparing at once, then ready with its copy and cover; at most two", async () => {
    const a = await startCakeVideo(db(), cakeId);
    if (!a.ok) throw new Error(a.words);
    expect(a.media).toMatchObject({ kind: "video", status: "preparing" });
    expect(await cakeVideoStatus(db(), cakeId, [a.media.id])).toEqual([
      { id: a.media.id, state: "preparing" },
    ]);
    await finishCakeVideo(db(), cakeId, a.media.id, await clip());
    const [ready] = await cakeVideoStatus(db(), cakeId, [a.media.id]);
    expect(ready.state).toBe("ready");
    if (ready.state !== "ready") return;
    expect(ready.media.src).toMatch(/^\/media\/cakes\/.+\.mp4$/);
    expect(ready.media.poster).toMatch(/-cover\.jpg$/);

    expect((await startCakeVideo(db(), cakeId)).ok).toBe(true);
    expect(await startCakeVideo(db(), cakeId)).toEqual({
      ok: false,
      words: VIDEO_WORDS.full,
    });
  }, 60_000);

  it("a video that cannot be prepared leaves the tiles with the words; so does one stuck for 15 minutes", async () => {
    const a = await startCakeVideo(db(), cakeId);
    const b = await startCakeVideo(db(), cakeId);
    if (!a.ok || !b.ok) throw new Error("no room");
    await finishCakeVideo(db(), cakeId, a.media.id, Buffer.from("nonsense"));
    const later = new Date(Date.now() + PREPARING_LIMIT_MS + 1000);
    const r = await cakeVideoStatus(
      db(),
      cakeId,
      [a.media.id, b.media.id],
      later,
    );
    expect(r).toEqual([
      { id: a.media.id, state: "failed", words: expect.any(String) },
      { id: b.media.id, state: "failed", words: VIDEO_WORDS.failed },
    ]);
    expect(
      await db().select().from(cakeMedia).where(eq(cakeMedia.cakeId, cakeId)),
    ).toEqual([]);
    // A failed video frees its place.
    expect((await startCakeVideo(db(), cakeId)).ok).toBe(true);
  }, 60_000);

  it("Change the cover replaces the first frame; a non-picture is refused", async () => {
    const a = await startCakeVideo(db(), cakeId);
    if (!a.ok) throw new Error(a.words);
    await finishCakeVideo(db(), cakeId, a.media.id, await clip());
    const before = (await cakeMediaList(db(), cakeId))[0].poster;
    const r = await setVideoCover(db(), cakeId, a.media.id, await photo());
    expect(r.ok).toBe(true);
    const after = (await cakeMediaList(db(), cakeId))[0].poster;
    expect(after).not.toBe(before);
    expect(after).toMatch(/-cover\.jpg$/);
    expect(
      (await setVideoCover(db(), cakeId, a.media.id, Buffer.from("x"))).ok,
    ).toBe(false);
  }, 60_000);

  it("the cake page shows a video only once it is ready", async () => {
    await addCakePhoto(db(), cakeId, await photo());
    await db().update(cakes).set({ visible: true }).where(eq(cakes.id, cakeId));
    const [{ slug }] = await db()
      .select({ slug: cakes.slug })
      .from(cakes)
      .where(eq(cakes.id, cakeId));
    const a = await startCakeVideo(db(), cakeId);
    if (!a.ok) throw new Error(a.words);
    const kinds = async () =>
      (await readCakePage(db(), slug))!.media.map((m) => m.kind);
    expect(await kinds()).toEqual(["photo"]);
    await finishCakeVideo(db(), cakeId, a.media.id, await clip());
    expect(await kinds()).toEqual(["photo", "video"]);
  }, 60_000);
});
