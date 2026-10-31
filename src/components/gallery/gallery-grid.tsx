"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  GALLERY_PAGE,
  nextCount,
  shownCount,
  type GalleryTile,
} from "@/lib/gallery";
import { GalleryPhoto } from "./gallery-photo";
import styles from "./gallery.module.css";

const noSubscription = () => () => {};

/** The tiles that rise in after a Show the next (ANIM-17), at most 6 staggered by 40 ms. */
const stagger = (i: number) => `${Math.min(i, 5) * 40}ms`;

/**
 * The gallery grid and its paging (§4.8): 12 at a time; “Showing x of y” and Show the next N, which keeps
 * `?shown=` in the address (replaceState), moves focus to the first new tile and lets the new tiles rise in
 * (ANIM-17). Every tile is in the page: without JavaScript all of them show (lazy-loaded) and the paging is not
 * offered; with it, a shared `?shown=24` opens with 24.
 */
export function GalleryGrid({ tiles }: { tiles: GalleryTile[] }) {
  // A shared address with `?shown=` opens with those tiles (read in the browser; the page itself is static).
  const asked = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("shown"),
    () => null,
  );
  const [chosen, setShown] = useState<number | null>(null);
  const shown =
    chosen ??
    (asked
      ? shownCount(asked, tiles.length)
      : Math.min(GALLERY_PAGE, tiles.length));
  const [risenFrom, setRisenFrom] = useState<number | null>(null);
  const firstNew = useRef<HTMLLIElement>(null);
  const total = tiles.length;
  const next = nextCount(shown, total);

  useEffect(() => {
    if (risenFrom !== null) firstNew.current?.focus({ preventScroll: true });
  }, [risenFrom]);

  return (
    <>
      <ul className={styles.grid} aria-label="Cakes I have made">
        {tiles.map((tile, i) => {
          const isNew = risenFrom !== null && i >= risenFrom;
          return (
            <li
              key={tile.id}
              data-later={i >= shown ? "" : undefined}
              ref={i === risenFrom ? firstNew : undefined}
              tabIndex={i === risenFrom ? -1 : undefined}
              className={`${styles.tile} ${isNew ? styles.rise : ""}`}
              style={
                isNew ? { animationDelay: stagger(i - risenFrom) } : undefined
              }
            >
              <div className={styles.frame}>
                {tile.src && <GalleryPhoto src={tile.src} alt={tile.alt} />}
              </div>
              <p className={styles.caption} title={tile.caption}>
                {tile.caption}
              </p>
            </li>
          );
        })}
      </ul>
      <div className={styles.paging}>
        <p className={styles.count} aria-live="polite">
          Showing {Math.min(shown, total)} of {total}
        </p>
        {next > 0 && (
          <a
            href={`/gallery?shown=${shown + next}`}
            className={`${styles.more} hit-44`}
            data-pressable
            onClick={(e) => {
              e.preventDefault();
              const to = shown + next;
              setRisenFrom(shown);
              setShown(to);
              const url = new URL(window.location.href);
              url.searchParams.set("shown", String(to));
              window.history.replaceState(window.history.state, "", url);
            }}
          >
            <span data-pressable-content>Show the next {next}</span>
          </a>
        )}
      </div>
    </>
  );
}
