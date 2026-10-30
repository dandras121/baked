import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { HeroSlider } from "./hero-slider";
import styles from "./hero.module.css";

/**
 * One hero slide: a picture and an optional text layer on top (§4.1: a generic container, so the
 * designed hero is slide 1's content, not a special-cased layout). `tone` fills an empty slide.
 */
export function HeroSlide({
  picture,
  children,
  tone,
}: {
  picture?: ReactNode;
  children?: ReactNode;
  tone?: "placeholder";
}) {
  return (
    <div className={styles.frame} data-tone={tone}>
      {picture && <div className={styles.picture}>{picture}</div>}
      {children && <div className={styles.layer}>{children}</div>}
    </div>
  );
}

/** The designed hero photo (1339:9947 / 1562:12136 / 1381:10082): a fixed asset, the phone has its own crop. */
function DesignedHeroPhoto() {
  return (
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet="/home/hero-wide-1200.webp 1200w, /home/hero-wide-1960.webp 1960w"
        sizes="(min-width: 1280px) 1202px, 94vw"
      />
      <img
        className={styles.photo}
        src="/home/hero-phone-452.webp"
        srcSet="/home/hero-phone-452.webp 452w, /home/hero-phone-904.webp 904w"
        sizes="100vw"
        width={904}
        height={1740}
        alt="Three of Linda’s celebration cakes on a marble table against a pink wall"
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  );
}

/** Slide 1: the current designed hero (itself a placeholder design, Decided 2026-10-23). */
function DesignedHeroSlide() {
  return (
    <HeroSlide picture={<DesignedHeroPhoto />}>
      <h1 className={styles.wordmark}>
        <span className={`${styles.baked} type-section`}>Baked</span>{" "}
        <span className={`${styles.by} type-wordmark-by`}>by</span>{" "}
        <span className={`${styles.linda} type-section`}>Linda</span>
      </h1>
      <h2 className={styles.question}>
        What’s your
        <br />
        dream cake?
      </h2>
      <p className={`${styles.body} ${styles.bodyWide} type-hero-body`}>
        Design a completely personalised cake from scratch and turn your
        sweetest ideas into something deliciously real.
      </p>
      <p className={`${styles.body} ${styles.bodyPhone} type-hero-body-phone`}>
        Turn your sweetest ideas into
        <br />
        something deliciously real.
      </p>
      <ButtonLink
        href="/bespoke"
        size="card"
        className={`${styles.cta} ${styles.start}`}
      >
        Start enquiry
      </ButtonLink>
      <ButtonLink
        href="/about"
        variant="outline"
        size="card"
        className={`${styles.cta} ${styles.about}`}
      >
        About Linda
      </ButtonLink>
    </HeroSlide>
  );
}

/** Placeholder-hero slide 2|3: development only; the label is a marker, not content. */
function PlaceholderSlide({ n }: { n: number }) {
  return (
    <HeroSlide tone="placeholder">
      <p className={styles.marker}>Hero slide {n} — placeholder</p>
    </HeroSlide>
  );
}

/** The Home hero (§4.1, UI-06). Live: the designed hero alone, without dashes or timer. */
export function Hero({ placeholders }: { placeholders: boolean }) {
  const slides = [<DesignedHeroSlide key="hero" />];
  if (placeholders)
    slides.push(
      <PlaceholderSlide key="p2" n={2} />,
      <PlaceholderSlide key="p3" n={3} />,
    );
  return (
    <section
      className={styles.hero}
      aria-label="Welcome"
      data-testid="hero"
      data-slides={slides.length}
    >
      <HeroSlider slides={slides} />
    </section>
  );
}
