// Cakes list (§9.13): the words, the filters and the search.
import type { AdminCake } from "@/db/admin-cakes-repo";
import { formatPrice } from "@/lib/money";

/** The filters as drawn (940:8399): All · Showing · Hidden · one per category. */
export const CAKE_FILTERS = [
  { key: "all", label: "All" },
  { key: "showing", label: "Showing" },
  { key: "hidden", label: "Hidden" },
  { key: "birthdays", label: "Birthdays" },
  { key: "weddings", label: "Weddings" },
  { key: "kids", label: "Kids’ parties" },
  { key: "corporate", label: "Corporate" },
] as const;
export type CakeFilter = (typeof CAKE_FILTERS)[number]["key"];

/** “26 designs · 24 showing on the site” (§11.3). */
export const cakesCount = (all: AdminCake[]) => {
  const showing = all.filter((c) => c.visible).length;
  return {
    designs: `${all.length} ${all.length === 1 ? "design" : "designs"}`,
    showing: `${showing} showing`,
  };
};

/** “serves 24 · from £185”: the smallest size. */
export const sizeSummary = (c: AdminCake) =>
  c.serves === null || c.fromPence === null
    ? "No size yet"
    : `serves ${c.serves} · from ${formatPrice(c.fromPence)}`;

const norm = (s: string) =>
  s.toLocaleLowerCase("en-GB").normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** Filter and search (“Search by name or flavour”: name, Flavour and What it is). */
export function shownCakes(
  all: AdminCake[],
  filter: CakeFilter,
  query: string,
) {
  const q = norm(query.trim());
  return all.filter((c) => {
    if (filter === "showing" && !c.visible) return false;
    if (filter === "hidden" && c.visible) return false;
    if (
      filter !== "all" &&
      filter !== "showing" &&
      filter !== "hidden" &&
      !c.categories.includes(filter)
    )
      return false;
    return (
      !q || [c.name, c.flavour, c.whatItIs].some((t) => norm(t).includes(q))
    );
  });
}

/** One step of a keyboard move (arrow up / down on the handle). */
export function moved<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}
