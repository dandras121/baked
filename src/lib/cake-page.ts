// The cake page (SITE-FLOWS §5.1, Step 1 — The cake): what it shows of a cake. Pure; src/db/cake-page-repo.ts reads it.
import { formatPrice } from "./money";
import { numberInWords } from "./words";

export type MediaItem =
  | { kind: "photo"; src: string; alt: string; focalX: number; focalY: number }
  | { kind: "video"; src: string; poster: string | null; alt: string };

export type CakePageData = {
  slug: string;
  name: string;
  whatItIs: string;
  /** The smallest size's tier line, “TWO TIERS · SERVES 24” (it follows the chosen size in 3.6). */
  tierLine: string;
  /** “From £185”: always the smallest price (§5.1). */
  from: string;
  /** Up to 8 photos and 2 videos in Linda's order (§9.13). */
  media: MediaItem[];
};

export function tierLine(tiers: number, serves: number) {
  return `${numberInWords(tiers)} ${tiers === 1 ? "tier" : "tiers"} · serves ${serves}`.toUpperCase();
}

export function cakePage(
  cake: { slug: string; name: string; whatItIs: string },
  sizes: { serves: number; tiers: number; pricePence: number }[],
  media: MediaItem[],
): CakePageData {
  const smallest = [...sizes].sort((a, b) => a.serves - b.serves)[0];
  return {
    ...cake,
    tierLine: smallest ? tierLine(smallest.tiers, smallest.serves) : "",
    from: sizes.length
      ? `From ${formatPrice(Math.min(...sizes.map((s) => s.pricePence)))}`
      : "",
    media,
  };
}

/** “Photo or video 3 of 10” (§5.1 Thumbnails and dots): the name of a dash or a thumbnail. */
export function mediaLabel(items: MediaItem[], i: number) {
  const kinds = new Set(items.map((m) => m.kind));
  const word =
    kinds.size > 1
      ? "Photo or video"
      : items[0]?.kind === "video"
        ? "Video"
        : "Photo";
  return `${word} ${i + 1} of ${items.length}`;
}
