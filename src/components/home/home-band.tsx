import NextLink from "next/link";
import { CakeCard } from "@/components/cake-card/cake-card";
import type { CakeCardData } from "@/lib/home-content";
import { CakeCarousel } from "./cake-carousel";
import styles from "./home-band.module.css";

/** “Try my recipes.” above the pink band (desktop 1361:9950, phone 1384:10042). Only with visible designs. */
export function RecipesHeading() {
  return (
    <div className={styles.recipes}>
      <h2 id="try-my-recipes" className={styles.recipesTitle}>
        Try my recipes.
      </h2>
      <p className={styles.recipesLead}>
        My ideas are yours to taste and enjoy
      </p>
    </div>
  );
}

/** The top of the pink band: the collection link, the cards and the white line (§4.1). */
export function CakeRowInBand({ cakes }: { cakes: CakeCardData[] }) {
  return (
    <section className={styles.row} aria-labelledby="try-my-recipes">
      <NextLink
        href="/cakes"
        className={`${styles.collection} hit-44`}
        data-pressable=""
      >
        View the whole collection
        <svg
          viewBox="0 0 3.9 6.8"
          className={styles.collectionArrow}
          aria-hidden
        >
          <path
            d="M0.5 0.5L3.4 3.4L0.5 6.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </NextLink>
      <CakeCarousel>
        {cakes.map((cake) => (
          <li key={cake.slug} className={styles.slot}>
            <CakeCard cake={cake} />
          </li>
        ))}
      </CakeCarousel>
      <hr className={styles.rule} />
    </section>
  );
}
