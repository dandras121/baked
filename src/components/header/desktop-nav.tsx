"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { activeIndexFor, NAV_ITEMS } from "./nav-items";
import styles from "./desktop-nav.module.css";

const samePath = (a: string, b: string) =>
  a.replace(/\/$/, "") === b.replace(/\/$/, "");

/**
 * Desktop navigation (≥ 1120 px, SITE-FLOWS §3.1): seven items, the current page's item SemiBold with
 * aria-current="page". No underline (Bohoka 2026-10-29); the weight changes over 200 ms (2026-10-30).
 * Clicking the item of the page you are on reloads that page.
 */
export function DesktopNav() {
  const pathname = usePathname();
  const active = activeIndexFor(pathname);

  // `bold`: the item drawn SemiBold. A click moves it at once (the weight change itself is a 200 ms
  // transition, Bohoka 2026-10-30); any route change (Back / Forward, other links) follows the page.
  const [bold, setBold] = useState(active);
  const [seenActive, setSeenActive] = useState(active);
  if (active !== seenActive) {
    setSeenActive(active);
    setBold(active);
  }

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
    setBold(i);
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
