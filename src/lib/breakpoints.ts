// Breakpoints, RESPONSIVE.md §1 (Decided). Keep in step with src/styles/responsive.css.
export const TABLET_MIN = 768;
export const DESKTOP_MIN = 1120;
export const PAGE_MAX = 1280;

export type Band = "phone" | "tablet" | "desktop";

export function bandFor(viewportWidth: number): Band {
  if (viewportWidth >= DESKTOP_MIN) return "desktop";
  if (viewportWidth >= TABLET_MIN) return "tablet";
  return "phone";
}

/** RESPONSIVE §3.2: tablet font size = max(0.8 × desktop, min(desktop, 14 px)). */
export function tabletFontSize(desktopPx: number): number {
  return Math.max(0.8 * desktopPx, Math.min(desktopPx, 14));
}

/** One design pixel in CSS pixels at a viewport width (phone: 402 design; tablet/desktop: 1280 design, capped). */
export function designUnit(viewportWidth: number): number {
  if (bandFor(viewportWidth) === "phone") return viewportWidth / 402;
  return Math.min(viewportWidth, PAGE_MAX) / PAGE_MAX;
}
