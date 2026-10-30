"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import { HERO, nextSlide } from "@/lib/hero";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./hero.module.css";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mql = window.matchMedia(REDUCE_QUERY);
  mql.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => {
    mql.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

/**
 * The hero slider (UI-06): every N s the next slide fades in above the current one (400 ms ease); the
 * one underneath stays fully opaque and is dropped at the end. Pauses while hovered (mouse) or while
 * something inside has keyboard focus, and with the pause button; never advances with reduced motion.
 * Dashes (ANIM-10) and a swipe (touch) choose a slide and restart the timer. With one slide: no controls.
 */
export function HeroSlider({ slides }: { slides: ReactNode[] }) {
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    isMotionReduced,
    () => false,
  );
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  const show = useCallback(
    (next: number) => {
      if (next === active) return;
      setLeaving(isMotionReduced() ? null : active);
      setActive(next);
    },
    [active],
  );

  // The crossfade: the incoming slide is on top and fades 0 → 1; the outgoing one leaves at the end.
  useLayoutEffect(() => {
    if (leaving === null) return;
    const el = slideRefs.current[active];
    if (!el) return;
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: HERO.crossfadeMs,
      easing: HERO.easing,
    });
    fade.onfinish = () => setLeaving(null);
    return () => fade.cancel();
  }, [active, leaving]);

  const autoplay = count > 1 && playing && !hovered && !focused && !reduced;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(
      () => show(nextSlide(active, count)),
      HERO.intervalMs,
    );
    return () => window.clearTimeout(timer);
  }, [autoplay, active, count, show]);

  if (count < 2) {
    return (
      <div className={styles.slider}>
        <div className={styles.stage}>
          <div className={styles.slide}>{slides[0]}</div>
        </div>
      </div>
    );
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < HERO.swipePx || Math.abs(dx) < Math.abs(dy)) return;
    show(nextSlide(active, count, dx < 0 ? 1 : -1));
  };

  // Keyboard focus only: a tap or click on a dash must not stop the slides for good.
  const onFocus = (e: FocusEvent) =>
    setFocused((e.target as HTMLElement).matches(":focus-visible"));
  const onBlur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
      setFocused(false);
  };

  return (
    <div
      className={styles.slider}
      role="region"
      aria-roledescription="carousel"
      aria-label="Highlights"
      data-hero-slider
      data-autoplay={autoplay ? "" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div
        className={styles.stage}
        aria-live={autoplay ? "off" : "polite"}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {slides.map((slide, i) => {
          const state =
            i === active ? "active" : i === leaving ? "leaving" : "hidden";
          return (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              data-state={state}
              aria-hidden={i === active ? undefined : true}
              inert={i !== active}
            >
              {slide}
            </div>
          );
        })}
      </div>
      <div className={styles.controls}>
        <SliderIndicator
          count={count}
          active={active}
          onSelect={show}
          label={(i, n) => `Slide ${i + 1} of ${n}`}
          align="left"
        />
        <button
          type="button"
          className={`${styles.pause} hit-44`}
          data-pressable
          aria-label={playing ? "Pause the slides" : "Play the slides"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? (
            <svg viewBox="0 0 10 10" aria-hidden>
              <rect x="1.5" y="1" width="2.2" height="8" rx="0.8" />
              <rect x="6.3" y="1" width="2.2" height="8" rx="0.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" aria-hidden>
              <path d="M2.2 1.2 8.6 5 2.2 8.8Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
