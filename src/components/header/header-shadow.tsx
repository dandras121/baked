"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * ANIM-24: the sticky header shows a faint shadow once the page is scrolled past 0, and loses it at
 * the top. Only the crossing changes anything; the header's size and colour never change.
 */
export function HeaderShadow({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let scrolled: boolean | null = null;
    const update = () => {
      const now = window.scrollY > 0;
      if (now === scrolled) return;
      scrolled = now;
      if (now) el.setAttribute("data-scrolled", "");
      else el.removeAttribute("data-scrolled");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div ref={root} className={className} data-testid="site-header">
      {children}
    </div>
  );
}
