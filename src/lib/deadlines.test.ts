import { describe, expect, it } from "vitest";
import {
  changeWindowClosesAt,
  earliestSelectableDate,
  holdMinutesLeft,
  isChangeWindowOpen,
  lastChangeDay,
  lastFullRefundDay,
  refundAmount,
  refundTier,
} from "./deadlines";
import { londonDate } from "./london-time";

describe("§10.1 change window: open until 23:59 on D-2 (Decided D2)", () => {
  it("a Saturday cake → Thursday is the last day", () => {
    expect(lastChangeDay("2026-09-12")).toBe("2026-09-10"); // Sat 12 Sep → Thu 10 Sep
  });
  it("open on Thursday, closed on Friday", () => {
    expect(isChangeWindowOpen("2026-09-12", "2026-09-10")).toBe(true);
    expect(isChangeWindowOpen("2026-09-12", "2026-09-11")).toBe(false);
    expect(isChangeWindowOpen("2026-09-12", "2026-09-01")).toBe(true);
  });
  it("closes at 00:00 London on D-1 — 23:59 Thursday is still open (summer time)", () => {
    const closes = changeWindowClosesAt("2026-09-12");
    expect(closes.toISOString()).toBe("2026-09-10T23:00:00.000Z"); // BST: 00:00 London = 23:00 UTC
    expect(londonDate(new Date(closes.getTime() - 60_000))).toBe("2026-09-10");
  });
  it("winter time: closes at 00:00 GMT", () => {
    expect(changeWindowClosesAt("2026-12-12").toISOString()).toBe(
      "2026-12-11T00:00:00.000Z",
    );
  });
  it("§10.1 clock changes never shift it: a cake on Mon 26 Oct 2026 (clocks went back Sun 25 Oct)", () => {
    expect(lastChangeDay("2026-10-26")).toBe("2026-10-24");
    expect(changeWindowClosesAt("2026-10-26").toISOString()).toBe(
      "2026-10-24T23:00:00.000Z",
    ); // still BST on the 25th 00:00
  });
  it("§10.1 spring forward: a cake on Tue 30 Mar 2027 (clocks go forward Sun 28 Mar)", () => {
    expect(lastChangeDay("2027-03-30")).toBe("2027-03-28");
    expect(changeWindowClosesAt("2027-03-30").toISOString()).toBe(
      "2027-03-28T23:00:00.000Z",
    ); // 29 Mar is already summer time: 00:00 London = 23:00 UTC
  });
});

describe("§10.1 refund tiers (Decided 2026-10-17)", () => {
  it("full when the earliest date − today > 7", () => {
    expect(refundTier("2026-09-12", "2026-09-12", "2026-09-04")).toBe("full"); // 8 days
  });
  it("half at exactly 7 days, and every day after, while before the current date", () => {
    expect(refundTier("2026-09-12", "2026-09-12", "2026-09-05")).toBe("half");
    expect(refundTier("2026-09-12", "2026-09-12", "2026-09-11")).toBe("half");
  });
  it("none on or after the current date", () => {
    expect(refundTier("2026-09-12", "2026-09-12", "2026-09-12")).toBe("none");
    expect(refundTier("2026-09-12", "2026-09-12", "2026-09-13")).toBe("none");
  });
  it("moving the date later never raises the refund: the earliest date counts", () => {
    // booked for 12 Sep, moved to 30 Sep; today 6 Sep: 30 − 6 = 24 days, but 12 − 6 = 6 → half
    expect(refundTier("2026-09-12", "2026-09-30", "2026-09-06")).toBe("half");
  });
  it("moved later and the earliest date has passed: still half until the current date", () => {
    expect(refundTier("2026-09-12", "2026-09-30", "2026-09-20")).toBe("half");
    expect(refundTier("2026-09-12", "2026-09-30", "2026-09-30")).toBe("none");
  });
  it("last day for a full refund = earliest date − 8", () => {
    expect(lastFullRefundDay("2026-09-12")).toBe("2026-09-04");
    expect(
      refundTier("2026-09-12", "2026-09-12", lastFullRefundDay("2026-09-12")),
    ).toBe("full");
  });
  it("§10.7 half refunds round up to the penny (customer's favour)", () => {
    expect(refundAmount(18500, "half")).toBe(9250);
    expect(refundAmount(18501, "half")).toBe(9251);
    expect(refundAmount(18501, "full")).toBe(18501);
    expect(refundAmount(18501, "none")).toBe(0);
  });
});

describe("§10.1 lead time", () => {
  it("5 days on a Monday → Saturday onwards", () => {
    expect(earliestSelectableDate("2026-09-07", 5)).toBe("2026-09-12");
  });
  it("must be 3–60 days (Decided 2026-10-17)", () => {
    expect(() => earliestSelectableDate("2026-09-07", 2)).toThrow();
    expect(() => earliestSelectableDate("2026-09-07", 61)).toThrow();
    expect(earliestSelectableDate("2026-09-07", 3)).toBe("2026-09-10");
  });
  it("at least 3 days, so every catalogue order starts with the change window open", () => {
    expect(
      isChangeWindowOpen(earliestSelectableDate("2026-09-07", 3), "2026-09-07"),
    ).toBe(true);
  });
});

describe("§13 hold minutes", () => {
  const now = new Date("2026-09-01T10:00:00Z");
  it("whole minutes left, rounded down", () => {
    expect(holdMinutesLeft(new Date("2026-09-01T10:19:59Z"), now)).toBe(19);
  });
  it("at least 1", () => {
    expect(holdMinutesLeft(new Date("2026-09-01T10:00:20Z"), now)).toBe(1);
    expect(holdMinutesLeft(new Date("2026-09-01T09:59:00Z"), now)).toBe(1);
  });
});
