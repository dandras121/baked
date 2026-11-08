// Signed links to a private picture (§10.10: “signed URLs, admin only”). The customer's own tiles get a thumbnail
// link for as long as the form is open; anything else needs a fresh signature. The link names the picture, the size
// and the moment it stops working.
import { createHmac, timingSafeEqual } from "node:crypto";

export type PictureSize = "thumb" | "file";

/** A day: the form can stay open in a tab overnight; after that the picture has been deleted anyway (§12). */
export const PICTURE_LINK_MS = 24 * 60 * 60 * 1000;

function sign(id: string, size: PictureSize, until: number) {
  return createHmac("sha256", process.env.RATE_LIMIT_SALT || "bbl-development")
    .update(`picture:${id}:${size}:${until}`)
    .digest("base64url")
    .slice(0, 27);
}

export function pictureLink(
  id: string,
  size: PictureSize,
  now = Date.now(),
  validMs = PICTURE_LINK_MS,
) {
  const until = now + validMs;
  return `/api/pictures/${id}/${size}?u=${until.toString(36)}&s=${sign(id, size, until)}`;
}

export function pictureLinkValid(
  id: string,
  size: PictureSize,
  u: string | null,
  s: string | null,
  now = Date.now(),
) {
  const until = parseInt(u ?? "", 36);
  if (!s || !Number.isFinite(until) || until < now) return false;
  const want = Buffer.from(sign(id, size, until));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got);
}
