// The card video of a cake (§9.13, Decided 2026-10-22): one per cake, shown only on the cake card (ANIM-11).
// Add or Replace converts the upload first; the cake's old card video stays on the site until the new one is ready.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { removePublic, putPublic } from "@/lib/storage";
import { CardVideoError, processCardVideo } from "@/lib/uploads/card-video";
import { CARD_VIDEO_WORDS } from "@/lib/uploads/video-rules";
import type { CardVideo } from "@/lib/home-content";
import type { connect } from "./client";
import { cakeCardVideos, cakes } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export async function cardVideoOf(
  db: Db,
  cakeId: number,
): Promise<CardVideo | null> {
  const [v] = await db
    .select()
    .from(cakeCardVideos)
    .where(eq(cakeCardVideos.cakeId, cakeId));
  return v
    ? { still: v.stillPath, v1080: v.path1080, v1440: v.path1440 }
    : null;
}

export type CardVideoResult =
  { ok: true; video: CardVideo } | { ok: false; words: string };

/** Add photo / video · Replace: the new card video, or the words saying why nothing was changed. */
export async function setCardVideo(
  db: Db,
  cakeId: number,
  data: Buffer,
): Promise<CardVideoResult> {
  const [c] = await db
    .select({ id: cakes.id })
    .from(cakes)
    .where(eq(cakes.id, cakeId));
  if (!c) return { ok: false, words: CARD_VIDEO_WORDS.failed };
  let files;
  try {
    files = await processCardVideo(data);
  } catch (e) {
    if (e instanceof CardVideoError) return { ok: false, words: e.words };
    console.error("card video", e);
    return { ok: false, words: CARD_VIDEO_WORDS.failed };
  }
  const key = `cakes/${cakeId}/card-${randomUUID()}`;
  const [v1080, v1440, still] = await Promise.all([
    putPublic(db, `${key}-1080.mp4`, files.v1080, "video/mp4"),
    putPublic(db, `${key}-1440.mp4`, files.v1440, "video/mp4"),
    putPublic(db, `${key}-still.webp`, files.still, "image/webp"),
  ]);
  const old = await cardVideoOf(db, cakeId);
  const row = { path1080: v1080, path1440: v1440, stillPath: still };
  await db
    .insert(cakeCardVideos)
    .values({ cakeId, ...row })
    .onConflictDoUpdate({ target: cakeCardVideos.cakeId, set: row });
  if (old) await removePublic(db, [old.v1080, old.v1440, old.still]);
  return { ok: true, video: { still, v1080, v1440 } };
}

/** Remove: the card shows the main photo again and has no corner button. */
export async function removeCardVideo(db: Db, cakeId: number) {
  const old = await cardVideoOf(db, cakeId);
  await db.delete(cakeCardVideos).where(eq(cakeCardVideos.cakeId, cakeId));
  if (old) await removePublic(db, [old.v1080, old.v1440, old.still]);
}
