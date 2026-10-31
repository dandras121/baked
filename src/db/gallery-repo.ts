// The gallery page's photos (§4.8), cached until the gallery changes in the admin (tag “gallery”, 9.5).
import { cacheTag } from "next/cache";
import { galleryTiles, SAMPLE_GALLERY, type GalleryTile } from "@/lib/gallery";
import { connect, databaseUrl } from "./client";
import { GALLERY_TAG, readGalleryRows } from "./home-repo";
import { galleryPhotos } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Every showing photo in Linda's order. Empty without a database. */
export async function getGalleryTiles(): Promise<GalleryTile[]> {
  "use cache";
  cacheTag(GALLERY_TAG);
  if (!databaseUrl()) return [];
  const { db, close } = connect();
  try {
    return galleryTiles(await readGalleryRows(db));
  } finally {
    await close();
  }
}

/** The sample gallery (development and previews only), added when the gallery is empty. */
export async function ensureSampleGallery(db: Db): Promise<number> {
  const [any] = await db
    .select({ id: galleryPhotos.id })
    .from(galleryPhotos)
    .limit(1);
  if (any) return 0;
  await db.insert(galleryPhotos).values(
    SAMPLE_GALLERY.map((p, i) => ({
      caption: p.caption,
      occasion: p.occasion,
      showing: true,
      position: i + 1,
    })),
  );
  return SAMPLE_GALLERY.length;
}
