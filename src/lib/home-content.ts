// What the Home cake row and the "Special idea?" squares show (§4.1, §9.18, §11.3). Pure rules, tested
// without a database; src/db/home-repo.ts reads the rows.
import { formatPrice } from "./money";
import { numberInWords } from "./words";

export type CakeSize = { serves: number; tiers: number; pricePence: number };

export type CakeRow = {
  slug: string;
  name: string;
  flavour: string;
  visible: boolean;
  deleted: boolean;
  position: number;
  sizes: CakeSize[];
};

export type CakeCardData = {
  slug: string;
  name: string;
  flavour: string;
  /** The smallest size's tiers, e.g. "Two tiers". */
  tiers: string;
  /** The smallest size's serves, e.g. "Serves 24". */
  serves: string;
  /** "From £185" — the smallest price. */
  from: string;
};

/** The Home row holds the first five visible designs in Linda's order (§4.1, §11.3). */
export const HOME_CAKES = 5;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The closed card's text (§4.1): tier line of the smallest size, "From £{smallest price}". */
export function cakeCard(cake: CakeRow): CakeCardData | null {
  if (cake.sizes.length === 0) return null;
  const smallest = [...cake.sizes].sort((a, b) => a.serves - b.serves)[0];
  const cheapest = Math.min(...cake.sizes.map((s) => s.pricePence));
  const tiers = `${capital(numberInWords(smallest.tiers))} ${smallest.tiers === 1 ? "tier" : "tiers"}`;
  return {
    slug: cake.slug,
    name: cake.name,
    flavour: cake.flavour,
    tiers,
    serves: `Serves ${smallest.serves}`,
    from: `From ${formatPrice(cheapest)}`,
  };
}

/** The first five visible, not deleted designs, in Linda's order. */
export function homeCakes(rows: CakeRow[]): CakeCardData[] {
  return rows
    .filter((c) => c.visible && !c.deleted)
    .sort((a, b) => a.position - b.position)
    .map(cakeCard)
    .filter((c): c is CakeCardData => c !== null)
    .slice(0, HOME_CAKES);
}

export type GalleryRow = {
  id: number;
  caption: string;
  altText: string;
  imagePath: string | null;
  showing: boolean;
  homeOrder: number | null;
  createdAt: Date;
};

export type GallerySquare = { id: number; src: string | null; alt: string };

/**
 * "Special idea?" (§4.1, Decided 2026-10-16): Linda's four Home picks in her order; fewer than four →
 * the newest showing photos fill the rest; fewer than four showing → empty squares (null) show the
 * placeholder background. Alt text = the photo's alt text, or its caption. Hidden photos never show.
 */
export function homeSquares(rows: GalleryRow[]): {
  squares: (GallerySquare | null)[];
  galleryLink: boolean;
} {
  const showing = rows.filter((r) => r.showing);
  const picks = showing
    .filter((r) => r.homeOrder !== null)
    .sort((a, b) => a.homeOrder! - b.homeOrder!);
  const rest = showing
    .filter((r) => r.homeOrder === null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const chosen = [...picks, ...rest].slice(0, 4).map((r) => ({
    id: r.id,
    src: r.imagePath,
    alt: r.altText || r.caption,
  }));
  return {
    squares: [...chosen, ...Array<null>(4 - chosen.length).fill(null)],
    galleryLink: showing.length > 0,
  };
}
