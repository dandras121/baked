import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApiReviewPage } from "@/lib/reviews";
import { connect } from "./client";
import fixture from "./fixtures/google-reviews.json";
import {
  countReviewCards,
  importReviews,
  readRating,
  readReviewCards,
} from "./reviews-repo";

const url = process.env.TEST_DATABASE_URL;
const page = fixture as ApiReviewPage;

describe.skipIf(!url)("database: Google reviews (§4.1, §11.4)", () => {
  const conn = url ? connect(url) : null;
  beforeAll(async () => {
    await migrate(conn!.db, { migrationsFolder: "drizzle" });
    await importReviews(conn!.db, page, null);
  });
  afterAll(async () => conn?.close());

  it("only reviews with text are cards; every one of them, newest first", async () => {
    const withText = page.reviews.filter((r) => r.comment);
    expect(await countReviewCards(conn!.db)).toBe(withText.length);
    const all = await readReviewCards(conn!.db, 0, 500);
    expect(all).toHaveLength(withText.length);
    const times = all.map((c) => c.id);
    const expected = [...withText]
      .sort((a, b) => b.createTime.localeCompare(a.createTime))
      .map((r) => r.reviewId);
    expect(times).toEqual(expected);
    expect(new Set(all.map((c) => c.stars))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("pages of six follow on without gaps", async () => {
    const a = await readReviewCards(conn!.db, 0, 6);
    const b = await readReviewCards(conn!.db, 6, 6);
    const all = await readReviewCards(conn!.db, 0, 12);
    expect([...a, ...b]).toEqual(all);
  });

  it("a review no longer on Google is deleted at the next sync; the score is replaced", async () => {
    const fewer = {
      ...page,
      reviews: page.reviews.slice(1),
      averageRating: 4.9,
      totalReviewCount: 62,
    };
    await importReviews(conn!.db, fewer, "https://example.test/reviews");
    const ids = (await readReviewCards(conn!.db, 0, 500)).map((c) => c.id);
    expect(ids).not.toContain(page.reviews[0].reviewId);
    expect(await readRating(conn!.db)).toMatchObject({
      ratingTenths: 49,
      reviewCount: 62,
      reviewsUrl: "https://example.test/reviews",
    });
    await importReviews(conn!.db, page, null);
  });
});
