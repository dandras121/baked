import { describe, expect, it } from "vitest";
import { rightsText } from "./rights";

const date = "2026-09-12"; // Saturday; D-8 Friday 4 September, D-2 Thursday 10 September

describe("e-mail 1 rights by date (§8.1, §10.1)", () => {
  it("on or before D-8: online changes until D-2, a full refund until D-8", () => {
    expect(rightsText({ date, earliestDate: date, today: "2026-09-04" })).toBe(
      "Change or cancel online until 23:59 on Thursday 10 September. Cancel by Friday 4 September for a full refund, after that for half; after Thursday 10 September changes and cancellation go through me. Refunds count from the earliest date your order has had, so moving your date later does not change them.",
    );
  });
  it("after D-8, on or before D-2: half refund online until D-2", () => {
    expect(
      rightsText({ date, earliestDate: date, today: "2026-09-05" }),
    ).toMatch(
      /^Change online until 23:59 on Thursday 10 September\. Cancelling online now gives a half refund, until 23:59 on Thursday 10 September\. After that, changes and cancellation go through me\. Refunds count/,
    );
    expect(
      rightsText({ date, earliestDate: date, today: "2026-09-10" }),
    ).toMatch(/^Change online/);
  });
  it("after D-2: only “go through me”; manual orders: reply to this e-mail", () => {
    expect(rightsText({ date, earliestDate: date, today: "2026-09-11" })).toBe(
      "Changes and cancellation go through me.",
    );
    expect(
      rightsText({
        date,
        earliestDate: date,
        today: "2026-09-01",
        manual: true,
      }),
    ).toBe("To change anything, just reply to this e-mail.");
  });
  it("the full-refund date counts from the earliest date, the change window from the current date", () => {
    expect(
      rightsText({
        date: "2026-09-19",
        earliestDate: date,
        today: "2026-09-05",
      }),
    ).toMatch(/^Change online until 23:59 on Thursday 17 September/);
  });
});
