"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./home-band.module.css";

type Position = { active: number; count: number };

/**
 * The Home cake row (§4.1): when every card fits it is a static row; otherwise a carousel — phone and tablet
 * swipe (scroll-snap, RESPONSIVE §3.5), desktop arrows that move one card and are aria-disabled at the first /
 * last position (no looping). Under the row the slider indicator (ANIM-10) shows where the row is, with the
 * desktop arrows on its line (Bohoka 2026-10-31; ANIM-10 had left the Home cake row without one).
 * One dash per position the row can stop at: the first card at the left edge, up to the end of the row.
 */
export function CakeCarousel({ children }: { children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<Position>({ active: 0, count: 1 });

  /** The distance between two cards, from the layout. */
  const pitch = useCallback(() => {
    const slots = track.current?.children;
    if (!slots || slots.length < 2) return 1;
    return (
      (slots[1] as HTMLElement).offsetLeft -
      (slots[0] as HTMLElement).offsetLeft
    );
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setPos({ active: 0, count: 1 });
      return;
    }
    const p = pitch();
    const count = Math.ceil((max - 1) / p) + 1;
    const active =
      el.scrollLeft >= max - 1
        ? count - 1
        : Math.min(count - 1, Math.round(el.scrollLeft / p));
    setPos((prev) =>
      prev.active === active && prev.count === count ? prev : { active, count },
    );
  }, [pitch]);

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

  const go = useCallback(
    (index: number) => {
      const el = track.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollTo({
        left: Math.min(max, Math.max(0, index) * pitch()),
        behavior: isMotionReduced() ? "auto" : "smooth",
      });
    },
    [pitch],
  );

  const fits = pos.count < 2;
  const first = pos.active <= 0;
  const last = pos.active >= pos.count - 1;

  return (
    <div className={styles.carousel} data-fits={fits ? "" : undefined}>
      <ul ref={track} className={styles.track} aria-label="Cakes">
        {children}
      </ul>
      {!fits && (
        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.arrow} hit-44`}
            data-pressable
            aria-label="Previous cakes"
            aria-disabled={first || undefined}
            onClick={() => !first && go(pos.active - 1)}
          >
            <Chevron flip />
          </button>
          <div className={styles.indicator}>
            <SliderIndicator
              count={pos.count}
              active={pos.active}
              onSelect={go}
              label={(i, n) => `Cakes, position ${i + 1} of ${n}`}
            />
          </div>
          <button
            type="button"
            className={`${styles.arrow} hit-44`}
            data-pressable
            aria-label="Next cakes"
            aria-disabled={last || undefined}
            onClick={() => !last && go(pos.active + 1)}
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
