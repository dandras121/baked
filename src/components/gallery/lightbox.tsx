"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import { stepPhoto, type GalleryTile } from "@/lib/gallery";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./lightbox.module.css";

const L = data.surfaceMotion.lightbox;
const EASE_OUT = data.surfaceMotion.easeOut;
const EASE_IN = data.surfaceMotion.easeIn;
const SWIPE_PX = 40;

type LightboxProps = {
  tiles: GalleryTile[];
  index: number;
  /** The tile's photo box to grow from (null: open with a fade, e.g. from a shared link). */
  origin: () => HTMLElement | null;
  onIndex: (index: number) => void;
  /** The close has finished (after its animation): the parent removes the lightbox and focuses the tile. */
  onClosed: () => void;
  /** The lightbox asks to close (× or Esc); the parent decides how (Back, or replacing the address). */
  requestClose: () => void;
  /** Set by the parent when the close should now run (after Back, or after requestClose). */
  closing: boolean;
};

/** The box of `el` relative to `to`, as a FLIP transform for `to`. */
function flip(from: DOMRect, to: DOMRect) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

const onScreen = (r: DOMRect) =>
  r.bottom > 0 && r.top < window.innerHeight && r.width > 0;

/**
 * The gallery lightbox (§4.8, ANIM-14; desktop 1633:12049, phone 1637:11792): a modal dialog over an ink scrim with
 * the photo, its caption and occasion, “I’d like one like this →”, ‹ › (arrow keys too; phone: swipe, and the ‹ ›
 * beside “Swipe for the next cake”), the slider indicator and ×. Focus stays inside; Esc and × close.
 * Open: the photo grows from its tile (320 ms), the scrim fades to 88 % (240 ms), the controls come in at 200–320 ms.
 * Close: back into the tile (280 ms; a fade when the tile is off screen). Next: 24 px slide and fade (280 ms).
 */
