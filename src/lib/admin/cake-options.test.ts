import { describe, expect, it } from "vitest";
import {
  checkOptions,
  choiceAllergens,
  emptyChoice,
  emptyOption,
  optionSummary,
  type OptionForm,
} from "./cake-options";

const sponge: OptionForm = {
  ...emptyOption("choice"),
  label: "Sponge",
  help: "Pick the sponge for every tier.",
  required: true,
  choices: [
    { ...emptyChoice(), id: 5, label: "Vanilla", price: "0" },
    {
      ...emptyChoice(),
      label: "Chocolate",
      price: "0",
      allergens: ["milk", "eggs", "soya"],
    },
    {
      ...emptyChoice(),
      label: "Lemon",
      price: "5",
      allergens: ["milk", "eggs"],
    },
  ],
};

describe("Options (§5.8)", () => {
  it("a good Choice: required, the add-ons in pence, ids kept", () => {
    const r = checkOptions([sponge]);
    expect(r.errors).toEqual({});
    expect(r.values[0]).toMatchObject({
      type: "choice",
      label: "Sponge",
      required: true,
    });
    expect(
      r.values[0].choices.map((c) => [c.id, c.label, c.pricePence]),
    ).toEqual([
      [5, "Vanilla", 0],
      [null, "Chocolate", 0],
      [null, "Lemon", 500],
    ]);
  });

  it("the checks, with words next to the fields", () => {
    const r = checkOptions([
      {
        ...sponge,
        label: "",
        choices: [
          {
            ...emptyChoice(),
            label: "",
            price: "1000.01",
            allergens: ["nuts"],
          },
        ],
      },
      {
        ...emptyOption("choices"),
        label: "Toppings",
        minPicks: "3",
        maxPicks: "2",
        choices: [],
      },
      { ...emptyOption("text"), label: "Name on the topper", maxLength: "201" },
    ]);
    expect(r.errors[0]).toEqual({
      label: "Give the option a label — up to 40 characters.",
      choice: {
        0: {
          label: "Name the choice — up to 40 characters.",
          price: "£0 to £1,000.",
          allergens: "Name which nuts, for example almonds.",
        },
      },
    });
    expect(r.errors[1]).toEqual({
      picks: "Min and max picks are 0 to 10, and min is no more than max.",
      choices: "Add at least one choice.",
    });
    expect(r.errors[2]).toEqual({ maxLength: "Max length 1 to 200." });
  });

  it("a Yes/no keeps one tick named as the option; a Text has no choices", () => {
    const r = checkOptions([
      {
        ...emptyOption("yesno"),
        label: "Gift box",
        help: "Add a gift box",
        choices: [{ ...emptyChoice(), price: "8" }],
      },
      {
        ...emptyOption("text"),
        label: "Name on the topper",
        maxLength: "20",
        required: true,
      },
    ]);
    expect(r.values[0].choices).toEqual([
      expect.objectContaining({ label: "Gift box", pricePence: 800 }),
    ]);
    expect(r.values[0].required).toBe(false);
    expect(r.values[1]).toMatchObject({
      maxLength: 20,
      required: true,
      choices: [],
    });
  });

  it("the folded line (1713:11890) and the allergen link", () => {
    expect(optionSummary(sponge)).toBe(
      "required · Vanilla, Chocolate (+£0), Lemon (+£5)",
    );
    expect(
      optionSummary({ ...emptyOption("text"), label: "Name", maxLength: "20" }),
    ).toBe("optional · max 20 characters");
    expect(
      optionSummary({
        ...emptyOption("yesno"),
        label: "Gift box",
        choices: [{ ...emptyChoice(), price: "8" }],
      }),
    ).toBe("+£8 · optional");
    expect(choiceAllergens(sponge.choices[1])).toBe(
      "Allergens: Egg, Milk, Soya",
    );
    expect(choiceAllergens(sponge.choices[0])).toBe("Allergens: none");
  });
});
