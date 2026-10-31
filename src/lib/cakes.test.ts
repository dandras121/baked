import { describe, expect, it } from "vitest";
import {
  allergenLabel,
  cakeProblems,
  fromPricePence,
  sortSizes,
  type CakeInput,
} from "./cakes";
import { SAMPLE_CATALOGUE } from "./sample-catalogue";

const lothian = SAMPLE_CATALOGUE[0];
const withOptions = (options: CakeInput["options"]): CakeInput => ({
  ...lothian,
  options,
});

describe("§11.3 “From £” and sizes", () => {
  it("From = the smallest size price, whatever the order", () => {
    expect(
      fromPricePence([
        { pricePence: 30500 },
        { pricePence: 18500 },
        { pricePence: 24000 },
      ]),
    ).toBe(18500);
    expect(fromPricePence([])).toBeNull();
  });
  it("sizes are sorted by serves", () => {
    expect(
      sortSizes([{ serves: 40 }, { serves: 24 }, { serves: 32 }]).map(
        (s) => s.serves,
      ),
    ).toEqual([24, 32, 40]);
  });
});

describe("§9.13 / §5.8 the rules of a cake", () => {
  it("the sample catalogue keeps every rule; 14 Figma names, unique", () => {
    for (const cake of SAMPLE_CATALOGUE)
      expect(cakeProblems(cake), cake.name).toEqual([]);
    expect(SAMPLE_CATALOGUE).toHaveLength(14);
    expect(
      new Set(SAMPLE_CATALOGUE.map((c) => c.name.toLowerCase())).size,
    ).toBe(14);
  });
  it("name 2–60, what it is and flavour required with their limits", () => {
    expect(cakeProblems({ ...lothian, name: "L" })).toContain("name: 2–60");
    expect(cakeProblems({ ...lothian, name: "x".repeat(61) })).toContain(
      "name: 2–60",
    );
    expect(cakeProblems({ ...lothian, whatItIs: "" })).toContain(
      "what it is: required, max 300",
    );
    expect(cakeProblems({ ...lothian, flavour: "x".repeat(61) })).toContain(
      "flavour: required, max 60",
    );
  });
  it("sizes: at least one, serves 1–500 and unique, price £1–£5,000", () => {
    expect(cakeProblems({ ...lothian, sizes: [] })).toContain(
      "sizes: at least one",
    );
    const s = (serves: number, pricePence = 1000) => ({
      serves,
      tiers: 1,
      pricePence,
    });
    expect(cakeProblems({ ...lothian, sizes: [s(0)] })).toContain(
      "sizes: serves 1–500",
    );
    expect(cakeProblems({ ...lothian, sizes: [s(501)] })).toContain(
      "sizes: serves 1–500",
    );
    expect(cakeProblems({ ...lothian, sizes: [s(10, 99)] })).toContain(
      "sizes: price £1–£5,000",
    );
    expect(cakeProblems({ ...lothian, sizes: [s(10, 500001)] })).toContain(
      "sizes: price £1–£5,000",
    );
    expect(cakeProblems({ ...lothian, sizes: [s(10), s(10)] })).toContain(
      "sizes: two with the same serves",
    );
  });
  it("Decided 2026-10-17: gluten and tree nuts must say which", () => {
    expect(
      cakeProblems({
        ...lothian,
        allergens: ["cereals containing gluten"],
        glutenKinds: "",
      }),
    ).toContain("cake: name the cereals containing gluten");
    expect(
      cakeProblems({ ...lothian, allergens: ["nuts"], nutKinds: " " }),
    ).toContain("cake: name the tree nuts");
  });
  it("options: up to 6, up to 10 choices, add-ons £0–£1,000, Yes/no has one tick, Text no choices", () => {
    const choice = (label: string, pricePence = 0) => ({
      label,
      pricePence,
      allergens: [],
    });
    const opt = (n: number) => ({
      type: "choice" as const,
      label: `O${n}`,
      choices: [choice("a")],
    });
    expect(cakeProblems(withOptions([1, 2, 3, 4, 5, 6].map(opt)))).toEqual([]);
    expect(cakeProblems(withOptions([1, 2, 3, 4, 5, 6, 7].map(opt)))).toContain(
      "options: up to 6",
    );
    const eleven = Array.from({ length: 11 }, (_, i) => choice(`c${i}`));
    expect(
      cakeProblems(
        withOptions([{ type: "choices", label: "Toppings", choices: eleven }]),
      ),
    ).toContain("option “Toppings”: up to 10 choices");
    expect(
      cakeProblems(
        withOptions([
          { type: "choice", label: "Box", choices: [choice("x", 100001)] },
        ]),
      ),
    ).toContain("option “Box”: add-on £0–£1,000");
    expect(
      cakeProblems(withOptions([{ type: "yesno", label: "Box", choices: [] }])),
    ).toContain("option “Box”: a Yes/no has exactly one tick");
    expect(
      cakeProblems(
        withOptions([
          { type: "text", label: "Name", maxLength: 201, choices: [] },
        ]),
      ),
    ).toContain("option “Name”: max length 1–200");
    expect(
      cakeProblems(
        withOptions([
          {
            type: "choice",
            label: "Sponge",
            choices: [
              { label: "Pistachio", pricePence: 0, allergens: ["nuts"] },
            ],
          },
        ]),
      ),
    ).toContain("option “Sponge” · Pistachio: name the tree nuts");
  });
});

describe("§9.13 allergen wording", () => {
  it("gluten and tree nuts name their kind; the rest as they are", () => {
    const set = {
      allergens: [],
      glutenKinds: "wheat",
      nutKinds: "almonds, hazelnuts",
    };
    expect(allergenLabel("cereals containing gluten", set)).toBe(
      "gluten (wheat)",
    );
    expect(allergenLabel("nuts", set)).toBe("tree nuts (almonds, hazelnuts)");
    expect(allergenLabel("eggs", set)).toBe("eggs");
  });
});
