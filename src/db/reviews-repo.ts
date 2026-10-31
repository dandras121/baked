import { and, count, desc, isNotNull, notInArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  monthLabel,
  ratingLine,
  reviewText,
  starsOf,
  toTenths,
  type ApiReviewPage,
  type ReviewCard,
} from "@/lib/reviews";
import { connect, databaseUrl } from "./client";
import { googleRating, googleReviews } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** Saving reviews (the daily sync, Check now) revalidates this tag. */
export const REVIEWS_TAG = "reviews";

/**
 * Stores one full sync (§11.4): new and edited reviews are upserted, ones no longer on Google are deleted,
 * the score and count are replaced. Only the listed fields are kept.
 */
export async function importReviews(
  db: Db,
  page: ApiReviewPage,
  reviewsUrl: string | null,
  fetchedAt = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    const ids = page.reviews.map((r) => r.reviewId);
    await (ids.length
      ? tx.delete(googleReviews).where(notInArray(googleReviews.id, ids))
      : tx.delete(googleReviews));
    for (const r of page.reviews) {
      const row = {
        id: r.reviewId,
        stars: starsOf(r.starRating),
        reviewerName: r.reviewer.displayName,
        text: reviewText(r.comment),
        createdAt: new Date(r.createTime),
        updatedAt: new Date(r.updateTime),
      };
      await tx
        .insert(googleReviews)
        .values(row)
        .onConflictDoUpdate({ target: googleReviews.id, set: row });
    }
    const rating = {
      ratingTenths: toTenths(page.averageRating),
      reviewCount: page.totalReviewCount,
      reviewsUrl,
      fetchedAt,
    };
    await tx
      .insert(googleRating)
      .values({ id: 1, ...rating })
      .onConflictDoUpdate({ target: googleRating.id, set: rating });
  });
}

const withText = isNotNull(googleReviews.text);

/** Cards newest first (§4.1): only reviews with text; every star rating. */
export async function readReviewCards(
  db: Db,
  offset: number,
  limit: number,
): Promise<ReviewCard[]> {
  const rows = await db
    .select()
    .from(googleReviews)
    .where(and(withText, sql`char_length(${googleReviews.text}) > 0`))
    .orderBy(desc(googleReviews.createdAt), desc(googleReviews.id))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({
    id: r.id,
    stars: r.stars,
    name: r.reviewerName,
    month: monthLabel(r.createdAt),
    text: r.text ?? "",
  }));
}

export async function countReviewCards(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(googleReviews)
    .where(withText);
  return row?.n ?? 0;
}

export async function readRating(db: Db) {
  const [row] = await db.select().from(googleRating).limit(1);
  return row ?? null;
}

export type HomeReviews = {
  total: number;
  first: ReviewCard[];
  rating: { text: string; label: string } | null;
  reviewsUrl: string | null;
};

/**
 * What Home needs (§4.1): the card count, the first page, the rating line and the reviews link.
 * Cached by tag; the rating's 30-day limit is checked against the time the cache entry was made,
 * and the entry lives at most a day (`cacheLife`).
 */
export async function getHomeReviews(firstPage: number): Promise<HomeReviews> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("days");
  if (!databaseUrl())
    return { total: 0, first: [], rating: null, reviewsUrl: null };
  const { db, close } = connect();
  try {
    const [total, first, rating] = await Promise.all([
      countReviewCards(db),
      readReviewCards(db, 0, firstPage),
      readRating(db),
    ]);
    return {
      total,
      first,
      rating: ratingLine(rating, new Date()),
      reviewsUrl: rating?.reviewsUrl ?? null,
    };
  } finally {
    await close();
  }
}
