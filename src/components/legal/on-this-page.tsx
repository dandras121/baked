"use client";

import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./legal.module.css";

/**
 * “On this page” (§4.5): a jump scrolls (at once with reduced motion), keeps clear of the sticky header (the
 * page's scroll padding), updates the address and moves the focus to the heading. Not sticky, no active state.
 */
export function OnThisPage({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <nav className={styles.toc} aria-labelledby="on-this-page">
      <p id="on-this-page" className={styles.tocTitle}>
        On this page
      </p>
      <ol className={styles.tocList}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`${styles.tocLink} hit-24`}
              onClick={(e) => {
                const target = document.getElementById(item.id);
                if (!target || e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                target.scrollIntoView({
                  behavior: isMotionReduced() ? "auto" : "smooth",
                  block: "start",
                });
                history.pushState(null, "", `#${item.id}`);
                target.focus({ preventScroll: true });
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
