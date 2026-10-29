"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";
import { activeIndexFor, NAV_ITEMS } from "./nav-items";
import styles from "./desktop-nav.module.css";

/** The clicked item turns SemiBold at 210 ms (ANIM-08; the underline itself was removed, see DEVIATIONS). */
const WEIGHT_SWITCH_MS = data.navUnderlineSlide.weightSwitchMs;

const samePath = (a: string, b: string) =>
  a.replace(/\/$/, "") === b.replace(/\/$/, "");

/**
 * Desktop navigation (≥ 1120 px, SITE-FLOWS §3.1): seven items, the current page's item SemiBold with
 * aria-current="page". No underline (Bohoka 2026-10-29). Clicking the item of the page you are on
 * reloads that page.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const active = activeIndexFor(pathname);

  // `bold`: the item drawn SemiBold; after a click it switches at 210 ms while the page changes.
  const [bold, setBold] = useState(active);
  const [pending, setPending] = useState<number | null>(null);
  const [seenActive, setSeenActive] = useState(active);

  // The route changed. After our own click the switch is already scheduled; otherwise (Back / Forward,
  // a link elsewhere on the page) the weight simply follows the page.
  if (active !== seenActive) {
    setSeenActive(active);
    if (pending !== active) setBold(active);
    setPending(null);
  }

  const weightTimer = useRef<number | undefined>(undefined);
  const clicked = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(weightTimer.current), []);
  // A route change that is not the clicked item (Back / Forward meanwhile) cancels the pending switch.
  useEffect(() => {
    if (clicked.current !== null && clicked.current !== active) {
      window.clearTimeout(weightTimer.current);
      clicked.current = null;
    }
  }, [active]);

  function onItemClick(e: MouseEvent<HTMLAnchorElement>, i: number) {
    // A modifier or middle click opens a new tab.
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
    if (i === bold) return;
    window.clearTimeout(weightTimer.current);
    clicked.current = i;
    setPending(i);
    weightTimer.current = window.setTimeout(
      () => {
        clicked.current = null;
        setBold(i);
      },
      isMotionReduced() || active < 0 ? 0 : WEIGHT_SWITCH_MS,
    );
  }

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
    </nav>
  );
}
