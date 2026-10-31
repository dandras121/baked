import { describe, expect, it } from "vitest";
import data from "@/motion/keyframes.json";
import {
  CARD_CROPS,
  closedCrop,
  cropTransform,
  openCrop,
  type CardKind,
} from "./card-crop";

// The drawn picture boxes (ANIM-11): closed and open width × height.
const BOXES: Record<
  CardKind,
  { closed: [number, number]; open: [number, number] }
> = {
  desktop: { closed: [355, 220.7], open: [355, 294] },
  tablet: { closed: [284, 177], open: [284, 235.2] },
  phoneHome: { closed: [273.9, 273], open: [273.9, 372.9] },
  phoneCatalogue: { closed: [196, 195], open: [196, 276] },
};

const aspect = (c: { x0: number; y0: number; x1: number; y1: number }) =>
  (c.x1 - c.x0) / (c.y1 - c.y0);

describe("ANIM-11 crops of the square card video", () => {
  it("the drawn crops match the JSON appendix", () => {
    const j = data.cakeCard.crops;
    const flat = (c: { x0: number; y0: number; x1: number; y1: number }) => [
      c.x0,
      c.y0,
      c.x1,
      c.y1,
    ];
    expect(flat(CARD_CROPS.desktop.closed)).toEqual(j.desktopTablet.closed);
    expect(flat(CARD_CROPS.desktop.open)).toEqual(j.desktopTablet.open);
    expect(flat(CARD_CROPS.phoneHome.open)).toEqual(j.phoneHome.open);
    expect(flat(CARD_CROPS.phoneCatalogue.open)).toEqual(j.phoneCatalogue.open);
  });

  it.each(Object.keys(BOXES) as CardKind[])(
    "%s: every crop has the box's aspect, shares the bottom edge and is centred",
    (kind) => {
      const { closed, open } = BOXES[kind];
      for (const [crop, [w, h]] of [
        [CARD_CROPS[kind].closed, closed],
        [CARD_CROPS[kind].open, open],
      ] as const) {
        expect(aspect(crop)).toBeCloseTo(w / h, 1);
        expect(crop.y1).toBe(1);
        expect(crop.x0 + crop.x1).toBeCloseTo(1, 6);
      }
    },
  );

  it.each(Object.keys(BOXES) as CardKind[])(
    "%s: the rule gives the drawn crops",
    (kind) => {
      const { closed, open } = BOXES[kind];
      const c = closedCrop(closed[0] / closed[1]);
      const o = openCrop(open[0] / open[1]);
      const d = CARD_CROPS[kind];
      for (const k of ["x0", "y0", "x1", "y1"] as const) {
        // Within 1 % of the frame (the nearly square catalogue card's closed crop is drawn as the whole frame).
        expect(Math.abs(c[k] - d.closed[k])).toBeLessThan(0.01);
        expect(Math.abs(o[k] - d.open[k])).toBeLessThan(0.01);
      }
    },
  );

  it("the transform puts the crop exactly into the box", () => {
    const { x, y, s } = cropTransform(CARD_CROPS.desktop.open, 355);
    expect(s).toBeCloseTo(1 / 0.7728, 6);
    // The crop's top-left lands on the box's top-left, its bottom on the box's bottom.
    expect(x + 0.1136 * 355 * s).toBeCloseTo(0, 6);
    expect(y + 0.36 * 355 * s).toBeCloseTo(0, 6);
    expect(y + 355 * s).toBeCloseTo(294, 0);
  });
});
