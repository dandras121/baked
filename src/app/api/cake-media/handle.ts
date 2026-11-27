// What both upload routes do with a file once it is here (§9.13): a photo, a video (answered at once, converted after
// the answer) or a video's new cover.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  addCakePhoto,
  finishCakeVideo,
  setVideoCover,
  startCakeVideo,
  type AdminMedia,
} from "@/db/cake-media-repo";
import { connect } from "@/db/client";
import { CAKE_PHOTO, PHOTO_WORDS } from "@/lib/uploads/cake-photo";
import { CAKE_VIDEO, VIDEO_WORDS } from "@/lib/uploads/cake-video";

export type MediaKind = "photo" | "video" | "cover";
export const kindOf = (v: unknown): MediaKind =>
  v === "video" || v === "cover" ? v : "photo";
export const maxBytes = (k: MediaKind) =>
  k === "video" ? CAKE_VIDEO.maxBytes : CAKE_PHOTO.maxBytes;
export const tooBig = (k: MediaKind, bytes: number) =>
  k === "video" ? VIDEO_WORDS.size(bytes) : PHOTO_WORDS.size(bytes);
export const TYPES = {
  photo: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  video: ["video/mp4", "video/quicktime"],
};

type Db = ReturnType<typeof connect>["db"];

export async function handleMedia(
  db: Db,
  input: { cakeId: number; kind: MediaKind; mediaId?: number; data: Buffer },
): Promise<{ media?: AdminMedia; poster?: string; words?: string }> {
  if (input.kind === "cover") {
    const r = await setVideoCover(
      db,
      input.cakeId,
      Number(input.mediaId),
      input.data,
    );
    return r.ok ? { poster: r.poster } : { words: r.words };
  }
  if (input.kind === "video") {
    const r = await startCakeVideo(db, input.cakeId);
    if (!r.ok) return { words: r.words };
    const { cakeId, data } = input;
    // The conversion runs after the answer; the tile shows “Preparing the video…” until it is ready.
    after(async () => {
      const c = connect();
      try {
        await finishCakeVideo(c.db, cakeId, r.media.id, data);
        // The cake page shows it from the next load, even when the admin page was closed meanwhile.
        try {
          revalidatePath("/cakes/[slug]", "page");
        } catch {
          // Outside a request (tests): nothing to refresh.
        }
      } finally {
        await c.close();
      }
    });
    return { media: r.media };
  }
  const r = await addCakePhoto(db, input.cakeId, input.data);
  return r.ok ? { media: r.media } : { words: r.words };
}
