// The cake page (SITE-FLOWS §5.1, Step 1 — The cake): what it shows of a cake. Pure; src/db/cake-page-repo.ts reads it.
import type { OptionView, SizeView } from "./cake-config";
import { tierLine as sizeTierLine } from "./cake-config";
import type { AllergenSet } from "./cakes";
import { formatPrice } from "./money";

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
  /** Sorted by serves; the smallest is pre-selected (§5.1). */
  sizes: SizeView[];
  /** Linda's options in her order (§5.8). */
  options: OptionView[];
  offerInscription: boolean;
  allergens: AllergenSet;
};

export function cakePage(
  cake: {
    slug: string;
    name: string;
    whatItIs: string;
    offerInscription: boolean;
  } & AllergenSet,
  sizes: SizeView[],
  media: MediaItem[],
  options: OptionView[] = [],
): CakePageData {
  const sorted = [...sizes].sort((a, b) => a.serves - b.serves);
  const smallest = sorted[0];
  return {
    slug: cake.slug,
    name: cake.name,
    whatItIs: cake.whatItIs,
    offerInscription: cake.offerInscription,
    allergens: {
      allergens: cake.allergens,
      glutenKinds: cake.glutenKinds,
      nutKinds: cake.nutKinds,
      alsoContains: cake.alsoContains,
    },
    sizes: sorted,
    options,
    tierLine: smallest ? sizeTierLine(smallest) : "",
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
