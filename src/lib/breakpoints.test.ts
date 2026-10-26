import { describe, expect, it } from "vitest";
import { bandFor, designUnit, tabletFontSize } from "./breakpoints";

describe("RESPONSIVE §1 breakpoints", () => {
  it.each([
    [360, "phone"],
    [402, "phone"],
    [767, "phone"],
    [768, "tablet"],
    [1024, "tablet"],
    [1119, "tablet"],
    [1120, "desktop"],
    [1280, "desktop"],
    [1600, "desktop"],
  ] as const)("%i px is %s", (width, band) => {
    expect(bandFor(width)).toBe(band);
  });
});

describe("RESPONSIVE §3.2 tablet type formula", () => {
  it.each([
    [155, 124],
    [64, 51.2],
    [24, 19.2],
    [17, 14],
    [16, 14],
    [14, 14],
    [11, 11],
    [8, 8],
  ])("desktop %i px → tablet %d px", (desktop, tablet) => {
    expect(tabletFontSize(desktop)).toBeCloseTo(tablet, 5);
  });
});

describe("RESPONSIVE §2–4 design unit", () => {
  it("phone design is 402 wide and fluid", () => {
    expect(designUnit(402)).toBe(1);
    expect(designUnit(360) * 402).toBeCloseTo(360);
  });
  it("tablet at 1024 is the desktop design × 0.8 (§3.2)", () => {
    expect(designUnit(1024)).toBeCloseTo(0.8);
    expect(355 * designUnit(1024)).toBeCloseTo(284);
  });
  it("other tablet widths scale with the viewport (§3.3: 432 px column at 820 ≈ 346 px)", () => {
    expect(432 * designUnit(820)).toBeCloseTo(276.75, 1);
    expect(0.8 * 432 * (820 / 1024)).toBeCloseTo(276.75, 1);
  });
  it("desktop is fluid from 1120 to 1279 and fixed from 1280 (§4)", () => {
    expect(designUnit(1200)).toBeCloseTo(1200 / 1280);
    expect(designUnit(1280)).toBe(1);
    expect(designUnit(1600)).toBe(1);
  });
});
