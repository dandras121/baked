import { describe, expect, it } from "vitest";
import {
  changeMoney,
  servesOf,
  sizeChoiceLabel,
  sizeLine,
} from "./change-money";

describe("§6.4 the money of a change", () => {
  it("net difference: up, down, none; under £0.30 either way is waived", () => {
    expect(changeMoney(5500)).toEqual({ kind: "up", pence: 5500 });
    expect(changeMoney(-5500)).toEqual({ kind: "down", pence: 5500 });
    expect(changeMoney(0)).toEqual({ kind: "none", pence: 0 });
    expect(changeMoney(29)).toEqual({ kind: "waived", pence: 29 });
    expect(changeMoney(-29)).toEqual({ kind: "waived", pence: -29 });
    expect(changeMoney(30)).toEqual({ kind: "up", pence: 30 });
    expect(changeMoney(-30)).toEqual({ kind: "down", pence: 30 });
  });
  it("size words", () => {
    expect(sizeLine({ tiers: 2, serves: 24 })).toBe("Two tiers · serves 24");
    expect(sizeChoiceLabel({ tiers: 3, serves: 30 })).toBe(
      "Serves 30 · three tiers",
    );
    expect(servesOf("Two tiers · serves 24")).toBe(24);
  });
});
