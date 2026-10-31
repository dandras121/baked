// The full range (SITE-FLOWS §4.2): the visible designs in Linda's order, the four occasion pills, 12 at a time.
import { OCCASIONS, type Occasion } from "./constants";
import { cakeCard, type CakeCardData, type CakeRow } from "./home-content";
import { numberInWords } from "./words";

export const CATALOGUE_PAGE = 12;

export type CatalogueCake = CakeCardData & {
  categories: Occasion[];
  /** For the search (3.3): the cake's name, Flavour and “What it is”. */
  whatItIs: string;
};

/** Every visible, not deleted design in Linda's order, with what the filters need. */
export function catalogueCakes(rows: CakeRow[]): CatalogueCake[] {
  return rows
    .filter((c) => c.visible && !c.deleted)
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => {
      const card = cakeCard(c);
      return card
        ? [
            {
              ...card,
              categories: (c.categories ?? []).filter((k): k is Occasion =>
                OCCASIONS.some((o) => o.key === k),
              ),
              whatItIs: c.whatItIs ?? "",
            },
          ]
        : [];
    });
}

/** The pills offered: All designs, then each occasion that has at least one visible cake (§4.2), in the fixed order. */
export function offeredOccasions(cakes: CatalogueCake[]) {
  return OCCASIONS.filter((o) =>
    cakes.some((c) => c.categories.includes(o.key)),
  );
}

/** `?occasion=` → a known occasion key, or null (All designs). */
export function parseOccasion(
  param: string | null | undefined,
): Occasion | null {
  return OCCASIONS.find((o) => o.key === param)?.key ?? null;
}

export function inOccasion(cakes: CatalogueCake[], occasion: Occasion | null) {
  return occasion
    ? cakes.filter((c) => c.categories.includes(occasion))
    : cakes;
}

/** `?shown=` → whole pages of 12, at least one page, never more than there are (as the gallery). */
export function catalogueShown(
  param: string | null | undefined,
  total: number,
) {
  const asked = Number.parseInt(param ?? "", 10);
  const pages = Number.isFinite(asked)
    ? Math.max(1, Math.ceil(asked / CATALOGUE_PAGE))
    : 1;
  return Math.min(total, pages * CATALOGUE_PAGE);
}

export function nextCatalogueCount(shown: number, total: number) {
  return Math.max(0, Math.min(CATALOGUE_PAGE, total - shown));
}

/**
 * The count line under the grid (§4.2): more than a page → “Showing 12 of 24”; a page or less → “{N} designs”, in
 * words one to nine (“One design”, “Seven designs”), digits from 10 (“12 designs”).
 */
export function countLine(shown: number, total: number): string {
  if (total > CATALOGUE_PAGE)
    return `Showing ${Math.min(shown, total)} of ${total}`;
  if (total >= 10) return `${total} designs`;
  const words = numberInWords(total);
  const word = words.charAt(0).toUpperCase() + words.slice(1);
  return `${word} ${total === 1 ? "design" : "designs"}`;
}

/** The address that keeps the state (§4.2 URL state): `/cakes?occasion=weddings&shown=24`. */
export function catalogueHref(occasion: Occasion | null, shown: number | null) {
  const p = new URLSearchParams();
  if (occasion) p.set("occasion", occasion);
  // Whole pages, as the address is read back (`?shown=24` for 13–24 cards).
  if (shown && shown > CATALOGUE_PAGE)
    p.set("shown", String(Math.ceil(shown / CATALOGUE_PAGE) * CATALOGUE_PAGE));
  const q = p.toString();
  return q ? `/cakes?${q}` : "/cakes";
}
