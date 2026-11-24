import { describe, expect, it } from "vitest";
import { FLAG, linkSent, moneySubtitle, paidInFullLine } from "./money";

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

describe("Money flags (§9.9) words", () => {
  it("as drawn for a Stripe payment with no order", () => {
    expect(FLAG.noOrderTitle(1)).toBe("1 Stripe payment has no order");
    expect(FLAG.noOrderTitle(2)).toBe("2 Stripe payments have no order");
    expect(FLAG.noOrder(6400, "2026-09-08", "pi_3Qy2mRabcdefT4vB")).toBe(
      "£64.00 was taken on 8 September (pi_3Qy…T4vB) but no order exists for it — the confirmation webhook never arrived. Nothing is booked against this payment. Check the charge in Stripe and create or refund the order by hand.",
    );
  });
  it("the others", () => {
    expect(
      FLAG.refundFailed(
        9250,
        "BBL-2026-0188",
        "Callum Reid",
        "2026-09-14",
        "card_declined",
      ),
    ).toBe(
      "£92.50 back to the card for BBL-2026-0188 (Callum Reid) did not go through on 14 Sep: card_declined. Nothing has gone back yet.",
    );
    expect(FLAG.feeTitle(1500, "BBL-2026-0171")).toBe(
      "£15 redelivery to refund — BBL-2026-0171",
    );
    expect(FLAG.handTitle(9250, "BBL-2026-0188")).toBe(
      "£92.50 to give back by hand — BBL-2026-0188",
    );
  });
});
