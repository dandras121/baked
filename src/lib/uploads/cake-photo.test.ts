import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CakePhotoError, PHOTO_WORDS, processCakePhoto } from "./cake-photo";

const jpeg = (w: number, h: number) =>
  sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 200, g: 150, b: 180 },
    },
  })
    .jpeg()
    .toBuffer();

describe("a cake photo (§9.13)", () => {
  it("keeps a big photo upright, at most 2400 px on the long side, as JPEG", async () => {
    const r = await processCakePhoto(await jpeg(3000, 2000));
    expect([r.width, r.height]).toEqual([2400, 1600]);
    expect((await sharp(r.data).metadata()).format).toBe("jpeg");
  });

  it("refuses one under 1600 px on the long side, a non-photo and one over 15 MB, with the words", async () => {
    await expect(processCakePhoto(await jpeg(1500, 1000))).rejects.toEqual(
      new CakePhotoError(PHOTO_WORDS.small),
    );
    await expect(
      processCakePhoto(Buffer.from("GIF89a not a photo")),
    ).rejects.toEqual(new CakePhotoError(PHOTO_WORDS.type));
    const big = Buffer.alloc(15 * 1024 * 1024 + 1);
    await expect(processCakePhoto(big)).rejects.toEqual(
      new CakePhotoError(
        "That photo is 16 MB — the limit is 15 MB. Nothing was added.",
      ),
    );
  });

  it("a 1600 px photo is enough", async () => {
    const r = await processCakePhoto(await jpeg(1280, 1600));
    expect([r.width, r.height]).toEqual([1280, 1600]);
  });
});
