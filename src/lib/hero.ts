// Home hero slider (SITE-FLOWS §4.1, ANIMATIONS UI-06).

/** UI-06: the timer, the crossfade and its curve. The interval becomes an admin setting with the slides (§9.12). */
export const HERO = {
  intervalMs: 6000,
  crossfadeMs: 400,
  /** CSS `ease`; samples at 0 / 100 / 200 / 300 / 400 ms → 0 / 0.409 / 0.802 / 0.96 / 1. */
  easing: "ease",
  /** A horizontal swipe longer than this changes the slide (Proposal). */
  swipePx: 40,
} as const;

type Env = Record<string, string | undefined>;

/**
 * The placeholder slides 2–3 (Decided 2026-10-23) are for development only.
 * Never on the live site (VERCEL_ENV=production), always on Vercel previews and `next dev`;
 * a local production build turns them on with BBL_HERO_PLACEHOLDERS=1 (the end-to-end tests do).
 */
export function heroPlaceholdersEnabled(env: Env = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.VERCEL_ENV === "preview") return true;
  if (env.NODE_ENV === "development") return true;
  return env.BBL_HERO_PLACEHOLDERS === "1";
}

/** `?hero=live` on a preview shows the hero as the live site does: the designed slide alone. */
export function wantsLiveHero(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return params.hero === "live";
}

/** The slide shown after `active`, wrapping from the last back to the first (UI-06 storyboard 3 → 1). */
export function nextSlide(active: number, count: number, step = 1): number {
  return (((active + step) % count) + count) % count;
}
