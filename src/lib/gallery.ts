// The gallery page (SITE-FLOWS §4.8): Linda's showing photos in her order, 12 to a page.
import { OCCASIONS, type Occasion } from "./constants";

export const GALLERY_PAGE = 12;

export type GalleryPhotoRow = {
  id: number;
  caption: string;
  altText: string;
  imagePath: string | null;
  occasion: string | null;
  showing: boolean;
  position: number;
};

export type GalleryTile = {
  id: number;
  caption: string;
  /** The photo's alt text, or its caption. */
  alt: string;
  src: string | null;
  /** “Weddings”, or null (§4.8 Caption and occasion). */
  occasion: string | null;
};

const occasionLabel = (key: string | null) =>
  OCCASIONS.find((o) => o.key === (key as Occasion))?.label ?? null;

/** Only showing photos, in Linda's gallery order (§4.8 Grid). */
export function galleryTiles(rows: GalleryPhotoRow[]): GalleryTile[] {
  return rows
    .filter((r) => r.showing)
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((r) => ({
      id: r.id,
      caption: r.caption,
      alt: r.altText || r.caption,
      src: r.imagePath,
      occasion: occasionLabel(r.occasion),
    }));
}

/**
 * How many tiles a `?shown=` asks for (§4.8 Paging, as the catalogue §4.2): whole pages of 12, at least one
 * page, never more than there are. Anything else (missing, not a number) → one page.
 */
export function shownCount(param: string | null | undefined, total: number) {
  const asked = Number.parseInt(param ?? "", 10);
  const pages = Number.isFinite(asked)
    ? Math.max(1, Math.ceil(asked / GALLERY_PAGE))
    : 1;
  return Math.min(total, pages * GALLERY_PAGE);
}

/** “Show the next N”: N = min(12, photos still to come); 0 when nothing remains (the button hides). */
export function nextCount(shown: number, total: number) {
  return Math.max(0, Math.min(GALLERY_PAGE, total - shown));
}

/** The intro (§4.8); its first sentence is the page description (§10.12). */
export const GALLERY_INTRO =
  "A few of the cakes I have made for birthdays, weddings and everything in between. Every one started as somebody’s idea — yours could be next.";

/**
 * Sample photos for development and previews (CLAUDE.md §7): the twelve captions drawn in Figma (1633:11617)
 * and more in the same style, so paging can be tried (“Showing 12 of 30”). No pictures yet: every tile shows
 * the lilac base until Linda uploads her photos (§0.6).
 */
export const SAMPLE_GALLERY: {
  caption: string;
  occasion: Occasion | null;
}[] = [
  { caption: "Digger birthday · 2025", occasion: "kids" },
  { caption: "First birthday · 2025", occasion: "birthdays" },
  { caption: "Rosette wedding · 2025", occasion: "weddings" },
  { caption: "Muddy pigs · 2025", occasion: "kids" },
  { caption: "Farmyard 60th · 2024", occasion: "birthdays" },
  { caption: "Engagement · 2024", occasion: null },
  { caption: "Blue doodle · 2024", occasion: "birthdays" },
  { caption: "Digger party · 2024", occasion: "kids" },
  { caption: "Building site · 2023", occasion: "kids" },
  { caption: "Baby shower · 2023", occasion: null },
  { caption: "Piggy party · 2023", occasion: "kids" },
  { caption: "Anniversary · 2023", occasion: null },
  ...Array.from({ length: 18 }, (_, i) => ({
    caption: `Sample photo ${i + 13} · 2023`,
    occasion: null,
  })),
];
