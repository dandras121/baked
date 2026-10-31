"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  GALLERY_PAGE,
  nextCount,
  photoIndex,
  shownCount,
  shownFor,
  type GalleryTile,
} from "@/lib/gallery";
import { GalleryPhoto } from "./gallery-photo";
import { Lightbox } from "./lightbox";
import styles from "./gallery.module.css";

const noSubscription = () => () => {};
const param = (name: string) =>
  new URLSearchParams(window.location.search).get(name);

/** The tiles that rise in after a Show the next (ANIM-17), at most 6 staggered by 40 ms. */
const stagger = (i: number) => `${Math.min(i, 5) * 40}ms`;

type Box = { index: number; pushed: boolean; closing: boolean };

/** The address with `photo` (and `shown`) set or removed; the rest of it kept. */
function address(photo: number | null, shown: number | null) {
  const url = new URL(window.location.href);
  if (photo === null) url.searchParams.delete("photo");
  else url.searchParams.set("photo", String(photo));
  if (shown !== null) url.searchParams.set("shown", String(shown));
  return url;
}

/**
 * The gallery grid, its paging and the lightbox (§4.8).
 * Paging: 12 at a time; “Showing x of y” and Show the next N, which keeps `?shown=` in the address (replaceState),
 * moves focus to the first new tile and lets the new tiles rise in (ANIM-17). Every tile is in the page: without
 * JavaScript all of them show (lazy-loaded) and the paging is not offered; with it, a shared `?shown=24` opens with 24.
 * Lightbox: a tile opens it and pushes `?photo=<id>`, so Back closes it; ‹ › replace the address; × and Esc go back.
 * A shared `?photo=<id>` opens it (× then removes the id); an unknown or hidden id is ignored.
 */
export function GalleryGrid({ tiles }: { tiles: GalleryTile[] }) {
  const total = tiles.length;
  // Read in the browser: the page itself is static.
  const askedShown = useSyncExternalStore(
    noSubscription,
    () => param("shown"),
    () => null,
  );
  const askedPhoto = useSyncExternalStore(
    noSubscription,
    () => param("photo"),
    () => null,
  );
  const [chosen, setShown] = useState<number | null>(null);
  const [risenFrom, setRisenFrom] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [linkUsed, setLinkUsed] = useState(false);

  const linked =
    !linkUsed && box === null ? photoIndex(tiles, askedPhoto) : null;
  const active: Box | null =
    box ??
    (linked !== null ? { index: linked, pushed: false, closing: false } : null);
  const base =
    chosen ??
    (askedShown
      ? shownCount(askedShown, total)
      : Math.min(GALLERY_PAGE, total));
  const shown = active ? shownFor(active.index, base, total) : base;
  const next = nextCount(shown, total);

  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  });

  useEffect(() => {
    if (risenFrom !== null)
      buttons.current[risenFrom]?.focus({ preventScroll: true });
  }, [risenFrom]);

  // Back closes the lightbox; Forward opens it again.
  useEffect(() => {
    const onPop = () => {
      const now = activeRef.current;
      const i = photoIndex(tiles, param("photo"));
      if (now && i === null) setBox({ ...now, closing: true });
      else if (!now && i !== null)
        setBox({ index: i, pushed: true, closing: false });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [tiles]);

  const open = (index: number) => {
    setLinkUsed(true);
    setBox({ index, pushed: true, closing: false });
    window.history.pushState(
      window.history.state,
      "",
      address(tiles[index].id, null),
    );
  };

  const moveTo = (index: number) => {
    if (!active) return;
    const wider = shownFor(index, shown, total);
    setShown(wider);
    setBox({ ...active, index });
    window.history.replaceState(
      window.history.state,
      "",
      address(tiles[index].id, wider > GALLERY_PAGE ? wider : null),
    );
  };

  const requestClose = () => {
    if (!active || active.closing) return;
    if (active.pushed) window.history.back();
    else {
      window.history.replaceState(
        window.history.state,
        "",
        address(null, null),
      );
      setLinkUsed(true);
      setBox({ ...active, closing: true });
    }
  };

  const closed = () => {
    const index = active?.index ?? 0;
    setShown(shown);
    setBox(null);
    setLinkUsed(true);
    requestAnimationFrame(() => buttons.current[index]?.focus());
  };

  return (
    <>
      <ul className={styles.grid} aria-label="Cakes I have made">
        {tiles.map((tile, i) => {
          const isNew = risenFrom !== null && i >= risenFrom;
          return (
            <li
              key={tile.id}
              data-later={i >= shown ? "" : undefined}
              className={`${styles.tile} ${isNew ? styles.rise : ""}`}
              style={
                isNew ? { animationDelay: stagger(i - risenFrom) } : undefined
              }
            >
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                className={styles.tileButton}
                aria-label={tile.caption}
                aria-haspopup="dialog"
                data-pressable
                onClick={() => open(i)}
              >
                <span
                  ref={(el) => {
                    frames.current[i] = el as HTMLDivElement | null;
                  }}
                  className={styles.frame}
                  data-pressable-content
                >
                  {tile.src && <GalleryPhoto src={tile.src} alt="" />}
                </span>
                <span className={styles.caption}>{tile.caption}</span>
              </button>
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
      {active && (
        <Lightbox
          tiles={tiles}
          index={active.index}
          origin={() => frames.current[active.index]}
          onIndex={moveTo}
          requestClose={requestClose}
          closing={active.closing}
          onClosed={closed}
        />
      )}
    </>
  );
}
