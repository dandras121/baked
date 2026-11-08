// The server copy of a customer picture (§7.1): the bytes decide the type (not the name), HEIC becomes JPEG, the
// picture is turned upright and every piece of metadata (location included) is dropped; a square thumbnail for the
// tiles and for Linda's lists.
import heicConvert from "heic-convert";
import sharp from "sharp";
import { PICTURES, type PictureKind } from "./rules";

/** What the bytes are: JPEG, PNG or HEIC (an ISO-BMFF “ftyp” box with a HEIF brand), else null. */
export function sniff(data: Uint8Array): PictureKind | null {
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (b, i) => data[i] === b,
    )
  )
    return "png";
  const box = new TextDecoder().decode(data.subarray(4, 12));
  if (/^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(box))
    return "heic";
  return null;
}

export type Processed = {
  file: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

export class PictureError extends Error {
  constructor(readonly reason: "type" | "size") {
    super(reason);
  }
}

/** The longest side kept: plenty for Linda to see the detail, small enough to open quickly. */
const LONGEST = 2400;
const THUMB = 400;

export async function processPicture(input: Buffer): Promise<Processed> {
  if (input.length > PICTURES.maxBytes) throw new PictureError("size");
  const kind = sniff(input);
  if (!kind) throw new PictureError("type");
  let source = input;
  if (kind === "heic") {
    try {
      source = Buffer.from(
        await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 }),
      );
    } catch {
      throw new PictureError("type");
    }
  }
  try {
    // rotate() turns the picture upright from its EXIF; sharp writes no metadata unless asked, so location goes.
    const upright = sharp(source, { failOn: "error" }).rotate();
    const { data: file, info } = await upright
      .clone()
      .resize(LONGEST, LONGEST, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumb = await upright
      .clone()
      .resize(THUMB, THUMB, { fit: "cover" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return { file, thumb, width: info.width, height: info.height };
  } catch {
    throw new PictureError("type");
  }
}
