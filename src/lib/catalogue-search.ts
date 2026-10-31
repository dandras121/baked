// The catalogue search (SITE-FLOWS §4.2, Decided 2026-10-21): name, Flavour and “What it is” of the visible
// designs, inside the selected pill; name matches first, then the others, each in catalogue order.
import type { CatalogueCake } from "./catalogue";

export const SEARCH = {
  /** The grid filters from 2 characters … */
  minLength: 2,
  /** … at most 60 … */
  maxLength: 60,
  /** … 250 ms after the last key (§4.2). */
  debounceMs: 250,
} as const;

/** Case, accents, curly quotes and spaces ignored: “Crème  brûlée’s” → “creme brulee's”. */
export function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The search text as used: trimmed, at most 60 characters; null when under 2 (the normal list shows). */
export function searchText(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim().slice(0, SEARCH.maxLength).trim();
  return text.length >= SEARCH.minLength ? text : null;
}

/** Every word must be found, in any of the three fields, in any order. */
export function searchCakes(
  cakes: CatalogueCake[],
  text: string,
): CatalogueCake[] {
  const words = normalise(text).split(" ").filter(Boolean);
  const all = (hay: string) => words.every((w) => hay.includes(w));
  const named: CatalogueCake[] = [];
  const others: CatalogueCake[] = [];
  for (const c of cakes) {
    const name = normalise(c.name);
    if (all(name)) named.push(c);
    else if (all(`${name} ${normalise(c.flavour)} ${normalise(c.whatItIs)}`))
      others.push(c);
  }
  return [...named, ...others];
}

/** “3 designs for “choc””, “1 design for …”, more than a page: “Showing 12 of 15 for “choc”” (§4.2). */
export function searchCountLine(
  shown: number,
  total: number,
  text: string,
  page: number,
) {
  if (total > page)
    return `Showing ${Math.min(shown, total)} of ${total} for “${text}”`;
  return `${total} ${total === 1 ? "design" : "designs"} for “${text}”`;
}
