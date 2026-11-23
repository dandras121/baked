import { describe, expect, it } from "vitest";
import { checkLinkAmount, linkSums, prefill, sentLine } from "./pay-link";

describe("Send a payment link (§9.8)", () => {
  it("accepts 120, 120.5 and £120.50; £0.30 up to still to pay", () => {
    expect(checkLinkAmount("120", 38000)).toEqual({
      pence: 12000,
      error: null,
    });
    expect(checkLinkAmount("120.5", 38000).pence).toBe(12050);
    expect(checkLinkAmount("£120.50", 38000).pence).toBe(12050);
    expect(checkLinkAmount("0.30", 38000).pence).toBe(30);
    expect(checkLinkAmount("380", 38000).pence).toBe(38000);
  });

  it("says what is wrong", () => {
    expect(checkLinkAmount("", 38000).error).toBe(
      "Type an amount, for example 120 or 120.50.",
    );
    expect(checkLinkAmount("12a", 38000).error).toBe(
      "Type an amount, for example 120 or 120.50.",
    );
    expect(checkLinkAmount("0.29", 38000).error).toBe(
      "The smallest card payment is £0.30.",
    );
    expect(checkLinkAmount("240.01", 24000).error).toBe(
      "That is more than the £240.00 still to pay.",
    );
  });

  it("opens with The rest = still to pay; the other kinds start empty", () => {
    expect(prefill("rest", 38000)).toBe("380");
    expect(prefill("rest", 24050)).toBe("240.50");
    expect(prefill("deposit", 38000)).toBe("");
    expect(prefill("difference", 38000)).toBe("");
  });

  it("writes the sums and the sent line", () => {
    expect(
      linkSums({ totalPence: 38000, paidPence: 0, stillToPayPence: 38000 }),
    ).toBe("Total £380.00 · paid so far £0.00 · still to pay £380.00");
    expect(sentLine(12000, "deposit")).toBe("Link sent · £120.00 · Deposit");
  });
});
