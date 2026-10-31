"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SliderIndicator } from "@/components/ui/slider-indicator";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./about.module.css";

export type AboutCard = { title: string; text: string };

const PHONE = "(max-width: 767.98px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(PHONE);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};

/**
 * “What do we offer?” (§4.3). Phone: a swipe row (scroll-snap) with the slider indicator; each card is
 * pressable and on release only scrolls itself to the centre (ANIM-07, ANIM-10). Tablet and desktop: side
 * by side, not pressable, no indicator.
 */
export function AboutCards({ cards }: { cards: AboutCard[] }) {
  const phone = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const pitch = () => {
    const slots = track.current?.children;
    if (!slots || slots.length < 2) return 1;
    return (
      (slots[1] as HTMLElement).offsetLeft -
      (slots[0] as HTMLElement).offsetLeft
    );
  };

  useEffect(() => {
    const el = track.current;
    if (!el || !phone) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setActive(
          Math.min(
            cards.length - 1,
            Math.max(0, Math.round(el.scrollLeft / pitch())),
          ),
        ),
      );
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [phone, cards.length]);

  const go = useCallback((i: number) => {
    track.current?.scrollTo({
      left: i * pitch(),
      behavior: isMotionReduced() ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className={styles.offer}>
      <ul
        ref={track}
        className={styles.cards}
        aria-label="What we offer"
        // The phone row scrolls: it takes keyboard focus so the arrow keys can move it (WCAG 2.1.1).
        tabIndex={phone ? 0 : undefined}
      >
        {cards.map((card, i) => (
          <li
            key={card.title}
            className={styles.card}
            data-pressable={phone ? "" : undefined}
            aria-label={phone ? `Card ${i + 1} of ${cards.length}` : undefined}
            onClick={phone ? () => go(i) : undefined}
          >
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <p className={styles.cardText}>{card.text}</p>
          </li>
        ))}
      </ul>
      {phone && cards.length > 1 && (
        <div className={styles.indicator}>
          <SliderIndicator
            count={cards.length}
            active={active}
            onSelect={go}
            label={(i, n) => `Card ${i + 1} of ${n}`}
          />
        </div>
      )}
    </div>
  );
}
