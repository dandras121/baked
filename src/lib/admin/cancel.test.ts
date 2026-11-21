import { describe, expect, it } from "vitest";
import {
  amountError,
  cancelButton,
  emailTier,
  readPounds,
  splitLine,
  splitRefund,
  termsLine,
} from "./cancel";

describe("Cancel the order, admin (§9.5)", () => {
  it("splits the refund: card first, the rest by hand", () => {
    expect(splitRefund(28000, 28000)).toEqual({ card: 28000, hand: 0 });
    expect(splitRefund(30000, 28000)).toEqual({ card: 28000, hand: 2000 });
    expect(splitRefund(10000, 0)).toEqual({ card: 0, hand: 10000 });
    expect(splitLine({ card: 28000, hand: 2000 })).toBe(
      "£280.00 back to the card · £20.00 to give back by hand",
    );
    expect(splitLine({ card: 0, hand: 0 })).toBe("No refund");
  });
  it("reads amounts and checks them against what was paid", () => {
    expect(readPounds("185")).toBe(18500);
    expect(readPounds("£92.5")).toBe(9250);
    expect(readPounds("1,390.00")).toBe(139000);
    expect(readPounds("12.345")).toBeNull();
    expect(readPounds("ten")).toBeNull();
    expect(amountError(null, 28000)).toMatch(/Type an amount/);
    expect(amountError(28001, 28000)).toBe(
      "That is more than the £280.00 paid.",
    );
    expect(amountError(0, 28000)).toBeNull();
  });
  it("words the button, the terms and the e-mail tier", () => {
    expect(cancelButton(28000)).toBe("Cancel and refund £280.00");
    expect(cancelButton(0)).toBe("Cancel with no refund");
    expect(termsLine("half", 14000)).toBe(
      "The terms give half back today: £140.00.",
    );
    expect(emailTier("full", 28000, 28000)).toBe("full");
    expect(emailTier("half", 14000, 20000)).toBe("own");
    expect(emailTier("none", 0, 0)).toBe("none");
  });
});
