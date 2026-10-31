// The sample catalogue for development and previews (CLAUDE.md §7; Bohoka 2026-10-31: “Figma-nevek, rajzolt
// értékek”): the fourteen cakes named in Figma (1830:13667), with the values drawn on The Lothian's page (609:2889)
// and on the Almond & Rose card; every other value is The Lothian's sample. Three cakes carry options (§5.8) and
// one has no inscription, so those can be tried. Never on the live site.
import type { CakeInput, SizeInput } from "./cakes";

const LOTHIAN_SIZES: SizeInput[] = [
  { serves: 24, tiers: 2, pricePence: 18_500 },
  { serves: 32, tiers: 2, pricePence: 24_000 },
  { serves: 40, tiers: 3, pricePence: 30_500 },
];

const FLAVOUR = "Vanilla sponge, raspberry conserve, Scottish butter icing";
const WHAT =
  "Vanilla sponge with raspberry conserve and Scottish butter icing, finished with a hand-piped border.";
const ALLERGENS = {
  allergens: ["cereals containing gluten", "eggs", "milk"],
  glutenKinds: "wheat",
} satisfies Pick<CakeInput, "allergens" | "glutenKinds">;

const sample = (
  name: string,
  categories: CakeInput["categories"],
  more: Partial<CakeInput> = {},
): CakeInput => ({
  name,
  whatItIs: WHAT,
  flavour: FLAVOUR,
  categories,
  visible: true,
  sizes: LOTHIAN_SIZES,
  ...ALLERGENS,
  ...more,
});

export const SAMPLE_CATALOGUE: CakeInput[] = [
  sample("The Lothian", ["birthdays", "weddings"]),
  sample("Bramble & Cream", ["birthdays"], {
    // Options as in the §5.8 examples (“Sponge: Chocolate · Toppings: Fresh berries, Gold leaf · Gift box”).
    options: [
      {
        type: "choice",
        label: "Sponge",
        required: true,
        choices: [
          { label: "Vanilla", pricePence: 0, allergens: [] },
          { label: "Chocolate", pricePence: 500, allergens: ["soya"] },
        ],
      },
      {
        type: "choices",
        label: "Toppings",
        help: "Pick any you like.",
        minPicks: 0,
        maxPicks: 2,
        choices: [
          { label: "Fresh berries", pricePence: 600, allergens: [] },
          { label: "Gold leaf", pricePence: 1_000, allergens: [] },
        ],
      },
      {
        type: "yesno",
        label: "Gift box",
        help: "Add a gift box",
        choices: [{ label: "Gift box", pricePence: 800, allergens: [] }],
      },
    ],
  }),
  sample("Wee Beastie", ["kids", "birthdays"], {
    options: [
      {
        type: "text",
        label: "Name on the topper",
        help: "The name on the little sign on top.",
        required: false,
        maxLength: 12,
        choices: [],
      },
    ],
  }),
  sample("Sugar Peony", ["weddings"]),
  sample("Confetti Drum", ["birthdays", "kids"], { offerInscription: false }),
  sample("Almond & Rose", ["weddings"], {
    sizes: [
      { serves: 22, tiers: 2, pricePence: 19_500 },
      ...LOTHIAN_SIZES.slice(1),
    ],
    allergens: ["cereals containing gluten", "eggs", "milk", "nuts"],
    glutenKinds: "wheat",
    nutKinds: "almonds",
    options: [
      {
        type: "choice",
        label: "Sponge",
        required: false,
        choices: [
          { label: "Almond", pricePence: 0, allergens: [] },
          {
            label: "Pistachio",
            pricePence: 700,
            allergens: ["nuts"],
            nutKinds: "pistachios",
          },
        ],
      },
    ],
  }),
  sample("The Forth", ["corporate"]),
  sample("Buttercream Bloom", ["birthdays", "weddings"]),
  sample("Cocoa & Sea Salt", ["birthdays", "corporate"]),
  sample("Tartan Ribbon", ["weddings", "corporate"]),
  sample("Lemon & Elderflower", ["weddings"]),
  sample("Midnight Berry", ["birthdays"]),
  sample("Highland Heather", ["weddings"]),
  sample("Rhubarb & Custard", ["kids", "birthdays"]),
];