export function Lightbox({
  tiles,
  index,
  origin,
  onIndex,
  onClosed,
  requestClose,
  closing,
}: LightboxProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const shown = useRef(index);
  const tile = tiles[index];
  const total = tiles.length;
  const prev = stepPhoto(index, -1, total);
  const next = stepPhoto(index, 1, total);

  const controls = () => [
    ...(dialog.current?.querySelectorAll<HTMLElement>("[data-control]") ?? []),
  ];

  // Open: show the dialog and grow the photo from the tile.
  useLayoutEffect(() => {
    const d = dialog.current!;
    d.showModal();
    if (isMotionReduced()) return;
    const from = origin()?.getBoundingClientRect();
    const to = photo.current!.getBoundingClientRect();
    scrim.current!.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: L.scrimMs,
      easing: "linear",
    });
    if (from && onScreen(from))
      photo.current!.animate(
        [{ transform: flip(from, to) }, { transform: "none" }],
        { duration: L.openMs, easing: EASE_OUT },
      );
    else
      photo.current!.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: L.openMs,
        easing: EASE_OUT,
      });
    const [start, end] = L.controlsIn;
    for (const el of controls())
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        delay: start,
        duration: end - start,
        easing: EASE_OUT,
        fill: "backwards",
      });
    // Only on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close: back into the tile, then hand back.
  useEffect(() => {
    if (!closing) return;
    const d = dialog.current!;
    const done = () => {
      d.close();
      onClosed();
    };
    if (isMotionReduced()) return done();
    const from = photo.current!.getBoundingClientRect();
    const to = origin()?.getBoundingClientRect();
    for (const el of controls())
      el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 100,
        fill: "forwards",
      });
    scrim.current!.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: L.closeMs,
      easing: "linear",
      fill: "forwards",
    });
    const a =
      to && onScreen(to)
        ? photo.current!.animate(
            [{ transform: "none" }, { transform: flip(to, from) }],
            { duration: L.closeMs, easing: EASE_IN, fill: "forwards" },
          )
        : photo.current!.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: L.closeMs,
            easing: EASE_IN,
            fill: "forwards",
          });
    a.finished.then(done, done);
    // Runs once, when the close starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Next / previous: the old photo slides 24 px the way of the move and fades; the new one comes in from 24 px.
  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = index;
    if (was === index || isMotionReduced()) return;
    const dir = index > was ? 1 : -1;
    photo.current!.animate(
      [
        { transform: `translateX(${dir * L.slidePx}px)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: L.nextMs, easing: EASE_OUT },
    );
  }, [index]);

  const go = useCallback(
    (to: number | null, from?: DOMRect) => {
      if (to === null || closing) return;
      // The leaving photo: a copy that slides out over the new one.
      const p = photo.current;
      if (p && stage.current && !isMotionReduced()) {
        const ghost = p.cloneNode(true) as HTMLElement;
        const r = from ?? p.getBoundingClientRect();
        const s = stage.current.getBoundingClientRect();
        ghost.removeAttribute("id");
        ghost.setAttribute("aria-hidden", "true");
        ghost.style.cssText = `position:absolute;left:${r.left - s.left}px;top:${r.top - s.top}px;width:${r.width}px;height:${r.height}px;margin:0;pointer-events:none`;
        stage.current.appendChild(ghost);
        const dir = to > index ? -1 : 1;
        ghost
          .animate(
            [
              { transform: getComputedStyle(p).transform, opacity: 1 },
              { transform: `translateX(${dir * L.slidePx}px)`, opacity: 0 },
            ],
            { duration: L.nextMs, easing: EASE_OUT, fill: "forwards" },
          )
          .finished.finally(() => ghost.remove());
      }
      onIndex(to);
    },
    [closing, index, onIndex],
  );

  // Swipe (touch): the photo follows the finger; past 40 px it moves on, otherwise it springs back.
  const drag = useRef<{ x: number; id: number } | null>(null);
  const pointer = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return;
      drag.current = { x: e.clientX, id: e.pointerId };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current || drag.current.id !== e.pointerId) return;
      const dx = e.clientX - drag.current.x;
      photo.current!.style.transform = `translateX(${dx}px)`;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      drag.current = null;
      const p = photo.current!;
      const target =
        Math.abs(dx) > SWIPE_PX
          ? stepPhoto(index, dx < 0 ? 1 : -1, total)
          : null;
      if (target !== null) {
        const r = p.getBoundingClientRect();
        p.style.transform = "";
        go(target, r);
      } else {
        const now = p.style.transform;
        p.style.transform = "";
        if (now && !isMotionReduced())
          p.animate([{ transform: now }, { transform: "none" }], {
            duration: 200,
            easing: EASE_OUT,
          });
      }
    },
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="lightbox-caption"
      aria-describedby="lightbox-position"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(next);
        else if (e.key === "ArrowLeft") go(prev);
        else return;
        e.preventDefault();
      }}
    >
      <div ref={scrim} className={styles.scrim} aria-hidden />
      <div ref={stage} className={styles.stage}>
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={requestClose}
          data-control
          data-pressable
        >
          <svg viewBox="0 0 18 18" aria-hidden>
            <path d="M3 3 15 15M15 3 3 15" />
          </svg>
        </button>
        <div className={styles.card}>
          <div ref={photo} className={styles.photo} {...pointer}>
            {tile.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={tile.id} src={tile.src} alt={tile.alt} />
            )}
          </div>
          <button
            type="button"
            className={`${styles.arrow} ${styles.prev}`}
            aria-label="Previous cake"
            disabled={prev === null}
            onClick={() => go(prev)}
            data-control
            data-pressable
          >
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M12.5 4 6.5 10l6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.next}`}
            aria-label="Next cake"
            disabled={next === null}
            onClick={() => go(next)}
            data-control
            data-pressable
          >
            <svg viewBox="0 0 20 20" aria-hidden>
              <path d="M7.5 4l6 6-6 6" />
            </svg>
          </button>
          <div className={styles.under} data-control>
            <SliderIndicator
              count={total}
              active={index}
              onSelect={(i) => go(i)}
              label={(i, n) => `Photo ${i + 1} of ${n}`}
              surface="dark"
            />
            <p
              id="lightbox-position"
              className="visually-hidden"
              aria-live="polite"
            >
              Photo {index + 1} of {total}
            </p>
            <div className={styles.hint}>
              <button
                type="button"
                className={styles.hintArrow}
                aria-label="Previous cake"
                disabled={prev === null}
                onClick={() => go(prev)}
              >
                <svg viewBox="0 0 14 14" aria-hidden>
                  <path d="M8.5 3 4.5 7l4 4" />
                </svg>
              </button>
              <span>Swipe for the next cake</span>
              <button
                type="button"
                className={styles.hintArrow}
                aria-label="Next cake"
                disabled={next === null}
                onClick={() => go(next)}
              >
                <svg viewBox="0 0 14 14" aria-hidden>
                  <path d="M5.5 3l4 4-4 4" />
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.captionBar} data-control>
            <div className={styles.text}>
              <h2 id="lightbox-caption" className={styles.caption}>
                {tile.caption}
              </h2>
              {tile.occasion && (
                <p className={styles.occasion}>{tile.occasion}</p>
              )}
            </div>
            <ButtonLink
              href={`/bespoke?inspired=${tile.id}`}
              className={styles.inspired}
            >
              I’d like one like this →
            </ButtonLink>
          </div>
        </div>
      </div>
    </dialog>
  );
}
