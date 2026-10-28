import { describe, expect, it } from "vitest";
import { dashState, sliderWindow } from "./slider-window";

const visible = (n: number, a: number) => {
  const { start, size } = sliderWindow(n, a);
  return Array.from({ length: size }, (_, k) => start + k + 1); // 1-based items, as in ANIM-10
};

describe("ANIM-10 window: s = clamp(a − 2, 0, N − min(N, 5))", () => {
  it("N = 8: items 1–5 while the active is 1st to 3rd", () => {
    expect(visible(8, 0)).toEqual([1, 2, 3, 4, 5]);
    expect(visible(8, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(visible(8, 2)).toEqual([1, 2, 3, 4, 5]);
  });
  it("N = 8: a 3 → items 2–6, a 4 → 3–7 (the active stays 3rd)", () => {
    expect(visible(8, 3)).toEqual([2, 3, 4, 5, 6]);
    expect(visible(8, 4)).toEqual([3, 4, 5, 6, 7]);
  });
  it("N = 8: a 5–7 → items 4–8 (the active moves to 3rd, 4th, 5th)", () => {
    for (const a of [5, 6, 7]) expect(visible(8, a)).toEqual([4, 5, 6, 7, 8]);
  });
  it("N ≤ 5: nothing is hidden", () => {
    expect(visible(3, 2)).toEqual([1, 2, 3]);
    expect(visible(5, 4)).toEqual([1, 2, 3, 4, 5]);
  });
  it("N = 30, active 14 (storyboard row I): items 13–17", () => {
    expect(visible(30, 14)).toEqual([13, 14, 15, 16, 17]);
  });
});

describe("ANIM-10 dash states", () => {
  it("active 37, neighbours ±1 25, rest 19, outside the window hidden", () => {
    const states = Array.from({ length: 8 }, (_, i) => dashState(i, 8, 3));
    expect(states).toEqual([
      "hidden",
      "rest",
      "neighbour",
      "active",
      "neighbour",
      "rest",
      "hidden",
      "hidden",
    ]);
  });
  it("at most five dashes are ever visible", () => {
    for (const n of [1, 2, 5, 6, 8, 30, 200]) {
      for (let a = 0; a < n; a += Math.max(1, Math.floor(n / 7))) {
        const shown = Array.from({ length: n }, (_, i) =>
          dashState(i, n, a),
        ).filter((s) => s !== "hidden");
        expect(shown.length).toBe(Math.min(n, 5));
        expect(shown.filter((s) => s === "active")).toHaveLength(1);
      }
    }
  });
});
