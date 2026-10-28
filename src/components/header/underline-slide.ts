// ANIM-08: the desktop navigation underline slides to the clicked item (ANIMATIONS §7F, rows in §12).
import data from "@/motion/keyframes.json";

export type Edges = { left: number; right: number };

const slide = data.navUnderlineSlide;
export const SLIDE_MS = slide.durationMs;
export const WEIGHT_SWITCH_MS = slide.weightSwitchMs;
/** Rows [t ms, lead, trail]: fractions of the distance between the old and the new edges. */
export const SLIDE_ROWS = slide.rows as [number, number, number][];

/** The underline edges at one sampled row. The edge on the side of the movement leads. */
export function edgesAt(from: Edges, to: Edges, lead: number, trail: number) {
  const right = to.right >= from.right;
  const l = right ? trail : lead;
  const r = right ? lead : trail;
  return {
    left: from.left + (to.left - from.left) * l,
    right: from.right + (to.right - from.right) * r,
  };
}

/** Keyframes for the slide: left and width, linear between the sampled rows (A§1.2, §8). */
export function slideKeyframes(from: Edges, to: Edges): Keyframe[] {
  return SLIDE_ROWS.map(([t, lead, trail]) => {
    const e = edgesAt(from, to, lead, trail);
    return {
      offset: t / SLIDE_MS,
      left: `${e.left}px`,
      width: `${e.right - e.left}px`,
    };
  });
}

/** No active item before (A§7F): the line draws from the new item's left edge, 2 px → full width. */
export const DRAW_MS = 200;
export function drawKeyframes(to: Edges): Keyframe[] {
  return [
    { left: `${to.left}px`, width: "2px" },
    { left: `${to.left}px`, width: `${to.right - to.left}px` },
  ];
}
