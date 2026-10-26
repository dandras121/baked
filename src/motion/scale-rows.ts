// Sampled scale tables (ANIMATIONS §7C, §7E) as Web Animations keyframes. Rows: [t ms, scale].
import data from "./keyframes.json";

export type Row = readonly [number, number];
export type Kind = "button" | "nav" | "row" | "field";
export type Part = "hoverIn" | "hoverOut" | "press" | "release";
export type Input = "mouse" | "touch";

const p = data.pressable;
export const CANCEL_MS = p.cancelMs;
export const CANCEL_EASING = p.easing;

/** The table for one part of the motion. `null` = no motion (a field stays at 1.00 after a desktop release). */
export function rowsFor(kind: Kind, part: Part, input: Input): Row[] | null {
  const rows = (r: number[][]) => r as unknown as Row[];
  if (kind === "nav") {
    return rows(
      p.navItem[
        part === "hoverIn" ? "hoverIn" : part === "hoverOut" ? "hoverOut" : part
      ],
    );
  }
  if (part === "hoverIn") return rows(p.hoverIn);
  if (part === "hoverOut") return rows(p.hoverOut);
  if (part === "press")
    return rows(input === "touch" ? p.phonePress : p.desktopPress);
  if (kind === "field" && input === "mouse") return null; // ANIM-05: stays 1.00 while focused
  return rows(input === "touch" ? p.phoneRelease : p.desktopRelease);
}

/** Every part starts from the current scale (§7E “Interruptions”): stretch the table so it starts at `from`. */
export function startFrom(rows: readonly Row[], from: number): Row[] {
  const first = rows[0][1];
  const last = rows[rows.length - 1][1];
  if (Math.abs(first - from) < 1e-4) return [...rows];
  if (Math.abs(last - first) < 1e-4)
    return rows.map(([t, v]) => [t, v + (from - first)] as const);
  const k = (last - from) / (last - first);
  return rows.map(([t, v]) => [t, last - (last - v) * k] as const);
}

/** Linear between sampled rows (§1.2): the easing is already in the samples. */
export function toKeyframes(rows: readonly Row[]): {
  keyframes: Keyframe[];
  duration: number;
} {
  const duration = rows[rows.length - 1][0];
  return {
    duration,
    keyframes: rows.map(([t, v]) => ({
      offset: duration ? t / duration : 1,
      transform: `scale(${v})`,
    })),
  };
}
