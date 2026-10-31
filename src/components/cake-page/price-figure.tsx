"use client";

import { useLayoutEffect, useRef, useState } from "react";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./cake-page.module.css";

const P = data.surfaceMotion.price;
const { easeIn, easeOut } = data.surfaceMotion;

/**
 * A price that changes (ANIM-20): the old figure goes up 6 px and out (0–120 ms), the new one comes up from 6 px
 * below (80–240 ms). Tabular figures; screen readers hear only the final value. Reduced motion: it swaps at once.
 */
export function PriceFigure({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const [old, setOld] = useState<string | null>(null);
  const shown = useRef(text);
  const box = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (shown.current === text) return;
    const before = shown.current;
    shown.current = text;
    if (isMotionReduced()) return;
    setOld(before);
  }, [text]);

  useLayoutEffect(() => {
    if (old === null || !box.current) return;
    const out = box.current.querySelector<HTMLElement>("[data-old]");
    const now = box.current.querySelector<HTMLElement>("[data-new]");
    out?.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: `translateY(-${P.shiftPx}px)` },
      ],
      { duration: P.out[1] - P.out[0], easing: easeIn, fill: "forwards" },
    );
    const a = now?.animate(
      [
        { opacity: 0, transform: `translateY(${P.shiftPx}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        delay: P.in[0],
        duration: P.in[1] - P.in[0],
        easing: easeOut,
        fill: "backwards",
      },
    );
    let done = false;
    const finish = () => {
      if (!done) setOld(null);
      done = true;
    };
    a?.finished.then(finish, () => {});
    return () => {
      done = true;
    };
  }, [old]);

  return (
    <span className={`${styles.figure} ${className}`} ref={box}>
      <span className="visually-hidden" aria-live="polite">
        {text}
      </span>
      <span aria-hidden data-new key={text}>
        {text}
      </span>
      {old !== null && (
        <span
          aria-hidden
          data-old
          className={styles.figureOld}
          key={`old-${old}`}
        >
          {old}
        </span>
      )}
    </span>
  );
}
