import { describe, expect, it } from "vitest";
import {
  addDays,
  formatAdminTime,
  formatClockTime,
  formatLongDate,
  formatShortDate,
  londonDate,
  londonInstant,
  londonOffsetMinutes,
  weekStart,
} from "./london-time";
import {
  assertPence,
  formatAdminMoney,
  formatDifference,
  formatPrice,
  halfRoundedUp,
} from "./money";
import {
  complaintReference,
  enquiryReference,
  orderNumber,
} from "./order-number";
import { leadTimeWords, numberInWords, plural } from "./words";

describe("§10.7 money: integer pence, GBP", () => {
  it("customer display: £185 when whole, £92.50 otherwise", () => {
    expect(formatPrice(18500)).toBe("£185");
    expect(formatPrice(9250)).toBe("£92.50");
    expect(formatPrice(5)).toBe("£0.05");
  });
  it("thousands with a comma", () => {
    expect(formatPrice(125000)).toBe("£1,250");
    expect(formatPrice(125050)).toBe("£1,250.50");
  });
  it("§9.1 admin: two decimals in breakdowns, whole pounds on labels", () => {
    expect(formatAdminMoney(28000, "breakdown")).toBe("£280.00");
    expect(formatAdminMoney(139000, "label")).toBe("£1,390");
    expect(formatAdminMoney(139050, "breakdown")).toBe("£1,390.50");
  });
  it("§13 size differences: +£55", () => {
    expect(formatDifference(5500)).toBe("+£55");
  });
  it("only whole pence are money", () => {
    expect(() => assertPence(1.5)).toThrow();
    expect(halfRoundedUp(3)).toBe(2);
  });
});

describe("§10.1 Europe/London time", () => {
  it("“today” is London's date: 23:30 UTC on 1 June is 2 June in London (summer)", () => {
    expect(londonDate(new Date("2026-06-01T23:30:00Z"))).toBe("2026-06-02");
  });
  it("in winter London = UTC", () => {
    expect(londonDate(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
  });
  it("clock change days: 25 Oct 2026 (back) and 28 Mar 2027 (forward)", () => {
    expect(londonOffsetMinutes(new Date("2026-10-25T00:30:00Z"))).toBe(60);
    expect(londonOffsetMinutes(new Date("2026-10-25T01:30:00Z"))).toBe(0);
    expect(londonOffsetMinutes(new Date("2027-03-28T00:30:00Z"))).toBe(0);
    expect(londonOffsetMinutes(new Date("2027-03-28T01:30:00Z"))).toBe(60);
    expect(londonInstant("2026-10-25", 12).toISOString()).toBe(
      "2026-10-25T12:00:00.000Z",
    );
    expect(londonInstant("2027-03-28", 12).toISOString()).toBe(
      "2027-03-28T11:00:00.000Z",
    );
  });
  it("adding calendar days ignores the clock change", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
  });
  it("the week runs Monday to Sunday", () => {
    expect(weekStart("2026-09-12")).toBe("2026-09-07");
    expect(weekStart("2026-09-13")).toBe("2026-09-07");
    expect(weekStart("2026-09-14")).toBe("2026-09-14");
  });
  it("§10.7 dates and times in copy", () => {
    expect(formatLongDate("2026-09-12", "2026-08-01")).toBe(
      "Saturday 12 September",
    );
    expect(formatLongDate("2027-01-09", "2026-12-01")).toBe(
      "Saturday 9 January 2027",
    );
    expect(formatShortDate("2026-09-12")).toBe("Sat 12 Sep");
    expect(formatClockTime(15, 42)).toBe("3:42pm");
    expect(formatClockTime(9)).toBe("9am");
    expect(formatClockTime(12)).toBe("12pm");
    expect(formatAdminTime(new Date("2026-09-12T13:05:00Z"))).toBe("14:05");
  });
});

describe("§10.7 references", () => {
  it("BBL-YYYY-NNNN, five digits after 9999", () => {
    expect(orderNumber(2026, 147)).toBe("BBL-2026-0147");
    expect(orderNumber(2026, 10000)).toBe("BBL-2026-10000");
  });
  it("enquiries and complaints", () => {
    expect(enquiryReference(2026, 12)).toBe("BBL-2026-E-0012");
    expect(complaintReference(2026, 3)).toBe("BBL-2026-C-0003");
  });
});

describe("§11.2 / §10.7 words", () => {
  it("lead time in words: three–sixty", () => {
    expect(leadTimeWords(5)).toBe("five days");
    expect(leadTimeWords(21)).toBe("twenty-one days");
    expect(leadTimeWords(60)).toBe("sixty days");
    expect(numberInWords(3)).toBe("three");
  });
  it("singular and plural", () => {
    expect(plural(1, "cake")).toBe("1 cake");
    expect(plural(3, "cake")).toBe("3 cakes");
    expect(plural(1, "more minute")).toBe("1 more minute");
  });
});
