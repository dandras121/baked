import { describe, expect, it } from "vitest";
import {
  allergenSummary,
  checkCakeForm,
  EMPTY_CAKE,
  formFromCake,
  smallestNote,
  type CakeForm,
} from "./cake-form";

const ok: CakeForm = {
  ...EMPTY_CAKE,
  name: "The Lothian",
  whatItIs: "Vanilla sponge with raspberry conserve.",
  flavour: "Vanilla sponge, raspberry",
  sizes: [
    { id: 1, serves: "32", tiers: "2", price: "240" },
    { id: null, serves: "24", tiers: "2", price: "£185" },
  ],
};

describe("Add or edit a cake (§9.13)", () => {
  it("a good form: sizes sorted by serves, ids kept, prices in pence", () => {
    const r = checkCakeForm(ok);
    expect(r.errors).toBeNull();
    expect(r.value!.sizes).toEqual([
      { id: null, serves: 24, tiers: 2, pricePence: 18500 },
      { id: 1, serves: 32, tiers: 2, pricePence: 24000 },
    ]);
  });

  it("names, what it is and flavour: required, with their limits", () => {
    const e = checkCakeForm({
      ...ok,
      name: "A",
      whatItIs: " ",
      flavour: "x".repeat(61),
    }).errors!;
    expect(e).toMatchObject({
      name: "Type a name — 2 to 60 characters.",
      whatItIs: "Say what it is — up to 300 characters.",
      flavour: "Name the flavour — up to 60 characters.",
    });
  });

  it("sizes: serves 1–500, £1–£5,000, no two with the same serves, at least one", () => {
    const e = checkCakeForm({
      ...ok,
      sizes: [
        { id: null, serves: "0", tiers: "1", price: "0.99" },
        { id: null, serves: "24", tiers: "1", price: "5000.01" },
        { id: null, serves: "24", tiers: "1", price: "100" },
      ],
    }).errors!;
    expect(e.rows).toEqual({
      0: { serves: "Serves 1 to 500.", price: "£1 to £5,000." },
      1: { price: "£1 to £5,000." },
      2: { serves: "Two sizes serve 24 — change one." },
    });
    expect(checkCakeForm({ ...ok, sizes: [] }).errors!.sizes).toBe(
      "A cake needs at least one size.",
    );
  });

  it("gluten and tree nuts must name which (Decided 2026-10-17)", () => {
    const e = checkCakeForm({
      ...ok,
      allergens: ["cereals containing gluten", "nuts"],
    }).errors!;
    expect(e).toMatchObject({
      glutenKinds: "Name which cereals, for example wheat.",
      nutKinds: "Name which nuts, for example almonds.",
    });
    const v = checkCakeForm({
      ...ok,
      allergens: ["milk", "cereals containing gluten"],
      glutenKinds: " wheat ",
      nutKinds: "left over",
    }).value!;
    expect(v).toMatchObject({
      allergens: ["cereals containing gluten", "milk"],
      glutenKinds: "wheat",
      nutKinds: "",
    });
  });

  it("the allergen field's line and the smallest-size note", () => {
    expect(
      allergenSummary({
        allergens: [],
        glutenKinds: "",
        nutKinds: "",
        alsoContains: "",
      }),
    ).toBe("None of the 14");
    expect(
      allergenSummary({
        allergens: ["milk", "eggs", "cereals containing gluten"],
        glutenKinds: "wheat",
        nutKinds: "",
        alsoContains: "rosewater",
      }),
    ).toBe("Gluten (wheat), eggs, milk · also: rosewater");
    expect(smallestNote(ok)).toBe("Smallest size — the site shows “From £185”");
  });

  it("opens filled in from the saved cake, sizes by serves", () => {
    const f = formFromCake(
      {
        name: "X",
        whatItIs: "Y",
        flavour: "Z",
        categories: ["birthdays"],
        visible: true,
        allergens: ["milk"],
        glutenKinds: "",
        nutKinds: "",
        alsoContains: "",
      },
      [
        { id: 9, serves: 40, tiers: 3, pricePence: 30500 },
        { id: 8, serves: 24, tiers: 2, pricePence: 18550 },
      ],
    );
    expect(f.sizes).toEqual([
      { id: 8, serves: "24", tiers: "2", price: "£185.50" },
      { id: 9, serves: "40", tiers: "3", price: "£305" },
    ]);
  });
});
