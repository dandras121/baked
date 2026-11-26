// A cake photo (§9.13): JPG, PNG or HEIC (HEIC converted on the server), at most 15 MB, at least 1600 px on the long
// side. The site's copy is upright, without metadata, at most 2400 px on the long side; the previews use it too.
import heicConvert from "heic-convert";
import sharp from "sharp";
import { megabytes } from "./rules";
import { sniff } from "./process";

export const CAKE_PHOTO = {
  maxBytes: 15 * 1024 * 1024,
  minLongSide: 1600,
  longest: 2400,
} as const;

export class CakePhotoError extends Error {
  constructor(readonly words: string) {
    super(words);
  }
}

/** The words next to Add photos when one is refused (Proposal; nothing is added). */
export const PHOTO_WORDS = {
  type: "That file is not a JPG, PNG or HEIC photo. Nothing was added.",
  size: (bytes: number) =>
    `That photo is ${megabytes(bytes)} — the limit is 15 MB. Nothing was added.`,
  small:
    "That photo is too small — it needs at least 1600 pixels on its long side. Nothing was added.",
};

export async function processCakePhoto(
  input: Buffer,
): Promise<{ data: Buffer; width: number; height: number }> {
  if (input.length > CAKE_PHOTO.maxBytes)
    throw new CakePhotoError(PHOTO_WORDS.size(input.length));
  const kind = sniff(input);
  if (!kind) throw new CakePhotoError(PHOTO_WORDS.type);
  let source = input;
  if (kind === "heic") {
    try {
      source = Buffer.from(
        await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 }),
      );
    } catch {
      throw new CakePhotoError(PHOTO_WORDS.type);
    }
  }
  try {
    const upright = sharp(source, { failOn: "error" }).rotate();
    const meta = await upright.metadata();
    // After rotate() the long side is the same either way.
    const long = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (long < CAKE_PHOTO.minLongSide)
      throw new CakePhotoError(PHOTO_WORDS.small);
    const { data, info } = await upright
      .resize(CAKE_PHOTO.longest, CAKE_PHOTO.longest, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch (e) {
    if (e instanceof CakePhotoError) throw e;
    throw new CakePhotoError(PHOTO_WORDS.type);
  }
}
