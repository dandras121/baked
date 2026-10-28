"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { isMotionReduced } from "@/motion/reduced-motion";
import { activeIndexFor, NAV_ITEMS, NAV_LEFTS } from "./nav-items";
import {
  DRAW_MS,
  drawKeyframes,
  slideKeyframes,
  SLIDE_MS,
  WEIGHT_SWITCH_MS,
  type Edges,
} from "./underline-slide";
import styles from "./desktop-nav.module.css";

const edgesOf = (i: number): Edges => ({
  left: NAV_LEFTS[i],
  right: NAV_LEFTS[i] + NAV_ITEMS[i].width,
});

const samePath = (a: string, b: string) =>
  a.replace(/\/$/, "") === b.replace(/\/$/, "");

/**
 * Desktop navigation (≥ 1120 px, SITE-FLOWS §3.1): seven items, the active one SemiBold and underlined
 * (STYLE-01), aria-current="page". Clicking another item slides the underline (ANIM-08) while the
 * client-side navigation runs; clicking the item of the page you are on reloads that page.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const active = activeIndexFor(pathname);

  // `line`: the item the underline belongs to; `bold`: the item drawn SemiBold (switches at 210 ms).
  const [line, setLine] = useState(active);
  const [bold, setBold] = useState(active);
  const [pending, setPending] = useState<number | null>(null);
  const [seenActive, setSeenActive] = useState(active);

  // The route changed. After our own click the slide is already running; otherwise (Back / Forward,
  // a link elsewhere on the page) the underline simply jumps (A§7F “Back / forward: no slide”).
  if (active !== seenActive) {
    setSeenActive(active);
    if (pending !== active) {
      setLine(active);
      setBold(active);
    }
    setPending(null);
  }

  const underline = useRef<HTMLSpanElement>(null);
  const animation = useRef<{ anim: Animation; to: number } | null>(null);
  const weightTimer = useRef<number | undefined>(undefined);

  // A slide that no longer matches the underline's item (Back during a slide) stops at once.
  useEffect(() => {
    const a = animation.current;
    if (a && a.to !== line) {
      a.anim.cancel();
      animation.current = null;
    }
  }, [line]);

  useEffect(() => () => window.clearTimeout(weightTimer.current), []);

  function startSlide(to: number) {
    const el = underline.current;
    window.clearTimeout(weightTimer.current);
    if (!el || isMotionReduced()) {
      animation.current?.anim.cancel();
      animation.current = null;
      setBold(to);
      return;
    }
    let keyframes: Keyframe[];
    let duration: number;
    let easing = "linear";
    if (line < 0) {
      keyframes = drawKeyframes(edgesOf(to));
      duration = DRAW_MS;
      easing = "cubic-bezier(0.33, 1, 0.68, 1)";
    } else {
      // A second click during a slide starts from the current edges (A§7F Interruptions).
      const cs = getComputedStyle(el);
      const left = parseFloat(cs.left);
      const from = { left, right: left + parseFloat(cs.width) };
      keyframes = slideKeyframes(from, edgesOf(to));
      duration = SLIDE_MS;
    }
    animation.current?.anim.cancel();
    const anim = el.animate(keyframes, { duration, easing, fill: "forwards" });
    animation.current = { anim, to };
    anim.onfinish = () => {
      if (animation.current?.anim === anim) animation.current = null;
      anim.cancel(); // the inline style already holds the end position
    };
    weightTimer.current = window.setTimeout(
      () => setBold(to),
      line < 0 ? 0 : WEIGHT_SWITCH_MS,
    );
  }

  function onItemClick(e: MouseEvent<HTMLAnchorElement>, i: number) {
    // A modifier or middle click opens a new tab without any slide.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const href = NAV_ITEMS[i].href;
    if (i === active && samePath(pathname, href)) {
      // The current item reloads the page: fresh, at the top, filters and search cleared (A§7F).
      e.preventDefault();
      window.scrollTo(0, 0);
      window.location.assign(href);
      return;
    }
    if (i === line) return; // same item, another page (e.g. Cakes from a cake page): no slide
    startSlide(i);
    setLine(i);
    setPending(i);
  }

  const lineEdges = line >= 0 ? edgesOf(line) : null;

  return (
    <nav aria-label="Main" className={styles.nav}>
      <ul className={styles.list}>
        {NAV_ITEMS.map((item, i) => (
          <li
            key={item.href}
            className={styles.item}
            style={{ width: item.width }}
          >
            <Link
              href={item.href}
              className={`${styles.link} hit-44`}
              data-pressable="nav"
              data-bold={i === bold ? "" : undefined}
              aria-current={i === active ? "page" : undefined}
              onClick={(e) => onItemClick(e, i)}
            >
              <span data-pressable-content className={styles.label}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <span
        ref={underline}
        aria-hidden
        data-testid="nav-underline"
        className={styles.underline}
        style={
          lineEdges
            ? {
                left: lineEdges.left,
                width: lineEdges.right - lineEdges.left,
              }
            : { display: "none" }
        }
      />
    </nav>
  );
}
