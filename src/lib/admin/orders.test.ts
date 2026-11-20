import { describe, expect, it } from "vitest";
import {
  listDate,
  ordersSubtitle,
  paidCell,
  readFilter,
  readShown,
  searchWords,
} from "./orders";

const m = (over: Partial<Parameters<typeof paidCell>[1]> = {}) => ({
  totalPence: 18500,
  netPaidPence: 18500,
  refundedPence: 0,
  refundPending: false,
  ...over,
});

describe("Orders (§9.4)", () => {
  it("reads the filter; To pay is the Owner's", () => {
    expect(readFilter("topay", true)).toBe("topay");
    expect(readFilter("topay", false)).toBe("all");
    expect(readFilter("nonsense", true)).toBe("all");
    expect(readFilter(undefined, true)).toBe("all");
  });
  it("shows 20, 40, … rows", () => {
    expect(readShown(undefined)).toBe(20);
    expect(readShown("40")).toBe(40);
    expect(readShown("33")).toBe(40);
    expect(readShown("-1")).toBe(20);
  });
  it("searches from 2 characters; number with or without BBL-; phone by digits", () => {
    expect(searchWords("M")).toBeNull();
    expect(searchWords("BBL-2026-0147")?.number).toBe("2026-0147");
    expect(searchWords("bbl0147")?.number).toBe("0147");
    expect(searchWords("eh49 6hh")?.postcode).toBe("EH496HH");
    const p = searchWords("07700 900 000");
    expect(p?.digits).toBe("07700900000");
    expect(p?.international).toBe("447700900000");
    expect(searchWords("Mairi")?.digits).toBeNull();
  });
  it("words the PAID cell", () => {
    expect(paidCell("confirmed", m())).toBe("£185 · paid");
    expect(
      paidCell("confirmed", m({ totalPence: 32000, netPaidPence: 8000 })),
    ).toBe("£80 of £320");
    expect(
      paidCell("refunded", m({ netPaidPence: 0, refundedPence: 32000 })),
    ).toBe("£320 · refunded");
    expect(paidCell("cancelled", m({ netPaidPence: 14000 }))).toBe(
      "£140 · refund due",
    );
    expect(paidCell("cancelled", m({ refundPending: true }))).toBe(
      "refund pending",
    );
    expect(paidCell("cancelled", m({ netPaidPence: 0 }))).toBe("Nothing paid");
  });
  it("dates and subtitle", () => {
    expect(listDate("2026-09-12", "2026-11-20")).toBe("12 Sep");
    expect(listDate("2025-09-12", "2026-11-20")).toBe("12 Sep 2025");
    expect(ordersSubtitle(42, 602000, 24000)).toBe(
      "42 this year · £6,020 taken · £240 still to pay",
    );
  });
});
