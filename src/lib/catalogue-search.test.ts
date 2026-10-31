import { describe, expect, it } from "vitest";
import type { CatalogueCake } from "./catalogue";
import {
  normalise,
  searchCakes,
  searchCountLine,
  searchText,
} from "./catalogue-search";

const cake = (name: string, flavour = "", whatItIs = ""): CatalogueCake => ({
  slug: name.toLowerCase().replace(/\W+/g, "-"),
  name,
  flavour,
  whatItIs,
  tiers: "Two tiers",
  serves: "Serves 24",
  from: "From £185",
  categories: [],
  cardVideo: null,
});

const list = [
  cake("Wee Beastie", "Chocolate fudge sponge, cookies-and-cream buttercream"),
  cake("Cocoa & Sea Salt", "Chocolate sponge, salted caramel"),
  cake("Crème Brûlée", "Vanilla", "A caramelised top"),
  cake("Midnight Berry", "Dark chocolate sponge, blackberry compote"),
  cake("Choc Drop", "Vanilla"),
];

describe("§4.2 search matching", () => {
  it("case, accents, quotes and spaces are ignored", () => {
    expect(normalise("  Crème   Brûlée’s ")).toBe("creme brulee's");
    expect(searchCakes(list, "creme").map((c) => c.name)).toEqual([
      "Crème Brûlée",
    ]);
    expect(searchCakes(list, "CARAMELISED").map((c) => c.name)).toEqual([
      "Crème Brûlée",
    ]);
  });
  it("name matches first, then flavour / what it is, each in catalogue order", () => {
    expect(searchCakes(list, "choc").map((c) => c.name)).toEqual([
      "Choc Drop",
      "Wee Beastie",
      "Cocoa & Sea Salt",
      "Midnight Berry",
    ]);
  });
  it("every word must match, in any field and any order", () => {
    expect(searchCakes(list, "salt chocolate").map((c) => c.name)).toEqual([
      "Cocoa & Sea Salt",
    ]);
    expect(searchCakes(list, "salt berry")).toEqual([]);
  });
  it("from 2 characters, at most 60, trimmed", () => {
    expect(searchText("c")).toBeNull();
    expect(searchText("  c  ")).toBeNull();
    expect(searchText(" ch ")).toBe("ch");
    expect(searchText("x".repeat(80))).toHaveLength(60);
  });
  it("the count line names the word; more than a page pages as usual", () => {
    expect(searchCountLine(3, 3, "choc", 12)).toBe("3 designs for “choc”");
    expect(searchCountLine(1, 1, "lemon", 12)).toBe("1 design for “lemon”");
    expect(searchCountLine(12, 15, "sponge", 12)).toBe(
      "Showing 12 of 15 for “sponge”",
    );
  });
});
