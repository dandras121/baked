// A cake's photos in the admin (§9.13): up to 8, the first is the card photo; each keeps its focal point and alt text.
// Changes save at once. The files are public media (putPublic); the rows hold their addresses.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { CAKE_LIMITS } from "@/lib/cakes";
import { putPublic } from "@/lib/storage";
import { CakePhotoError, processCakePhoto } from "@/lib/uploads/cake-photo";
import type { connect } from "./client";
import { cakeMedia, cakes } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export type AdminMedia = {
  id: number;
  kind: "photo" | "video";
  src: string;
  poster: string | null;
  alt: string;
  focalX: number;
  focalY: number;
};

export async function cakeMediaList(
  db: Db,
  cakeId: number,
): Promise<AdminMedia[]> {
  const rows = await db
    .select()
    .from(cakeMedia)
    .where(eq(cakeMedia.cakeId, cakeId))
    .orderBy(asc(cakeMedia.position), asc(cakeMedia.id));
  return rows.map((m) => ({
    id: m.id,
    kind: m.kind as "photo" | "video",
    src: m.path,
    poster: m.posterPath,
    alt: m.altText,
    focalX: m.focalX,
    focalY: m.focalY,
  }));
}

const PHOTO_FULL =
  "Up to 8 photos and 2 videos — remove one first. Nothing was added.";

/** Add photos: one file at a time, at the end (upload order = gallery order). */
export async function addCakePhoto(
  db: Db,
  cakeId: number,
  data: Buffer,
): Promise<{ ok: true; media: AdminMedia } | { ok: false; words: string }> {
  const [c] = await db
    .select({ id: cakes.id })
    .from(cakes)
    .where(and(eq(cakes.id, cakeId), isNull(cakes.deletedAt)));
  if (!c)
    return {
      ok: false,
      words: "This cake was deleted meanwhile. Nothing was added.",
    };
  const [{ n }] = await db
    .select({ n: count() })
    .from(cakeMedia)
    .where(and(eq(cakeMedia.cakeId, cakeId), eq(cakeMedia.kind, "photo")));
  if (Number(n) >= CAKE_LIMITS.photos) return { ok: false, words: PHOTO_FULL };
  let photo: Awaited<ReturnType<typeof processCakePhoto>>;
  try {
    photo = await processCakePhoto(data);
  } catch (e) {
    if (e instanceof CakePhotoError) return { ok: false, words: e.words };
    throw e;
  }
  const src = await putPublic(
    db,
    `cakes/${cakeId}/${randomUUID()}.jpg`,
    photo.data,
    "image/jpeg",
  );
  const all = await cakeMediaList(db, cakeId);
  const [row] = await db
    .insert(cakeMedia)
    .values({ cakeId, kind: "photo", position: all.length + 1, path: src })
    .returning();
  return {
    ok: true,
    media: {
      id: row.id,
      kind: "photo",
      src,
      poster: null,
      alt: "",
      focalX: 0.5,
      focalY: 0.5,
    },
  };
}

/** The whole order of the tiles (photos and videos), saved at once; the first photo is the card photo. */
export async function reorderCakeMedia(
  db: Db,
  cakeId: number,
  ids: number[],
): Promise<boolean> {
  const all = await cakeMediaList(db, cakeId);
  const want = new Set(all.map((m) => m.id));
  if (
    ids.length !== want.size ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !want.has(id))
  )
    return false;
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(cakeMedia)
        .set({ position: i + 1 })
        .where(eq(cakeMedia.id, id));
  });
  return true;
}

/** Make the main photo: that photo goes first. */
export async function makeMainPhoto(
  db: Db,
  cakeId: number,
  id: number,
): Promise<boolean> {
  const all = await cakeMediaList(db, cakeId);
  const it = all.find((m) => m.id === id && m.kind === "photo");
  if (!it) return false;
  return reorderCakeMedia(db, cakeId, [
    id,
    ...all.filter((m) => m.id !== id).map((m) => m.id),
  ]);
}

/** Describe this photo (alt text, max 150; empty = the cake's name) and the focal point (0–1). */
export async function updateCakePhoto(
  db: Db,
  cakeId: number,
  id: number,
  patch: { alt?: string; focalX?: number; focalY?: number },
): Promise<boolean> {
  const set: Partial<typeof cakeMedia.$inferInsert> = {};
  if (patch.alt !== undefined) set.altText = patch.alt.trim().slice(0, 150);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  if (patch.focalX !== undefined && Number.isFinite(patch.focalX))
    set.focalX = clamp(patch.focalX);
  if (patch.focalY !== undefined && Number.isFinite(patch.focalY))
    set.focalY = clamp(patch.focalY);
  if (!Object.keys(set).length) return false;
  const r = await db
    .update(cakeMedia)
    .set(set)
    .where(and(eq(cakeMedia.id, id), eq(cakeMedia.cakeId, cakeId)))
    .returning({ id: cakeMedia.id });
  return r.length > 0;
}

export type RemoveMediaResult =
  { kind: "removed" } | { kind: "last-photo" } | { kind: "gone" };

/** × Remove: a showing cake keeps at least one photo (“Hide the cake first — a cake on the site needs a photo.”). */
export async function removeCakeMedia(
  db: Db,
  cakeId: number,
  id: number,
): Promise<RemoveMediaResult> {
  const [c] = await db
    .select({ visible: cakes.visible })
    .from(cakes)
    .where(eq(cakes.id, cakeId));
  const all = await cakeMediaList(db, cakeId);
  const it = all.find((m) => m.id === id);
  if (!c || !it) return { kind: "gone" };
  if (
    it.kind === "photo" &&
    c.visible &&
    all.filter((m) => m.kind === "photo").length === 1
  )
    return { kind: "last-photo" };
  await db.delete(cakeMedia).where(eq(cakeMedia.id, id));
  // The file stays: orders already placed keep their copy of it (§9.13).
  const rest = all.filter((m) => m.id !== id).map((m) => m.id);
  if (rest.length) await reorderCakeMedia(db, cakeId, rest);
  return { kind: "removed" };
}
