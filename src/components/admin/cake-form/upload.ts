// Sending one file of Edit a cake to the store (§9.13): the photos, the videos, a video's cover and the card video.
import type { AdminMedia } from "@/db/cake-media-repo";
import type { CardVideo } from "@/lib/home-content";
import type { BlobMode } from "@/lib/storage";
import { videoType } from "@/lib/uploads/video-rules";

export type Answer = {
  media?: AdminMedia;
  poster?: string;
  card?: CardVideo;
  words?: string;
};
type Kind = "photo" | "video" | "cover" | "card";
const isVideo = (k: Kind) => k === "video" || k === "card";

/** A video's length and size from the browser's own reading of it; null when it cannot read it (the server checks). */
export function videoMeta(
  file: File,
): Promise<{ seconds: number; w: number; h: number } | null> {
  return new Promise((done) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const end = (r: { seconds: number; w: number; h: number } | null) => {
      URL.revokeObjectURL(url);
      done(r);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () =>
      end(
        Number.isFinite(v.duration)
          ? { seconds: v.duration, w: v.videoWidth, h: v.videoHeight }
          : null,
      );
    v.onerror = () => end(null);
    setTimeout(() => end(null), 10_000);
    v.src = url;
  });
}

export const videoLength = async (file: File) =>
  (await videoMeta(file))?.seconds ?? null;

/**
 * One file to the store: straight to the Blob store when one is connected (a photo 15 MB, a video 500 MB), else
 * through the site. kind: a photo, a video, a new cover for the video mediaId, or the card video.
 */
export async function upload(
  file: File,
  cakeId: number,
  direct: BlobMode,
  kind: Kind = "photo",
  mediaId?: number,
): Promise<Answer> {
  const what = isVideo(kind) ? "video" : "photo";
  try {
    if (direct) {
      const { upload: up, uploadPresigned } =
        await import("@vercel/blob/client");
      const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-80) || "photo";
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const type = isVideo(kind)
        ? videoType(file.name, file.type)
        : file.type ||
          (ext === "heic" || ext === "heif"
            ? "image/heic"
            : ext === "png"
              ? "image/png"
              : "image/jpeg");
      const stored = await (direct === "token" ? up : uploadPresigned)(
        `incoming/cakes/${cakeId}/${crypto.randomUUID()}-${safe}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/cake-media/blob",
          clientPayload: JSON.stringify({ cakeId, kind }),
          contentType: type,
          multipart: isVideo(kind) && file.size > 50 * 1024 * 1024,
        },
      );
      const r = await fetch("/api/cake-media/blob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finish: stored.pathname,
          cakeId,
          kind,
          mediaId,
        }),
      });
      return await r.json();
    }
    const body = new FormData();
    body.set("file", file);
    body.set("cakeId", String(cakeId));
    body.set("kind", kind);
    if (mediaId) body.set("mediaId", String(mediaId));
    const r = await fetch("/api/cake-media", { method: "POST", body });
    return await r.json().catch(() => ({
      words: `That ${what} did not go through — nothing was added. Try a smaller one.`,
    }));
  } catch {
    return {
      words: `That ${what} did not go through — nothing was added. Please try again.`,
    };
  }
}
