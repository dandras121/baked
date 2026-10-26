// A§1.4: with reduced motion every animation becomes an instant state change.
// The dev pages can force it with <html data-motion="reduce">.
export function isMotionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
