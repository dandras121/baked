import { describe, expect, it } from "vitest";
import { cancelCopy, cancelledCopy, type CancelQuote } from "./cancel-copy";

const quote: CancelQuote = {
  tier: "full",
  refundPence: 18500,
  basisPence: 18500,
  earliestDiffers: false,
  date: "2026-09-12",
  earliest: "2026-09-12",
  payments: [{ pence: 18500, on: "2026-08-31" }],
  refundsMade: [],
};

describe("cancel page words (§6.6, 1037:9182)", () => {
  it("full: as drawn", () => {
    const c = cancelCopy(quote, "2026-08-31");
    expect(c.lead).toBe(
      "Saturday 12 September is twelve days away, so you are due the full £185 back.",
    );
    expect(c.paid).toBe("You paid £185 on 31 August.");
    expect(c.basis).toBeNull();
    expect(c.ladder).toMatch(/^More than seven days ahead: the full price\./);
  });

  it("half, counted from the earliest date the order has had", () => {
    const c = cancelCopy(
      {
        ...quote,
        tier: "half",
        refundPence: 9250,
        date: "2026-09-19",
        earliestDiffers: true,
      },
      "2026-09-07",
    );
    expect(c.lead).toBe(
      "Saturday 19 September is twelve days away, but your refund counts from Saturday 12 September, the earliest date your order has had, so you are due half — £92.50 back.",
    );
    expect(c.changed).toBe(
      "It is now inside seven days, so the refund is £92.50. Cancel anyway?",
    );
  });

  it("several payments and a refund already made", () => {
    const c = cancelCopy(
      {
        ...quote,
        basisPence: 18500,
        payments: [
          { pence: 18500, on: "2026-08-31" },
          { pence: 5500, on: "2026-09-03" },
        ],
        refundsMade: [{ pence: 5500, on: "2026-09-05" }],
      },
      "2026-09-01",
    );
    expect(c.paid).toBe(
      "You paid £240 in total — £185 on 31 Aug, £55 on 3 Sep.",
    );
    expect(c.made).toEqual(["£55 back to your card on 5 Sep."]);
    expect(c.basis).toBe("Your refund is worked out from £185.");
  });
});

describe("E state refund words (§6.3 E)", () => {
  const kept = {
    tier: "full" as const,
    cardPence: 18500,
    handPence: 0,
    earliestDiffers: false,
    cancelledOn: "2026-09-02",
    byLinda: false,
  };
  it("on its way, then refunded with the tick", () => {
    const on = cancelledCopy(kept, "pending", null, "2026-09-02");
    expect(on).toMatchObject({
      intro: "You cancelled on 2 September, and the refund is on its way.",
      eyebrow: "Refund on its way",
      boxTitle: "£185 back to your card",
      tick: false,
    });
    const done = cancelledCopy(kept, "done", "2026-09-02", "2026-09-03");
    expect(done.eyebrow).toBe("Refunded");
    expect(done.intro).toBe(
      "You cancelled on 2 September, and the refund went back the same day.",
    );
    expect(cancelledCopy(kept, "done", "2026-09-04", "2026-09-05").intro).toBe(
      "You cancelled on 2 September, and the refund went back on 4 September.",
    );
    expect(done.tick).toBe(true);
  });
  it("half and a failed refund", () => {
    const c = cancelledCopy(
      { ...kept, tier: "half", cardPence: 9250, earliestDiffers: true },
      "failed",
      null,
      "2026-09-08",
    );
    expect(c.boxTitle).toBe(
      "£92.50 back to your card — half, as the cancellation was inside seven days of the earliest date your order has had",
    );
    expect(c.boxText).toMatch(/I am sorting this — nothing for you to do\.$/);
  });
  it("no refund", () => {
    const c = cancelledCopy(
      { ...kept, tier: "none", cardPence: 0 },
      "none",
      null,
      "2026-09-12",
    );
    expect(c.eyebrow).toBe("No refund");
    expect(c.boxText).toBeNull();
  });
});
