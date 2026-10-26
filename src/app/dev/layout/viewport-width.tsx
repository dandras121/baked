"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};

export function ViewportWidth() {
  const width = useSyncExternalStore(
    subscribe,
    () => document.documentElement.clientWidth,
    () => null,
  );
  return (
    <output data-testid="viewport-width">
      {width === null ? "…" : `${width} px`}
    </output>
  );
}
