import { describe, expect, it } from "vitest";
import type { OptionView } from "./cake-config";
import {
  capCopy,
  cleanAnswers,
  inscriptionError,
  LINE_COPY,
  lineTitle,
  normaliseText,
  optionErrors,
  optionsLine,
} from "./order-line";

const opt = (
  o: Partial<OptionView> & Pick<OptionView, "id" | "type" | "label">,
): OptionView => ({
  help: "",
  required: false,
  minPicks: 0,
  maxPicks: 10,
  maxLength: 40,
  choices: [],
  ...o,
});
const c = (id: number, label: string) => ({
  id,
  label,
  pricePence: 0,
  allergens: [],
});
const OPTIONS = [
  opt({
    id: 1,
    type: "choice",
    label: "Sponge",
    required: true,
    choices: [c(11, "Vanilla"), c(12, "Chocolate")],
  }),
  opt({
    id: 2,
    type: "choices",
    label: "Toppings",
    minPicks: 1,
    maxPicks: 2,
    choices: [c(21, "Fresh berries"), c(22, "Gold leaf"), c(23, "Sprinkles")],
  }),
  opt({
    id: 3,
    type: "text",
    label: "Name on the topper",
    required: true,
    maxLength: 20,
  }),
  opt({
    id: 4,
    type: "yesno",
    label: "Gift box",
    choices: [c(41, "Gift box")],
  }),
];

describe("inscription (§5.1)", () => {
  it("accepts Latin letters with accents, digits and . , ! ? ' & - ( )", () => {
    for (const t of [
      "Happy 30th, Mairi!",
      "Joyeux anniversaire Zoë",
      "Ádám & Éva (60)",
      "Mum’s cake",
      "",
      "   ",
    ])
      expect(inscriptionError(t)).toBeNull();
  });

  it("counts as the customer sees it: 24 fit, 25 do not; an accented letter is one", () => {
    expect(inscriptionError("a".repeat(24))).toBeNull();
    expect(inscriptionError("a".repeat(25))).toBe(LINE_COPY.tooLong);
    expect(inscriptionError("é".repeat(24))).toBeNull();
    expect(inscriptionError("é".repeat(24))).toBeNull();
  });

  it("emoji, symbols and other scripts cannot be piped", () => {
    for (const t of [
      "Happy 🎂",
      "Love <3",
      "Χαρούμενα",
      "С днём",
      "生日快乐",
      "50%",
      "a\nb",
    ])
      expect(inscriptionError(t)).toBe(LINE_COPY.notPipeable);
  });

  it("curly quotes become straight, NFC, trimmed", () => {
    expect(normaliseText("  Mum’s “day”  ")).toBe(`Mum's "day"`);
    expect(normaliseText("é")).toBe("é");
  });
});

describe("options (§5.8 Missing or invalid)", () => {
  it("names every problem", () => {
    expect(
      optionErrors(OPTIONS, { picks: { 2: [21, 22, 23] }, texts: {} }),
    ).toEqual({
      1: "Choose a sponge.",
      2: "Pick up to 2.",
      3: "Fill in name on the topper.",
    });
    expect(
      optionErrors(OPTIONS, { picks: {}, texts: { 3: "x".repeat(21) } })[3],
    ).toBe("That is a little too long — 20 characters fit.");
    expect(
      optionErrors(OPTIONS, { picks: {}, texts: { 3: "Isla 🎉" } })[3],
    ).toBe(LINE_COPY.noEmoji);
    expect(optionErrors(OPTIONS, { picks: {}, texts: {} })[2]).toBe(
      "Pick at least 1.",
    );
  });

  it("all fine: no errors", () => {
    expect(
      optionErrors(OPTIONS, {
        picks: { 1: [12], 2: [21] },
        texts: { 3: "Isla" },
      }),
    ).toEqual({});
  });

  it("a pick that is not a choice of that option does not count and is not stored", () => {
    expect(
      optionErrors(OPTIONS, { picks: { 1: [99] }, texts: { 3: "I" } })[1],
    ).toBe("Choose a sponge.");
    expect(
      cleanAnswers(OPTIONS, {
        picks: { 1: [99, 12], 4: [41] },
        texts: { 3: "  Isla ", 1: "x" },
      }),
    ).toEqual({
      picks: { 1: [12], 4: [41] },
      texts: { 3: "Isla" },
    });
  });
});

describe("the order line", () => {
  it("options follow the size in Linda's order; Yes/no shows its label", () => {
    expect(
      optionsLine(OPTIONS, {
        picks: { 1: [12], 2: [21, 22], 4: [41] },
        texts: { 3: "Isla" },
      }),
    ).toBe(
      "Sponge: Chocolate · Toppings: Fresh berries, Gold leaf · Name on the topper: “Isla” · Gift box",
    );
    expect(optionsLine(OPTIONS, { picks: {}, texts: {} })).toBe("");
  });

  it("title with or without a message", () => {
    expect(
      lineTitle("The Lothian", 24, {
        offered: true,
        text: "Happy 30th, Mairi",
      }),
    ).toBe("The Lothian · serves 24 · “Happy 30th, Mairi”");
    expect(lineTitle("The Lothian", 24, { offered: true, text: "" })).toBe(
      "The Lothian · serves 24 · no message",
    );
    expect(lineTitle("Confetti Drum", 24, { offered: false, text: "" })).toBe(
      "Confetti Drum · serves 24",
    );
  });

  it("the cap copy uses the limit (Appendix A)", () => {
    expect(capCopy()).toMatchObject({
      count: "Five",
      adding: "Adding a sixth",
      most: "Five is the most one order can hold.",
    });
    expect(capCopy().why).toContain("orders stop at five");
  });
});
