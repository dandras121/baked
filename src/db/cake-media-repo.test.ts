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
  makeMainPhoto,
  removeCakeMedia,
  reorderCakeMedia,
  updateCakePhoto,
} from "./cake-media-repo";
import { connect } from "./client";
import { readCakeRows } from "./home-repo";
import { cakes, storedFiles } from "./schema";
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
});
