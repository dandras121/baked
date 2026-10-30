"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./home-band.module.css";

/**
 * The Home cake row (§4.1): when every card fits it is a static row; otherwise a carousel — phone and tablet
 * swipe (scroll-snap, RESPONSIVE §3.5), desktop arrows that move one card and are aria-disabled at the
 * first / last card (no looping).
 */
export function CakeCarousel({ children }: { children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft >= max - 1 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>("li");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({
      left: dir * (card.offsetWidth + gap),
      behavior: isMotionReduced() ? "auto" : "smooth",
    });
  };

  const fits = edges.start && edges.end;

  return (
    <div className={styles.carousel} data-fits={fits ? "" : undefined}>
      <ul ref={track} className={styles.track} aria-label="Cakes">
        {children}
      </ul>
      {!fits && (
        <div className={styles.arrows}>
          <button
            type="button"
            className={`${styles.arrow} hit-44`}
            data-pressable
            aria-label="Previous cakes"
            aria-disabled={edges.start || undefined}
            onClick={() => !edges.start && step(-1)}
          >
            <Chevron flip />
          </button>
          <button
            type="button"
            className={`${styles.arrow} hit-44`}
            data-pressable
            aria-label="Next cakes"
            aria-disabled={edges.end || undefined}
            onClick={() => !edges.end && step(1)}
          >
            <Chevron />
          </button>
        </div>
      )}
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 9.39 16.78"
      className={styles.chevron}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M1 1L8.39 8.39L1 15.78"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
