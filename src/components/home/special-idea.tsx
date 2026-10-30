import NextLink from "next/link";
import { ButtonLink } from "@/components/ui/button";
import type { GallerySquare } from "@/lib/home-content";
import styles from "./special-idea.module.css";

/**
 * “Special idea?” (desktop 1588:10482, tablet 1642:11949, phone 1443:9297; §4.1). Four gallery squares
 * (not links): Linda's picks, then the newest photos, an empty square shows the placeholder background.
 * The gallery link hides while the gallery has no showing photo.
 */
export function SpecialIdea({
  squares,
  galleryLink,
}: {
  squares: (GallerySquare | null)[];
  galleryLink: boolean;
}) {
  const empty = squares.every((s) => s === null);
  return (
    <section className={styles.special} aria-labelledby="special-idea">
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed decorative asset */}
      <img
        className={styles.glow}
        src="/home/glow.webp"
        alt=""
        width={1540}
        height={630}
        loading="lazy"
        decoding="async"
      />
      <h2 id="special-idea" className={styles.title}>
        Special idea?
      </h2>
      <p className={styles.subhead}>
        Share it with me,
        <br />
        so I can make it real
      </p>
      <p className={styles.text}>
        If you have a special idea in your head about a dream cake, feel safe
        about working with me. We can go big or small with shape varieties from
        the most elegant to the funniest.
      </p>
      <div className={styles.pictures}>
        {galleryLink && (
          <NextLink
            href="/gallery"
            className={`${styles.gallery} hit-44`}
            data-pressable=""
          >
            take a look at my previous works gallery
            <svg
              viewBox="0 0 3.5 7"
              className={styles.galleryArrow}
              aria-hidden
            >
              <path d="M0 0L3.5 3.5L0 7" fill="currentColor" />
            </svg>
          </NextLink>
        )}
        <ul
          className={styles.squares}
          aria-label={empty ? undefined : "From the gallery"}
          aria-hidden={empty || undefined}
        >
          {squares.map((sq, i) => (
            <li
              key={sq?.id ?? `empty-${i}`}
              className={styles.square}
              data-empty={sq?.src ? undefined : ""}
            >
              {sq?.src && (
                // eslint-disable-next-line @next/next/no-img-element -- gallery photos come with uploads (9.x)
                <img
                  src={sq.src}
                  alt={sq.alt}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.actions}>
        <ButtonLink href="/bespoke" className={styles.start}>
          Start enquiry
        </ButtonLink>
        <p className={styles.note}>
          no prices paid until I answer your
          <br className={styles.wideBreak} /> message and we agree, we talk it
          through first
        </p>
      </div>
    </section>
  );
}
