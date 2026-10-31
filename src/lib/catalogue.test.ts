import { describe, expect, it } from "vitest";
import {
  catalogueCakes,
  catalogueHref,
  catalogueShown,
  countLine,
  inOccasion,
  nextCatalogueCount,
  offeredOccasions,
  parseOccasion,
} from "./catalogue";
import type { CakeRow } from "./home-content";

const row = (n: number, over: Partial<CakeRow> = {}): CakeRow => ({
  slug: `cake-${n}`,
  name: `Cake ${n}`,
  flavour: "Vanilla",
  visible: true,
  deleted: false,
  position: n,
  sizes: [{ serves: 24, tiers: 2, pricePence: 18500 }],
  categories: ["birthdays"],
  whatItIs: "A cake",
  ...over,
});

describe("§4.2 the designs", () => {
  it("visible, not deleted, in Linda's order; unknown categories dropped", () => {
    const list = catalogueCakes([
      row(3),
      row(1, { categories: ["weddings", "christmas"] }),
      row(2, { visible: false }),
      row(4, { deleted: true }),
    ]);
    expect(list.map((c) => c.slug)).toEqual(["cake-1", "cake-3"]);
    expect(list[0].categories).toEqual(["weddings"]);
  });
  it("only occasions with a visible cake are offered, in the fixed order", () => {
    const list = catalogueCakes([
      row(1, { categories: ["weddings"] }),
      row(2, { categories: ["birthdays", "corporate"] }),
    ]);
    expect(offeredOccasions(list).map((o) => o.label)).toEqual([
      "Birthdays",
      "Weddings",
      "Corporate",
    ]);
    expect(inOccasion(list, "weddings").map((c) => c.slug)).toEqual(["cake-1"]);
    expect(inOccasion(list, null)).toHaveLength(2);
  });
  it("?occasion= takes only the four keys", () => {
    expect(parseOccasion("kids")).toBe("kids");
    expect(parseOccasion("christmas")).toBeNull();
    expect(parseOccasion(null)).toBeNull();
  });
});

describe("§4.2 paging and the count line", () => {
  it.each([
    [null, 24, 12],
    ["24", 24, 24],
    ["13", 30, 24],
    ["999", 14, 14],
    ["x", 14, 12],
  ])("shown=%s of %i → %i", (p, total, want) =>
    expect(catalogueShown(p, total)).toBe(want),
  );
  it("Show the next N = min(12, still to come)", () => {
    expect(nextCatalogueCount(12, 24)).toBe(12);
    expect(nextCatalogueCount(12, 14)).toBe(2);
    expect(nextCatalogueCount(14, 14)).toBe(0);
  });
  it("more than a page: “Showing x of y”; a page or less: words to nine, digits from 10", () => {
    expect(countLine(12, 24)).toBe("Showing 12 of 24");
    expect(countLine(24, 24)).toBe("Showing 24 of 24");
    expect(countLine(12, 12)).toBe("12 designs");
    expect(countLine(10, 10)).toBe("10 designs");
    expect(countLine(7, 7)).toBe("Seven designs");
    expect(countLine(1, 1)).toBe("One design");
  });
  it("the address keeps the occasion and pages beyond the first", () => {
    expect(catalogueHref(null, null)).toBe("/cakes");
    expect(catalogueHref(null, 12)).toBe("/cakes");
    expect(catalogueHref("weddings", 24)).toBe(
      "/cakes?occasion=weddings&shown=24",
    );
  });
});
