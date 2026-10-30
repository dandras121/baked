import { asc, eq, isNull } from "drizzle-orm";
import { cacheTag } from "next/cache";
import {
  homeCakes,
  homeSquares,
  type CakeCardData,
  type CakeRow,
  type GallerySquare,
} from "@/lib/home-content";
import { connect, databaseUrl } from "./client";
import { cakeSizes, cakes, galleryPhotos } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Cache tags: saving a cake (3.x / 9.x) revalidates "cakes", a gallery change "gallery". */
export const CAKES_TAG = "cakes";
export const GALLERY_TAG = "gallery";

/** Every cake that is not deleted, with its sizes. */
export async function readCakeRows(db: Db): Promise<CakeRow[]> {
  const rows = await db
    .select()
    .from(cakes)
    .where(isNull(cakes.deletedAt))
    .orderBy(asc(cakes.position));
  const sizes = await db.select().from(cakeSizes);
  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    flavour: c.flavour,
    visible: c.visible,
    deleted: c.deletedAt !== null,
    position: c.position,
    sizes: sizes
      .filter((s) => s.cakeId === c.id)
      .map(({ serves, tiers, pricePence }) => ({ serves, tiers, pricePence })),
  }));
}

export async function readGalleryRows(db: Db) {
  return db.select().from(galleryPhotos);
}

/** The Home row (§4.1): the first five visible designs. Empty without a database. */
export async function getHomeCakes(): Promise<CakeCardData[]> {
  "use cache";
  cacheTag(CAKES_TAG);
  if (!databaseUrl()) return [];
  const { db, close } = connect();
  try {
    return homeCakes(await readCakeRows(db));
  } finally {
    await close();
  }
}

/** The four "Special idea?" squares and whether the gallery link shows (§4.1). */
export async function getHomeSquares(): Promise<{
  squares: (GallerySquare | null)[];
  galleryLink: boolean;
}> {
  "use cache";
  cacheTag(GALLERY_TAG);
  if (!databaseUrl()) return homeSquares([]);
  const { db, close } = connect();
  try {
    return homeSquares(await readGalleryRows(db));
  } finally {
    await close();
  }
}

/** A visible, not deleted cake by its slug, or null (hidden and deleted cakes are 404, §11.3). */
export async function getVisibleCake(
  slug: string,
): Promise<{ slug: string; name: string } | null> {
  "use cache";
  cacheTag(CAKES_TAG);
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const [row] = await db
      .select({
        slug: cakes.slug,
        name: cakes.name,
        visible: cakes.visible,
        deletedAt: cakes.deletedAt,
      })
      .from(cakes)
      .where(eq(cakes.slug, slug));
    return row && row.visible && !row.deletedAt
      ? { slug: row.slug, name: row.name }
      : null;
  } finally {
    await close();
  }
}

/** Slugs of every visible cake (static cake pages, sitemap later). */
export async function getVisibleSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(CAKES_TAG);
  if (!databaseUrl()) return [];
  const { db, close } = connect();
  try {
    return (await readCakeRows(db)).filter((c) => c.visible).map((c) => c.slug);
  } finally {
    await close();
  }
}
