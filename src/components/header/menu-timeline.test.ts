import { describe, expect, it } from "vitest";
import {
  menuGeometry,
  menuRows,
  menuTracks,
  SELECT,
  type MenuPart,
} from "./menu-timeline";

const phone = menuGeometry(
  { right: 385, top: 22 },
  { width: 402, height: 902 },
);

describe("A§4.2 origin and radii", () => {
  it("402 × 902: origin at the button's top-right corner, R_white 961, R_pink 985", () => {
    expect(phone).toEqual({ x: 385, y: 22, rWhite: 961, rPink: 985 });
  });

  it("tablet 1024 × 1366: origin 1007, 22; R_white 1680, R_pink 1704 (A§8.1)", () => {
    const g = menuGeometry(
      { right: 1007, top: 22 },
      { width: 1024, height: 1366 },
    );
    expect([g.rWhite, g.rPink]).toEqual([1680, 1704]);
  });

  it("tablet landscape 1024 × 768: R_white 1254, R_pink 1278 (A§8.1)", () => {
    const g = menuGeometry(
      { right: 1007, top: 22 },
      { width: 1024, height: 768 },
    );
    expect([g.rWhite, g.rPink]).toEqual([1254, 1278]);
  });
});

describe("ANIM-01 open: the Figma steps (storyboard 1497:8799, step n = (n − 1) × 55 ms)", () => {
  const rows = menuRows("open");
  // “rózsa” and “fehér” of the step labels, Befedés 1 … 13.
  const pink = [0, 135, 262, 381, 491, 591, 682, 763, 833, 892, 938, 971, 985];
  const white = [0, 10, 37, 101, 183, 271, 364, 457, 548, 640, 733, 841, 961];

  it.each(pink.map((p, i) => [i + 1, i * 55, p, white[i]]))(
    "step %i at %i ms: pink %i px, white %i px",
    (_step, t, p, w) => {
      const row = rows.find((r) => r.t === t)!;
      expect(Math.round(row.pink * phone.rPink)).toBe(p);
      expect(Math.round(row.white * phone.rWhite)).toBe(w);
    },
  );

  it("870 ms in all; items from 495 ms, the social block 660–870 ms; the arrow turns 0 → 180°", () => {
    expect(rows.at(-1)!.t).toBe(870);
    expect(rows.find((r) => r.menuOpacity > 0)!.t).toBe(550);
    expect(rows.find((r) => r.underline > 0)!.t).toBe(495);
    expect(rows.find((r) => r.socialOpacity > 0)!.t).toBe(730);
    expect(rows.find((r) => r.t === 660)!.arrowDeg).toBe(180);
    expect(rows.at(-1)!.arrowShiftPx).toBe(3.11);
  });
});

describe("ANIM-02 close and ANIM-03 reveal", () => {
  it("close is the reverse of open in 760 ms: social out first, circles shrink 220–760", () => {
    const rows = menuRows("close");
    expect(rows.at(-1)!.t).toBe(760);
    expect(rows.find((r) => r.t === 220)!.socialOpacity).toBe(0);
    expect(rows.find((r) => r.t === 220)!.pink).toBe(1);
    expect(rows.at(-1)!.pink).toBe(0);
  });

  it("the select reveal runs 300–920 ms (620 ms after the hold)", () => {
    const rows = menuRows("selectReverse");
    expect([rows[0].t, rows.at(-1)!.t]).toEqual([300, 920]);
    expect(menuTracks(rows, phone, 94).duration).toBe(620);
  });

  it("A§7.1 timeline: retract 0–80, draw 80–240, hand-over 240, hold to 300, end 920", () => {
    expect(SELECT.retractMs).toBe(80);
    expect(SELECT.retractMs + SELECT.drawMs).toBe(SELECT.handoffMs);
    expect([SELECT.handoffMs, SELECT.holdUntilMs, SELECT.endMs]).toEqual([
      240, 300, 920,
    ]);
  });
});

describe("A§8.1 landscape tablet: items and underline one step later", () => {
  it("open: items 0.25 at 605, 0.65 at 660, 1 at 730; the underline follows; social unchanged", () => {
    const rows = menuRows("open", true);
    const at = (t: number) => rows.find((r) => r.t === t)!;
    expect([
      at(550).menuOpacity,
      at(605).menuOpacity,
      at(660).menuOpacity,
      at(730).menuOpacity,
    ]).toEqual([0, 0.25, 0.65, 1]);
    expect([at(550).underline, at(605).underline, at(660).underline]).toEqual([
      0.0212, 0.3596, 0.7826,
    ]);
    expect(rows.map((r) => r.socialOpacity)).toEqual(
      menuRows("open").map((r) => r.socialOpacity),
    );
    expect(rows.map((r) => r.pink)).toEqual(
      menuRows("open").map((r) => r.pink),
    );
  });

  it("close and select mirror it; total durations do not change", () => {
    for (const part of ["close", "selectReverse"] as MenuPart[]) {
      expect(menuRows(part, true).at(-1)!.t).toBe(menuRows(part).at(-1)!.t);
    }
    expect(menuRows("close", true).find((r) => r.t === 310)!.menuOpacity).toBe(
      0,
    );
  });
});

describe("A§1 global rules for the menu tracks", () => {
  it.each(["open", "close", "selectReverse"] as MenuPart[])(
    "%s: under 1 s, linear offsets 0 → 1, only clip-path / transform / opacity / width",
    (part) => {
      const tracks = menuTracks(menuRows(part), phone, 94.5);
      expect(tracks.duration).toBeLessThan(1000);
      const layers = [
        tracks.pink,
        tracks.white,
        tracks.arrow,
        tracks.menu,
        tracks.underline,
        tracks.social,
      ];
      for (const frames of layers) {
        expect(frames[0].offset).toBe(0);
        expect(frames.at(-1)!.offset).toBe(1);
        for (const f of frames)
          for (const key of Object.keys(f))
            expect([
              "offset",
              "clipPath",
              "transform",
              "opacity",
              "width",
            ]).toContain(key);
      }
    },
  );

  it("circles are clip-path circles around the origin; the arrow uses rotateY without perspective (A§4.4)", () => {
    const t = menuTracks(menuRows("open"), phone, 94.5);
    expect(t.pink.at(-1)!.clipPath).toBe("circle(985px at 385px 22px)");
    expect(t.white.at(-1)!.clipPath).toBe("circle(961px at 385px 22px)");
    expect(t.arrow.at(-1)!.transform).toBe(
      "translateX(3.11px) rotateY(180deg)",
    );
    expect(t.underline.at(-1)!.width).toBe("94.5px");
  });
});
