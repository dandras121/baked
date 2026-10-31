import { describe, expect, it } from "vitest";
import {
  GALLERY_INTRO,
  galleryTiles,
  nextCount,
  photoIndex,
  shownFor,
  stepPhoto,
  SAMPLE_GALLERY,
  shownCount,
  type GalleryPhotoRow,
} from "./gallery";

const row = (
  id: number,
  over: Partial<GalleryPhotoRow> = {},
): GalleryPhotoRow => ({
  id,
  caption: `Cake ${id}`,
  altText: "",
  imagePath: null,
  occasion: null,
  showing: true,
  position: id,
  ...over,
});

describe("§4.8 gallery tiles", () => {
  it("only showing photos, in Linda's order", () => {
    const tiles = galleryTiles([
      row(1, { position: 3 }),
      row(2, { position: 1 }),
      row(3, { showing: false, position: 2 }),
    ]);
    expect(tiles.map((t) => t.id)).toEqual([2, 1]);
  });
  it("alt text falls back to the caption; the occasion is its label", () => {
    const [t] = galleryTiles([row(1, { occasion: "kids" })]);
    expect(t).toMatchObject({
      alt: "Cake 1",
      occasion: "Kids’ parties",
      src: null,
    });
    expect(galleryTiles([row(1, { altText: "A digger cake" })])[0].alt).toBe(
      "A digger cake",
    );
  });
  it("no showing photos → empty (the empty state)", () => {
    expect(galleryTiles([row(1, { showing: false })])).toEqual([]);
  });
});

describe("§4.8 paging: 12 at a time, ?shown= in whole pages", () => {
  it.each([
    [null, 30, 12],
    ["24", 30, 24],
    ["13", 30, 24],
    ["999", 30, 30],
    ["0", 30, 12],
    ["-5", 30, 12],
    ["abc", 30, 12],
    ["24", 5, 5],
    [null, 0, 0],
  ])("shown=%s of %i → %i", (param, total, want) =>
    expect(shownCount(param, total)).toBe(want),
  );
  it("Show the next N: N = min(12, still to come); 0 at the end", () => {
    expect(nextCount(12, 30)).toBe(12);
    expect(nextCount(24, 30)).toBe(6);
    expect(nextCount(30, 30)).toBe(0);
  });
});

describe("§4.8 copy and samples", () => {
  it("the description is the intro's first sentence", () => {
    expect(GALLERY_INTRO.split(". ")[0] + ".").toBe(
      "A few of the cakes I have made for birthdays, weddings and everything in between.",
    );
  });
  it("thirty samples, the twelve Figma captions first, every caption ≤ 80", () => {
    expect(SAMPLE_GALLERY).toHaveLength(30);
    expect(SAMPLE_GALLERY[0].caption).toBe("Digger birthday · 2025");
    expect(SAMPLE_GALLERY[11].caption).toBe("Anniversary · 2023");
    for (const p of SAMPLE_GALLERY)
      expect(p.caption.length).toBeLessThanOrEqual(80);
  });
});

describe("§4.8 lightbox address and steps", () => {
  const tiles = galleryTiles([
    row(5),
    row(7),
    row(9, { showing: false }),
    row(11),
  ]);
  it("?photo=<id> → its place; unknown, hidden or nonsense → nothing", () => {
    expect(photoIndex(tiles, "7")).toBe(1);
    expect(photoIndex(tiles, "9")).toBeNull();
    expect(photoIndex(tiles, "404")).toBeNull();
    expect(photoIndex(tiles, "7abc")).toBeNull();
    expect(photoIndex(tiles, null)).toBeNull();
  });
  it("‹ › stop at the ends", () => {
    expect(stepPhoto(0, -1, 3)).toBeNull();
    expect(stepPhoto(0, 1, 3)).toBe(1);
    expect(stepPhoto(2, 1, 3)).toBeNull();
  });
  it("moving past the loaded tiles loads the next page", () => {
    expect(shownFor(11, 12, 30)).toBe(12);
    expect(shownFor(12, 12, 30)).toBe(24);
    expect(shownFor(29, 12, 30)).toBe(30);
  });
});
