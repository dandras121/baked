import { describe, expect, it } from "vitest";
import { sliderWindow } from "@/components/ui/slider-window";
import {
  monthLabel,
  parseAfter,
  parseLimit,
  ratingLine,
  reviewText,
  starGlyphs,
  starsOf,
  toTenths,
} from "./reviews";

describe("Google reviews on Home (§4.1, §11.4)", () => {
  it("star ratings from the API words; every rating shows", () => {
    expect(
      ["ONE", "TWO", "THREE", "FOUR", "FIVE"].map((s) => starsOf(s as "ONE")),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(starGlyphs(4)).toBe("★★★★☆");
  });

  it("the reviewer's own language: the “(Translated by Google)” part is dropped", () => {
    expect(
      reviewText(
        "(Translated by Google) Wonderful, thank you!\n\n(Original)\nCsodálatos, köszönjük!",
      ),
    ).toBe("Csodálatos, köszönjük!");
    expect(reviewText("(Translated by Google) Only the translation")).toBe(
      "Only the translation",
    );
    expect(reviewText("  Lovely cake  ")).toBe("Lovely cake");
  });

  it("no text → not a card", () => {
    expect(reviewText(undefined)).toBeNull();
    expect(reviewText("   ")).toBeNull();
  });

  it("the month in Europe/London", () => {
    // 30 Sep 23:30 UTC is already 1 October in London (BST).
    expect(monthLabel(new Date("2026-09-30T23:30:00Z"))).toBe("October 2026");
  });

  it("rating line: one decimal, thousands separators, singular, accessible name", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const at = new Date("2026-10-30T03:00:00Z");
    expect(
      ratingLine({ ratingTenths: 49, reviewCount: 63, fetchedAt: at }, now),
    ).toEqual({
      text: "4.9 · 63 Google reviews",
      label: "Rated 4.9 out of 5 from 63 Google reviews",
    });
    expect(
      ratingLine({ ratingTenths: 50, reviewCount: 1, fetchedAt: at }, now)
        ?.text,
    ).toBe("5.0 · 1 Google review");
    expect(
      ratingLine({ ratingTenths: 47, reviewCount: 1234, fetchedAt: at }, now)
        ?.text,
    ).toBe("4.7 · 1,234 Google reviews");
    expect(toTenths(4.86)).toBe(49);
  });

  it("rating line hidden before a first value and when the last fetch is over 30 days old", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    expect(ratingLine(null, now)).toBeNull();
    expect(
      ratingLine(
        {
          ratingTenths: 49,
          reviewCount: 63,
          fetchedAt: new Date("2026-10-01T11:00:00Z"),
        },
        now,
      ),
    ).toBeNull();
    expect(
      ratingLine(
        {
          ratingTenths: 49,
          reviewCount: 63,
          fetchedAt: new Date("2026-10-01T13:00:00Z"),
        },
        now,
      ),
    ).not.toBeNull();
  });

  it("/api/reviews cursor and limit (at most 6)", () => {
    expect([
      parseAfter("12"),
      parseAfter("-1"),
      parseAfter("x"),
      parseAfter(null),
    ]).toEqual([12, 0, 0, 0]);
    expect([
      parseLimit("3"),
      parseLimit("50"),
      parseLimit(null),
      parseLimit("0"),
    ]).toEqual([3, 6, 6, 6]);
  });

  it("ANIM-10 with 200 reviews: at most five dashes, the active kept third", () => {
    for (const a of [0, 1, 2, 3, 100, 197, 198, 199]) {
      const { start, size } = sliderWindow(200, a);
      expect(size).toBe(5);
      expect(a).toBeGreaterThanOrEqual(start);
      expect(a).toBeLessThan(start + size);
    }
    expect(sliderWindow(200, 100).start).toBe(98);
    expect(sliderWindow(200, 199).start).toBe(195);
  });
});
