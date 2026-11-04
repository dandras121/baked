import { describe, expect, it } from "vitest";
import { beforeYouPay, reviewHandoverLine } from "./review";

const kitchen = ["tree nuts", "soya", "sesame"];

describe("§5.4 BEFORE YOU PAY, worked out when step 4 loads", () => {
  it("full refund still possible (date more than seven days away): the tiers as drawn", () => {
    const l = beforeYouPay({
      earliest: "2026-12-12",
      date: "2026-12-12",
      today: "2026-11-04",
      kitchenOthers: kitchen,
    });
    expect(l[0]).toMatch(
      /14-day right to cancel under the Consumer Contracts Regulations 2013/,
    );
    expect(l[1]).toBe(
      "Cancel more than seven days before your date and I refund in full. Inside seven days I refund half, and on the day itself I cannot refund — the ingredients are bought and the cake is made.",
    );
    expect(l).toContain(
      "Changes and cancelling online until 23:59 two days before your date.",
    );
    expect(l).toContain(
      "If you move your date, the refund counts from the earliest date your order has had.",
    );
    expect(l).toContain(
      "You pay in full today. Ready-made designs are paid at checkout; bespoke cakes are arranged with me directly.",
    );
    expect(l.at(-1)).toBe(
      "Made in a kitchen that also handles tree nuts, soya and sesame, so I cannot rule out traces of those.",
    );
  });
  it("seven days or less: the half-refund line with its last day (D-2), no full-refund wording", () => {
    const l = beforeYouPay({
      earliest: "2026-11-09",
      date: "2026-11-09",
      today: "2026-11-04",
      kitchenOthers: [],
    });
    expect(l[1]).toBe(
      "Cancel online until 23:59 on Saturday 7 November for half the price back.",
    );
    expect(l.join(" ")).not.toMatch(/refund in full|earliest date/);
  });
  it("exactly seven days away counts as inside seven days; eight days is still full", () => {
    expect(
      beforeYouPay({
        earliest: "2026-11-11",
        date: "2026-11-11",
        today: "2026-11-04",
        kitchenOthers: [],
      })[1],
    ).toMatch(/^Cancel online until/);
    expect(
      beforeYouPay({
        earliest: "2026-11-12",
        date: "2026-11-12",
        today: "2026-11-04",
        kitchenOthers: [],
      })[1],
    ).toMatch(/^Cancel more than seven days/);
  });
  it("change window closed (guard): “Changes and cancellation go through me.” and no online lines", () => {
    const l = beforeYouPay({
      earliest: "2026-11-05",
      date: "2026-11-05",
      today: "2026-11-04",
      kitchenOthers: [],
    });
    expect(l).toContain("Changes and cancellation go through me.");
    expect(l.join(" ")).not.toMatch(/online/);
  });
  it("no kitchen sentence when every kitchen allergen is in the cakes", () => {
    const l = beforeYouPay({
      earliest: "2026-12-12",
      date: "2026-12-12",
      today: "2026-11-04",
      kitchenOthers: [],
    });
    expect(l.join(" ")).not.toMatch(/Made in a kitchen/);
  });
});

describe("§5.4 handover line", () => {
  it("delivery and collection", () => {
    expect(
      reviewHandoverLine({
        handover: "delivery",
        window: "morning",
        dateLabel: "Saturday 12 September",
        chargePence: 0,
      }),
    ).toEqual({
      label: "Delivery · Saturday 12 September, morning",
      value: "Free",
    });
    expect(
      reviewHandoverLine({
        handover: "collection",
        window: null,
        dateLabel: "Saturday 12 September",
        chargePence: 800,
      }),
    ).toEqual({
      label: "Collection · Saturday 12 September, at a time we agree",
      value: "Free",
    });
    expect(
      reviewHandoverLine({
        handover: "delivery",
        window: "evening",
        dateLabel: "Sat",
        chargePence: 800,
      }).value,
    ).toBe("£8");
  });
});
