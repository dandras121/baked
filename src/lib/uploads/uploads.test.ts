import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PictureError, processPicture, sniff } from "./process";
import {
  cleanFileName,
  megabytes,
  PICTURE_COPY,
  pictureKind,
  sortPick,
} from "./rules";
import { pictureLink, pictureLinkValid } from "./sign";

const MB = 1024 * 1024;
const f = (name: string, size = MB, type = "") => ({ name, size, type });

describe("pictures: what is taken (§7.1)", () => {
  it("knows JPG, PNG and HEIC by type or name, nothing else", () => {
    expect(pictureKind("a.JPG", "")).toBe("jpeg");
    expect(pictureKind("a", "image/png")).toBe("png");
    expect(pictureKind("peonies-4.heic", "")).toBe("heic");
    expect(pictureKind("a.gif", "image/gif")).toBeNull();
    expect(pictureKind("notes.pdf", "application/pdf")).toBeNull();
  });

  it("names the first file over 8 MB as drawn (J)", () => {
    const r = sortPick([f("venue.png"), f("peonies-4.heic", 12 * MB - 5)], 0);
    expect(r.take).toEqual([0]);
    expect(r.notice).toEqual({
      title: "That one is too big",
      text: "peonies-4.heic is 12 MB and the limit is 8 MB. JPG, PNG or HEIC, up to three pictures.",
    });
    expect(sortPick([f("a.jpg", 8 * MB)], 0).take).toEqual([0]);
  });

  it("names a wrong type", () => {
    expect(sortPick([f("notes.pdf")], 0).notice?.title).toBe(
      "notes.pdf is not a picture I can open. JPG, PNG or HEIC, up to three pictures.",
    );
  });

  it("keeps the first three, counting those already on the form", () => {
    const four = [f("1.jpg"), f("2.jpg"), f("3.jpg"), f("4.jpg")];
    expect(sortPick(four, 0)).toEqual({
      take: [0, 1, 2],
      notice: { title: PICTURE_COPY.keptThree },
    });
    expect(sortPick(four, 2).take).toEqual([0]);
    expect(sortPick([f("1.jpg")], 3).take).toEqual([]);
  });

  it("rounds megabytes up and cleans file names", () => {
    expect(megabytes(8 * MB + 1)).toBe("9 MB");
    expect(cleanFileName("C:\\Users\\me\\cake.jpg")).toBe("cake.jpg");
    expect(cleanFileName("x".repeat(200)).length).toBe(118);
  });

  it("says how many it is waiting for", () => {
    expect(PICTURE_COPY.waiting(1)).toBe("Waiting for 1 picture…");
    expect(PICTURE_COPY.waiting(2)).toBe("Waiting for 2 pictures…");
  });
});

describe("pictures: the server copy (§7.1)", () => {
  it("reads the type from the bytes", () => {
    expect(sniff(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    const heic = new Uint8Array(16);
    heic.set(new TextEncoder().encode("ftypheic"), 4);
    expect(sniff(heic)).toBe("heic");
    expect(sniff(new TextEncoder().encode("hello, not a picture"))).toBeNull();
  });

  it("makes an upright JPEG without metadata, and a square thumbnail", async () => {
    const png = await sharp({
      create: { width: 3000, height: 1200, channels: 3, background: "#c9a" },
    })
      .withMetadata({ exif: { IFD0: { Copyright: "GPS here" } } })
      .png()
      .toBuffer();
    const p = await processPicture(png);
    expect([p.width, p.height]).toEqual([2400, 960]);
    const meta = await sharp(p.file).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    const t = await sharp(p.thumb).metadata();
    expect([t.width, t.height]).toEqual([400, 400]);
  });

  it("refuses what is not a picture, or too big", async () => {
    await expect(processPicture(Buffer.from("plain text"))).rejects.toEqual(
      new PictureError("type"),
    );
    await expect(
      processPicture(
        Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(8)]),
      ),
    ).rejects.toBeInstanceOf(PictureError);
    await expect(processPicture(Buffer.alloc(8 * MB + 1))).rejects.toEqual(
      new PictureError("size"),
    );
  });
});

describe("pictures: signed links (§10.10)", () => {
  it("open only the picture and size signed, until they expire", () => {
    const id = "4b0c0e7e-1111-4222-8333-944455556666";
    const now = Date.now();
    const q = new URL(pictureLink(id, "thumb", now), "http://x").searchParams;
    const [u, s] = [q.get("u"), q.get("s")];
    expect(pictureLinkValid(id, "thumb", u, s, now + 1000)).toBe(true);
    expect(pictureLinkValid(id, "file", u, s, now)).toBe(false);
    expect(pictureLinkValid(id.replace("4b", "5b"), "thumb", u, s, now)).toBe(
      false,
    );
    expect(pictureLinkValid(id, "thumb", u, s, now + 25 * 3600 * 1000)).toBe(
      false,
    );
    expect(pictureLinkValid(id, "thumb", u, "forged", now)).toBe(false);
  });
});
