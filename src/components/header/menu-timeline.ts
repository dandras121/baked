// The mobile menu timelines (ANIMATIONS §4.2, §5–§7, §8.1; rows in §12). Pure maths, no DOM.
import data from "@/motion/keyframes.json";

export type MenuRow = {
  t: number;
  pink: number;
  white: number;
  arrowDeg: number;
  arrowShiftPx: number;
  menuOpacity: number;
  underline: number;
  socialOpacity: number;
};

export type MenuPart = "open" | "close" | "selectReverse";

const toRow = (r: number[]): MenuRow => ({
  t: r[0],
  pink: r[1],
  white: r[2],
  arrowDeg: r[3],
  arrowShiftPx: r[4],
  menuOpacity: r[5],
  underline: r[6],
  socialOpacity: r[7],
});

/**
 * The sampled rows of one part. On a landscape tablet the items and the underline appear one step later
 * (A§8.1): the landscape rows replace those two columns at their times.
 */
export function menuRows(part: MenuPart, landscape = false): MenuRow[] {
  const rows = (data[part] as number[][]).map(toRow);
  if (!landscape) return rows;
  const over = new Map(
    (data.landscapeTablet[part] as number[][]).map(([t, m, u]) => [t, [m, u]]),
  );
  return rows.map((row) => {
    const o = over.get(row.t);
    return o ? { ...row, menuOpacity: o[0], underline: o[1] } : row;
  });
}

/** Landscape tablet: 768–1119 px wide and wider than tall, decided when the animation starts (A§8.1). */
export const LANDSCAPE_QUERY =
  "(min-width: 768px) and (max-width: 1119.98px) and (orientation: landscape)";

export type Geometry = { x: number; y: number; rWhite: number; rPink: number };

/** Origin = the top-right corner of the “menu” button; R_white reaches the farthest corner (A§4.2). */
export function menuGeometry(
  button: { right: number; top: number },
  viewport: { width: number; height: number },
): Geometry {
  const x = button.right;
  const y = button.top;
  const dx = Math.max(x, viewport.width - x);
  const dy = Math.max(y, viewport.height - y);
  const rWhite = Math.ceil(Math.hypot(dx, dy));
  return { x, y, rWhite, rPink: rWhite + 24 };
}

export const circle = (r: number, g: Geometry) =>
  `circle(${Math.max(0, r)}px at ${g.x}px ${g.y}px)`;

export type Tracks = {
  duration: number;
  pink: Keyframe[];
  white: Keyframe[];
  arrow: Keyframe[];
  menu: Keyframe[];
  social: Keyframe[];
};

// The rows keep their underline column (A§12); the menu has no underline since Bohoka's decision of
// 2026-10-29, so no track is built from it.

/** Keyframes for every layer, linear between the rows (A§1.2). `start` is the first row's time. */
export function menuTracks(rows: MenuRow[], g: Geometry): Tracks {
  const start = rows[0].t;
  const duration = rows[rows.length - 1].t - start;
  const offset = (t: number) => (duration ? (t - start) / duration : 1);
  const map = (f: (r: MenuRow) => Keyframe) =>
    rows.map((r) => ({ offset: offset(r.t), ...f(r) }));
  return {
    duration,
    pink: map((r) => ({ clipPath: circle(r.pink * g.rPink, g) })),
    white: map((r) => ({ clipPath: circle(r.white * g.rWhite, g) })),
    arrow: map((r) => ({
      transform: `translateX(${r.arrowShiftPx}px) rotateY(${r.arrowDeg}deg)`,
    })),
    menu: map((r) => ({ opacity: r.menuOpacity })),
    social: map((r) => ({ opacity: r.socialOpacity })),
  };
}

/** ANIM-03 timeline (A§7.1). 0–240 ms was the underline change; the hand-over stays at 240 ms. */
export const SELECT = {
  retractMs: 80,
  drawMs: 160,
  handoffMs: 240,
  holdUntilMs: 300,
  endMs: 920,
  /** Items become interactive when the circles are done (A§5 “Input”). */
  interactiveAtMs: 660,
  easing: "cubic-bezier(0.33, 1, 0.68, 1)",
} as const;
