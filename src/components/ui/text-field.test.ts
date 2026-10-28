import { describe, expect, it } from "vitest";
import { MIN_BUSY_MS } from "./button";
import { countCharacters, counterVisible } from "./text-field";

describe("§5.1 characters are counted as the customer sees them", () => {
  it("plain text", () => expect(countCharacters("Happy 30th, Mairi")).toBe(17));
  it("accented letters count once, composed or not", () => {
    expect(countCharacters("Zoë")).toBe(3);
    expect(countCharacters("Zoë")).toBe(3);
  });
  it("an emoji counts once", () => expect(countCharacters("🎂🎂")).toBe(2));
});

describe("§7.1 counters (Proposal): always, or from 80 % of the limit", () => {
  it("always shows", () => expect(counterVisible(0, 400, "always")).toBe(true));
  it("from 80 %: hidden at 159 of 200, shown at 160", () => {
    expect(counterVisible(159, 200, "from80")).toBe(false);
    expect(counterVisible(160, 200, "from80")).toBe(true);
  });
  it("from 80 % of 1,000 = 800", () => {
    expect(counterVisible(799, 1000, "from80")).toBe(false);
    expect(counterVisible(800, 1000, "from80")).toBe(true);
  });
});

describe("UI-03 busy state", () => {
  it("shows at least 600 ms so it never flashes", () =>
    expect(MIN_BUSY_MS).toBe(600));
});
