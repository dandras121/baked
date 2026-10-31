"use client";

import NextLink from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import type { CakeCardData } from "@/lib/home-content";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./cake-card.module.css";
import { animateCard } from "./card-motion";

/** Opening a card closes any other open card on the page (ANIM-11 row E). */
const OPEN_EVENT = "bbl:cake-card-open";

/**
 * The cake card (§4.1, §4.2; desktop 1776:12902, tablet 1776:12914, phone catalogue 1777:12902, phone Home
 * 1777:12926). View and the cake name go to the cake page; the rest of the card is not a link. With a card video
 * the corner button opens the card in place (ANIM-11): the picture grows and zooms in on the cake, the title moves
 * into the bottom row, the description and tiers fade; closing reverses it. Without one: the main photo (the
 * placeholder until photos arrive) and no button.
 */
export function CakeCard({
  cake,
  variant = "home",
}: {
  cake: CakeCardData;
  /** home: the Home row (274 wide on the phone); catalogue: the full range (two columns on the phone). */
  variant?: "home" | "catalogue";
}) {
  const href = `/cakes/${cake.slug}`;
  const id = useId();
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLElement>(null);
  const changed = useRef<"open" | "close" | null>(null);

  const toggle = (next: boolean) => {
    if (next === open) return;
    changed.current = next ? "open" : "close";
    if (next) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(next);
  };

  // Another card opened: this one closes at the same moment.
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id && open) {
        changed.current = "close";
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id, open]);

  // The motion runs from where things were to where the new state puts them.
  useLayoutEffect(() => {
    const how = changed.current;
    changed.current = null;
    if (!how || !card.current || isMotionReduced()) return;
    animateCard(card.current, how);
  }, [open]);

  return (
    <article
      ref={card}
      className={styles.card}
      data-variant={variant}
      data-cake-card
      data-open={open ? "" : undefined}
    >
      <div className={styles.picture}>
        <div className={styles.media} data-media>
          {cake.cardVideo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.frame}
              data-frame
              src={cake.cardVideo.still}
              alt=""
              loading="lazy"
            />
          )}
        </div>
        {cake.cardVideo && (
          <button
            type="button"
            className={styles.corner}
            aria-expanded={open}
            aria-label={`${open ? "Close" : "Show"} the ${cake.name} video`}
            data-pressable
            onClick={() => toggle(!open)}
          >
            <span data-pressable-content className={styles.cornerInner}>
              <span className={`${styles.chevron} ${styles.chevronA}`}>
                <svg viewBox="0 0 10 18" aria-hidden data-chevron>
                  <path d="M9 1 1 9l8 8" />
                </svg>
              </span>
              <span className={`${styles.chevron} ${styles.chevronB}`}>
                <svg viewBox="0 0 10 18" aria-hidden data-chevron>
                  <path d="M9 1 1 9l8 8" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      <h3 className={styles.name} data-title>
        <NextLink href={href} className={styles.nameLink}>
          {cake.name}
        </NextLink>
      </h3>
      {/* The title's place in the open card (the bottom row); the motion moves between the two. */}
      {cake.cardVideo && (
        <span className={styles.openTitle} data-open-title aria-hidden>
          <span className={styles.openTitleText} data-open-title-text>
            {cake.name}
          </span>
        </span>
      )}
      <p className={styles.flavour} data-fade>
        {cake.flavour}
      </p>
      <div className={styles.bottom}>
        <p className={styles.tiers} data-fade>
          <span>{cake.tiers}</span>
          <span className="visually-hidden">, </span>
          <span>{cake.serves}</span>
        </p>
        <div className={styles.buy}>
          <p className={styles.from}>{cake.from}</p>
          <ButtonLink href={href} size="card" className={styles.view}>
            View<span className="visually-hidden"> {cake.name}</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
