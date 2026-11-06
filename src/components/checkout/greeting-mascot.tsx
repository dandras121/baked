"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./confirmed.module.css";

/** Samples 0/90/180/270/360/450 ms → progress 0/0.36/0.64/0.84/0.96/1 (ANIMATIONS ANIM-25). */
const PROGRESS = [0, 0.36, 0.64, 0.84, 0.96, 1];

/**
 * ANIM-25: the mascot peeks over the order-number card. Once per order (sessionStorage key = the order number; a
 * reload does not replay): 300 ms after first paint it rises from fully hidden behind the card's top edge and turns
 * from 18° to its resting 8° in 450 ms. Reduced motion, a reload or no JavaScript: it simply sits in place.
 * Decorative (aria-hidden).
 */
export function GreetingMascot({ orderNumber }: { orderNumber: string }) {
  const mark = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const m = mark.current;
    if (!m) return;
    const key = `bbl-greeted-${orderNumber}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      seen = true; // no storage: never risk greeting twice
    }
    m.dataset.state = "rest";
    if (seen || isMotionReduced()) return;
    const rise = parseFloat(getComputedStyle(m).getPropertyValue("--rise"));
    const a = m.animate(
      PROGRESS.map((p, i) => ({
        offset: i / (PROGRESS.length - 1),
        transform: `translateY(${(rise * (1 - p)).toFixed(2)}px) rotate(${(-18 + 10 * p).toFixed(2)}deg)`,
      })),
      { duration: 450, delay: 300, fill: "backwards" },
    );
    return () => a.cancel();
  }, [orderNumber]);

  return (
    <span className={styles.mascotClip} aria-hidden>
      <Image
        ref={mark}
        className={styles.mascot}
        src="/brand/logo-mark.svg"
        alt=""
        width={139}
        height={150}
        unoptimized
        data-greeting-mascot
      />
    </span>
  );
}
