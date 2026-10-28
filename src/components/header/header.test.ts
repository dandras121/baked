import { describe, expect, it } from "vitest";
import data from "@/motion/keyframes.json";
import { activeIndexFor, NAV_ITEMS, NAV_LEFTS } from "./nav-items";
import {
  edgesAt,
  SLIDE_MS,
  SLIDE_ROWS,
  slideKeyframes,
} from "./underline-slide";

const label = (path: string) =>
  NAV_ITEMS[activeIndexFor(path)]?.label ?? "none";

describe("A§3.3 active navigation item per page", () => {
  it.each([
    ["/", "Home"],
    ["/cakes", "Cakes"],
    ["/cakes/the-lothian", "Cakes"],
    ["/order/when", "Cakes"],
    ["/order/details", "Cakes"],
    ["/order/pay", "Cakes"],
    ["/order/confirmed", "Cakes"],
    ["/bespoke", "Bespoke"],
    ["/bespoke/sent", "Bespoke"],
    ["/my-enquiry/abc123", "Bespoke"],
    ["/gallery", "Gallery"],
    ["/about", "About Linda"],
    ["/faq", "FAQ"],
    ["/contact", "Contact"],
    ["/contact/sent", "Contact"],
    ["/contact/", "Contact"],
  ])("%s → %s", (path, expected) => {
    expect(label(path)).toBe(expected);
  });

  it.each([
    "/find-my-order",
    "/terms",
    "/privacy",
    "/cookies",
    "/delivery-and-collection",
    "/cancellations",
    "/accessibility",
    "/complaints",
    "/complaints/sent",
    "/allergens",
    "/my-order/tok",
    "/my-order/tok/change",
    "/pay/tok",
    "/delivery/tok",
    "/unsubscribe/tok",
    "/no-such-page",
    "/cakesx",
    "/abouts",
  ])("%s has no active item", (path) => {
    expect(activeIndexFor(path)).toBe(-1);
  });
});

describe("A§8 STYLE-01 desktop navigation geometry", () => {
  it("seven items in the decided order with the drawn word widths", () => {
    expect(NAV_ITEMS.map((i) => [i.label, i.width])).toEqual([
      ["Home", 40],
      ["Cakes", 40],
      ["Bespoke", 57],
      ["Gallery", 48],
      ["About Linda", 81],
      ["FAQ", 28],
      ["Contact", 53],
    ]);
  });

  it("items are 32 px apart and the group is 539 px wide", () => {
    const last = NAV_ITEMS.length - 1;
    expect(NAV_LEFTS[last] + NAV_ITEMS[last].width).toBe(539);
    expect(NAV_LEFTS[1] - (NAV_LEFTS[0] + NAV_ITEMS[0].width)).toBe(32);
  });

  it("in the 1280 header Cakes spans 776–816 and About Linda 1017–1098 (A§7F example)", () => {
    const groupLeft = 1243 - 539;
    expect(groupLeft + NAV_LEFTS[1]).toBe(776);
    expect(groupLeft + NAV_LEFTS[4] + 81).toBe(1098);
    expect(groupLeft + NAV_LEFTS[4]).toBe(1017);
  });
});

describe("ANIM-08 underline slide (A§7F, rows A§12)", () => {
  const cakes = { left: 776, right: 816 };
  const about = { left: 1017, right: 1098 };

  it("uses the A§12 rows: 420 ms, weight switch at 210 ms", () => {
    expect(SLIDE_MS).toBe(420);
    expect(data.navUnderlineSlide.weightSwitchMs).toBe(210);
    expect(SLIDE_ROWS.map((r) => r[0])).toEqual([
      0, 60, 120, 180, 240, 300, 360, 420,
    ]);
  });

  // The example columns of the A§7F table, moving right and moving left.
  const right = [
    [776, 816],
    [814.6, 889.3],
    [891.7, 996.5],
    [973.6, 1078.3],
    [1024.2, 1112.1],
    [1023.0, 1100.8],
    [1016.5, 1096.9],
    [1017, 1098],
  ];
  const left = [
    [1017, 1098],
    [954.3, 1052.9],
    [862.8, 962.6],
    [792.9, 866.8],
    [764.0, 807.5],
    [773.6, 809.0],
    [777.0, 816.6],
    [776, 816],
  ];

  it.each(SLIDE_ROWS.map((r, i) => [r[0], i]))(
    "moving right at %i ms the right edge leads (Cakes → About Linda)",
    (_t, i) => {
      const [, lead, trail] = SLIDE_ROWS[i];
      const e = edgesAt(cakes, about, lead, trail);
      expect(e.left).toBeCloseTo(right[i][0], 0);
      expect(e.right).toBeCloseTo(right[i][1], 0);
    },
  );

  it.each(SLIDE_ROWS.map((r, i) => [r[0], i]))(
    "moving left at %i ms the left edge leads (About Linda → Cakes)",
    (_t, i) => {
      const [, lead, trail] = SLIDE_ROWS[i];
      const e = edgesAt(about, cakes, lead, trail);
      expect(e.left).toBeCloseTo(left[i][0], 0);
      expect(e.right).toBeCloseTo(left[i][1], 0);
    },
  );

  it("stretches to at most about 2.5 × the short width in the middle", () => {
    const widths = slideKeyframes(cakes, about).map((k) =>
      parseFloat(k.width as string),
    );
    expect(Math.max(...widths)).toBeLessThanOrEqual(2.75 * 40);
    expect(Math.max(...widths)).toBeGreaterThan(81);
  });

  it("keyframes animate left and width only (never scaleX), linear offsets", () => {
    const k = slideKeyframes(cakes, about);
    expect(k.map((f) => f.offset)).toEqual(SLIDE_ROWS.map((r) => r[0] / 420));
    for (const f of k)
      expect(Object.keys(f).sort()).toEqual(["left", "offset", "width"]);
  });
});
