"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./site-footer.module.css";

/**
 * ANIM-06: the footer mascot peeks in once per page when its corner is 80 % on screen (A§7D).
 * A still, invisible sentinel over the mascot's visible area is watched, never the moving mascot.
 * The hidden start state exists only while JavaScript runs (html.js, mascot.css); without
 * JavaScript, without IntersectionObserver or with reduced motion it simply sits in place.
 */
export function FooterMascot() {
  const pathname = usePathname();
  const sentinel = useRef<HTMLSpanElement>(null);
  const mark = useRef<HTMLImageElement>(null);

  // Every page (also after a client-side navigation) gets its own peek.
  useEffect(() => {
    const s = sentinel.current;
    const m = mark.current;
    if (!s || !m) return;
    m.classList.remove("is-in");
    if (!("IntersectionObserver" in window)) {
      m.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.intersectionRatio >= 0.8)) {
          m.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.8 },
    );
    io.observe(s);
    return () => io.disconnect();
  }, [pathname]);

  return (
    <>
      <span ref={sentinel} className={styles.sentinel} aria-hidden />
      <Image
        ref={mark}
        className={`${styles.mascot} footer-mascot`}
        src="/brand/logo-mark.svg"
        alt=""
        aria-hidden
        width={139}
        height={150}
        unoptimized
      />
    </>
  );
}
