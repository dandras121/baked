// Linda's Google reviews on Home (§4.1 testimonials and rating line, §11.4). Pure rules; the database side is
// src/db/reviews-repo.ts.

/** Business Profile API `starRating` values. */
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;
export type StarRating = keyof typeof STARS;

/** One review as the Business Profile API returns it (accounts.locations.reviews.list). */
export type ApiReview = {
  reviewId: string;
  reviewer: { displayName: string };
  starRating: StarRating;
  comment?: string;
  createTime: string;
  updateTime: string;
};

export type ApiReviewPage = {
  reviews: ApiReview[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
};

/** What a card shows; the only fields `/api/reviews` sends. */
export type ReviewCard = {
  id: string;
  stars: number;
  name: string;
  /** “October 2026”, Europe/London. */
  month: string;
  text: string;
};

/** How many reviews one `/api/reviews` call returns at most, and how many the page arrives with. */
export const REVIEWS_PAGE = 6;

export function starsOf(rating: StarRating): number {
  return STARS[rating];
}

/**
 * The text in the reviewer's own language (§4.1): Google adds a translation as
 * “(Translated by Google) … (Original) …”; the original is kept, the translation dropped.
 * Empty text → null (the review counts, but is not a card).
 */
export function reviewText(comment: string | undefined | null): string | null {
  if (!comment) return null;
  let text = comment;
  const original = text.indexOf("(Original)");
  if (original >= 0) text = text.slice(original + "(Original)".length);
  else text = text.replace(/^\s*\(Translated by Google\)\s*/, "");
  text = text.trim();
  return text === "" ? null : text;
}

const MONTH = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

export function monthLabel(date: Date): string {
  return MONTH.format(date);
}

/** “★★★★☆” for the eye; the words are in `starsLabel`. */
export function starGlyphs(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function starsLabel(stars: number): string {
  return `Rated ${stars} out of 5`;
}

/** Google's terms: a score older than 30 days is not shown (§11.4). */
export const RATING_MAX_AGE_DAYS = 30;

/**
 * The rating line (§4.1 Proposal format): “★ 4.9 · 63 Google reviews”, one decimal, thousands separators,
 * singular for one; accessible name “Rated 4.9 out of 5 from 63 Google reviews”. Null when there is no
 * value yet or the last successful fetch is more than 30 days old.
 */
export function ratingLine(
  rating: { ratingTenths: number; reviewCount: number; fetchedAt: Date } | null,
  now: Date,
): { text: string; label: string } | null {
  if (!rating) return null;
  const age = now.getTime() - rating.fetchedAt.getTime();
  if (age > RATING_MAX_AGE_DAYS * 86_400_000) return null;
  const score = (rating.ratingTenths / 10).toFixed(1);
  const n = rating.reviewCount.toLocaleString("en-GB");
  const reviews = rating.reviewCount === 1 ? "Google review" : "Google reviews";
  return {
    text: `${score} · ${n} ${reviews}`,
    label: `Rated ${score} out of 5 from ${n} ${reviews}`,
  };
}

/** The average as stored: 4.86 → 49 (tenths). */
export function toTenths(average: number): number {
  return Math.round(average * 10);
}

/** Cursor of `/api/reviews`: the number of cards already loaded. Anything else → 0. */
export function parseAfter(after: string | null): number {
  const n = Number(after);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export function parseLimit(limit: string | null): number {
  const n = Number(limit);
  return Number.isInteger(n) && n >= 1
    ? Math.min(n, REVIEWS_PAGE)
    : REVIEWS_PAGE;
}
