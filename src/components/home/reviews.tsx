import type React from "react";
import { getHomeReviews } from "@/db/reviews-repo";
import { REVIEWS_PAGE } from "@/lib/reviews";
import { ReviewsCarousel } from "./reviews-carousel";
import styles from "./reviews.module.css";

/**
 * “Thoughts on my work.” = Linda's Google reviews (§4.1, Decided 2026-10-22; desktop 522:2731, tablet
 * 1562:12233, phone 686:4785). Not rendered at all without a review that has text.
 */
export async function Reviews() {
  const { total, first, rating, reviewsUrl } =
    await getHomeReviews(REVIEWS_PAGE);
  if (total === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="thoughts">
      <h2 id="thoughts" className={styles.title}>
        Thoughts on my work.
      </h2>
      {rating && (
        // The visible text stays the start of the accessible name (WCAG 2.5.3); the words follow, hidden.
        <RatingLine reviewsUrl={reviewsUrl}>
          <span aria-hidden>★ </span>
          {rating.text}
          <span className="visually-hidden">
            {" "}
            ({rating.label}
            {reviewsUrl ? ", opens in a new tab" : ""})
          </span>
        </RatingLine>
      )}
      <ReviewsCarousel total={total} first={first} reviewsUrl={reviewsUrl} />
    </section>
  );
}

function RatingLine({
  reviewsUrl,
  children,
}: {
  reviewsUrl: string | null;
  children: React.ReactNode;
}) {
  return reviewsUrl ? (
    <a
      href={reviewsUrl}
      target="_blank"
      rel="noopener"
      className={`${styles.rating} ${styles.ratingLink} hit-24`}
      data-testid="google-rating"
    >
      {children}
    </a>
  ) : (
    <p className={styles.rating} data-testid="google-rating">
      {children}
    </p>
  );
}
