import { describe, expect, it } from "vitest";
import { linkSent, moneySubtitle, paidInFullLine } from "./money";

describe("Money (§9.9) words", () => {
  it("the subtitle", () => {
    expect(moneySubtitle(24000, 1)).toBe("£240 still to pay across 1 order");
    expect(moneySubtitle(124050, 3)).toBe(
      "£1,240.50 still to pay across 3 orders",
    );
    expect(moneySubtitle(0, 0)).toBe("Nothing still to pay");
  });
  it("LINK SENT", () => {
    expect(linkSent(null)).toBe("—");
    expect(linkSent({ sentOn: "2026-09-01", pence: 24000, more: 0 })).toBe(
      "Sent 1 Sep · £240",
    );
    expect(linkSent({ sentOn: "2026-09-01", pence: 24000, more: 1 })).toBe(
      "Sent 1 Sep +1",
    );
  });
  it("paid in full", () => {
    expect(paidInFullLine({ count: 39, totalPence: 558200 })).toBe(
      "39 orders · £5,582 · nothing outstanding",
    );
    expect(paidInFullLine({ count: 1, totalPence: 18500 })).toBe(
      "1 order · £185 · nothing outstanding",
    );
  });
});
