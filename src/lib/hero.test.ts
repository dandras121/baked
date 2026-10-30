import { describe, expect, it } from "vitest";
import {
  HERO,
  heroPlaceholdersEnabled,
  nextSlide,
  wantsLiveHero,
} from "./hero";

describe("hero placeholder slides are development only (§4.1, Decided 2026-10-23)", () => {
  it("never on the live site, even with the local switch on", () => {
    expect(
      heroPlaceholdersEnabled({
        VERCEL_ENV: "production",
        NODE_ENV: "production",
        BBL_HERO_PLACEHOLDERS: "1",
      }),
    ).toBe(false);
  });

  it("on Vercel previews and in next dev", () => {
    expect(heroPlaceholdersEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(heroPlaceholdersEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("a local production build only with BBL_HERO_PLACEHOLDERS=1", () => {
    expect(heroPlaceholdersEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      heroPlaceholdersEnabled({
        NODE_ENV: "production",
        BBL_HERO_PLACEHOLDERS: "1",
      }),
    ).toBe(true);
  });

  it("?hero=live asks for the live view", () => {
    expect(wantsLiveHero({ hero: "live" })).toBe(true);
    expect(wantsLiveHero({})).toBe(false);
  });
});

describe("UI-06 timer and order", () => {
  it("advances every 6 s with a 400 ms ease crossfade", () => {
    expect(HERO.intervalMs).toBe(6000);
    expect(HERO.crossfadeMs).toBe(400);
    expect(HERO.easing).toBe("ease");
  });

  it("loops 1 → 2 → 3 → 1 and back", () => {
    expect([0, 1, 2].map((i) => nextSlide(i, 3))).toEqual([1, 2, 0]);
    expect(nextSlide(0, 3, -1)).toBe(2);
  });

  it("CSS ease gives the storyboard samples 0 / 0.409 / 0.802 / 0.96 / 1", () => {
    // cubic-bezier(0.25, 0.1, 0.25, 1), solved for x = t.
    const bez = (a: number, b: number) => (s: number) =>
      3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
    const x = bez(0.25, 0.25);
    const y = bez(0.1, 1);
    const at = (t: number) => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (x(mid) < t) lo = mid;
        else hi = mid;
      }
      return y((lo + hi) / 2);
    };
    const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => at(t));
    [0, 0.409, 0.802, 0.96, 1].forEach((v, i) =>
      expect(samples[i]).toBeCloseTo(v, 2),
    );
  });
});
