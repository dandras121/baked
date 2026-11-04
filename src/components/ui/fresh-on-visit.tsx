"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The router keeps a page it has shown and brings it back as it was. For a page that must start afresh on each
 * visit (the cake page: after “Added to your order”, coming back to the same cake shows the form again, not the old
 * panel), the content is drawn anew whenever the page is shown again.
 */
export function FreshOnVisit({ children }: { children: ReactNode }) {
  const [visit, setVisit] = useState(0);
  const shownBefore = useRef(false);
  useEffect(() => {
    if (shownBefore.current) setVisit((v) => v + 1);
    shownBefore.current = true;
  }, []);
  return <Fragment key={visit}>{children}</Fragment>;
}
