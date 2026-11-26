import { describe, expect, it } from "vitest";
import type { AdminCake } from "@/db/admin-cakes-repo";
import { cakesCount, moved, shownCakes, sizeSummary } from "./cakes";

const cake = (over: Partial<AdminCake>): AdminCake => ({
  id: 1,
  name: "The Lothian",
  flavour: "Vanilla & raspberry",
  whatItIs: "Two tiers of vanilla sponge",
  visible: true,
  categories: ["birthdays", "weddings"],
  serves: 24,
  fromPence: 18500,
  ...over,
});
const list = [
  cake({}),
  cake({
    id: 2,
    name: "Bramble & Cream",
    flavour: "Blackberry",
    whatItIs: "Naked sponge",
    categories: ["birthdays"],
  }),
  cake({
    id: 3,
    name: "Confetti Drum",
    flavour: "Funfetti",
    whatItIs: "Sprinkles",
    visible: false,
    categories: ["kids"],
  }),
];

describe("Cakes list (§9.13)", () => {
  it("counts designs and those showing (§11.3)", () => {
    expect(cakesCount(list)).toEqual({
      designs: "3 designs",
      showing: "2 showing",
    });
    expect(cakesCount([cake({})]).designs).toBe("1 design");
  });
  it("names the smallest size", () => {
    expect(sizeSummary(cake({}))).toBe("serves 24 · from £185");
    expect(sizeSummary(cake({ serves: null, fromPence: null }))).toBe(
      "No size yet",
    );
  });
  it("filters: Showing, Hidden, a category", () => {
    expect(shownCakes(list, "showing", "").map((c) => c.id)).toEqual([1, 2]);
    expect(shownCakes(list, "hidden", "").map((c) => c.id)).toEqual([3]);
    expect(shownCakes(list, "kids", "").map((c) => c.id)).toEqual([3]);
    expect(shownCakes(list, "weddings", "").map((c) => c.id)).toEqual([1]);
  });
  it("searches name, Flavour and What it is, without case or accents", () => {
    expect(shownCakes(list, "all", "bramble").map((c) => c.id)).toEqual([2]);
    expect(shownCakes(list, "all", "FUNFETTI").map((c) => c.id)).toEqual([3]);
    expect(shownCakes(list, "all", "naked").map((c) => c.id)).toEqual([2]);
    expect(shownCakes(list, "all", "zzz")).toEqual([]);
  });
  it("moves one place with the arrow keys, never past the ends", () => {
    expect(moved([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moved([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    const same = [1, 2, 3];
    expect(moved(same, 0, -1)).toBe(same);
  });
});
