import { describe, expect, it } from "vitest";
import {
  addOnLabel,
  allergenLine,
  includesLine,
  linePricePence,
  lineAllergens,
  NO_ANSWERS,
  priceDetail,
  sizeChoices,
  tierLine,
  tierWords,
  togglePick,
  type OptionView,
} from "./cake-config";
import type { Allergen } from "./constants";

const KITCHEN: Allergen[] = [
  "nuts",
  "cereals containing gluten",
  "eggs",
  "milk",
  "soya",
  "sesame",
];
const LOTHIAN = {
  allergens: ["cereals containing gluten", "eggs", "milk"] as Allergen[],
  glutenKinds: "wheat",
};
const SIZES = [
  { id: 3, serves: 40, tiers: 3, pricePence: 30_500 },
  { id: 1, serves: 24, tiers: 2, pricePence: 18_500 },
  { id: 2, serves: 32, tiers: 2, pricePence: 24_000 },
];
const choice = (
  id: number,
  label: string,
  pricePence: number,
  allergens: Allergen[] = [],
) => ({ id, label, pricePence, allergens });
const OPTIONS: OptionView[] = [
  {
    id: 10,
    type: "choice",
    label: "Sponge",
    help: "",
    required: true,
    minPicks: 0,
    maxPicks: 10,
    maxLength: 40,
    choices: [
      choice(11, "Vanilla", 0),
      choice(12, "Chocolate", 0, ["soya"]),
      choice(13, "Lemon", 500),
    ],
  },
  {
    id: 20,
    type: "choices",
    label: "Toppings",
    help: "",
    required: false,
    minPicks: 0,
    maxPicks: 3,
    maxLength: 40,
    choices: [choice(21, "Fresh berries", 600), choice(22, "Gold leaf", 1_200)],
  },
  {
    id: 30,
    type: "yesno",
    label: "Gift box",
    help: "Add a gift box",
    required: false,
    minPicks: 0,
    maxPicks: 1,
    maxLength: 40,
    choices: [choice(31, "Gift box", 800)],
  },
];
const FIGMA = { picks: { 10: [12], 20: [21], 30: [31] }, texts: {} };

describe("sizes (§5.1)", () => {
  it("are sorted by serves; differences against the smallest, which is included", () => {
    expect(sizeChoices(SIZES).map((s) => [s.name, s.extra])).toEqual([
      ["Serves 24", "included"],
      ["Serves 32", "+£55"],
      ["Serves 40", "+£120"],
    ]);
  });

  it("tier words and the tier line follow the size", () => {
    expect([1, 2, 3, 4].map(tierWords)).toEqual([
      "Single tier",
      "Two tiers",
      "Three tiers",
      "Four tiers",
    ]);
    expect(tierLine(SIZES[0])).toBe("THREE TIERS · SERVES 40");
  });

  it("add-on labels", () => {
    expect(addOnLabel(0)).toBe("included");
    expect(addOnLabel(550)).toBe("+£5.50");
  });
});

describe("price (§5.8): size + every chosen add-on, in pence", () => {
  it("the Figma example: £185 + £6 + £8 = £199", () => {
    expect(linePricePence(SIZES[1], OPTIONS, FIGMA)).toBe(19_900);
    expect(includesLine(OPTIONS, FIGMA)).toBe(
      "Includes Fresh berries +£6 and Gift box +£8.",
    );
  });

  it("nothing chosen: the size price and no Includes line", () => {
    expect(linePricePence(SIZES[0], OPTIONS, NO_ANSWERS)).toBe(30_500);
    expect(includesLine(OPTIONS, NO_ANSWERS)).toBe("");
  });

  it("the price detail line", () => {
    const s = SIZES[1];
    expect(priceDetail(s, { offered: true, text: "Happy 30th" })).toBe(
      "Serves 24 · with inscription",
    );
    expect(priceDetail(s, { offered: true, text: "   " })).toBe(
      "Serves 24 · plain",
    );
    expect(priceDetail(s, { offered: false, text: "" })).toBe("Serves 24");
  });
});

describe("picking", () => {
  it("a required Choice keeps one pick; an optional one clears on a second tap", () => {
    let a = togglePick(OPTIONS[0], NO_ANSWERS, 11);
    a = togglePick(OPTIONS[0], a, 12);
    expect(a.picks[10]).toEqual([12]);
    expect(togglePick(OPTIONS[0], a, 12).picks[10]).toEqual([12]);
    const optional = { ...OPTIONS[0], required: false };
    expect(togglePick(optional, a, 12).picks[10]).toEqual([]);
  });

  it("Choices and Yes/no toggle", () => {
    let a = togglePick(OPTIONS[1], NO_ANSWERS, 21);
    a = togglePick(OPTIONS[1], a, 22);
    expect(a.picks[20]).toEqual([21, 22]);
    expect(togglePick(OPTIONS[1], a, 21).picks[20]).toEqual([22]);
  });
});

describe("allergen line (§5.1 D17, §5.8)", () => {
  it("the cake alone: its allergens, then the kitchen list minus them", () => {
    expect(allergenLine(LOTHIAN, OPTIONS, NO_ANSWERS, KITCHEN)).toBe(
      "Contains gluten (wheat), eggs and milk. Made in a kitchen that also handles tree nuts, soya and sesame, so I cannot rule out traces of those.",
    );
  });

  it("an option's allergen joins the line, says where it comes from and leaves the kitchen list", () => {
    expect(allergenLine(LOTHIAN, OPTIONS, FIGMA, KITCHEN)).toBe(
      "Contains gluten (wheat), eggs, milk and soya — the soya comes with the chocolate sponge. Made in a kitchen that also handles tree nuts and sesame, so I cannot rule out traces of those.",
    );
  });

  it("Also contains follows the allergens as written", () => {
    expect(
      allergenLine({ ...LOTHIAN, alsoContains: "alcohol" }, [], NO_ANSWERS, []),
    ).toBe("Contains gluten (wheat), eggs, milk and alcohol.");
  });

  it("none of the 14", () => {
    expect(allergenLine({ allergens: [] }, [], NO_ANSWERS, ["milk"])).toBe(
      "Contains none of the 14 regulated allergens. Made in a kitchen that handles milk, so I cannot rule out traces of those.",
    );
    expect(
      allergenLine(
        { allergens: [], alsoContains: "alcohol" },
        [],
        NO_ANSWERS,
        [],
      ),
    ).toBe(
      "Contains none of the 14 regulated allergens. Also contains alcohol.",
    );
  });

  it("the kitchen sentence is left out when nothing is left", () => {
    expect(
      allergenLine(LOTHIAN, [], NO_ANSWERS, [
        "cereals containing gluten",
        "eggs",
      ]),
    ).toBe("Contains gluten (wheat), eggs and milk.");
  });

  it("gluten and nut kinds from options are merged", () => {
    const opts: OptionView[] = [
      {
        ...OPTIONS[0],
        choices: [
          {
            ...choice(14, "Pistachio", 700, [
              "nuts",
              "cereals containing gluten",
            ]),
            nutKinds: "pistachios",
            glutenKinds: "spelt",
          },
        ],
      },
    ];
    const set = lineAllergens({ ...LOTHIAN, nutKinds: "almonds" }, opts, {
      picks: { 10: [14] },
      texts: {},
    });
    expect(set.glutenKinds).toBe("wheat, spelt");
    expect(set.nutKinds).toBe("almonds, pistachios");
    expect(set.allergens).toEqual([
      "cereals containing gluten",
      "eggs",
      "milk",
      "nuts",
    ]);
  });
});
