// ANIM-10 window rule: N items, active index a (from 0): W = min(N, 5); s = clamp(a − 2, 0, N − W).
export const MAX_DASHES = 5;

export function sliderWindow(
  count: number,
  active: number,
): { start: number; size: number } {
  const size = Math.min(count, MAX_DASHES);
  const start = Math.min(Math.max(active - 2, 0), count - size);
  return { start, size };
}

export type DashState = "active" | "neighbour" | "rest" | "hidden";

export function dashState(
  index: number,
  count: number,
  active: number,
): DashState {
  const { start, size } = sliderWindow(count, active);
  if (index < start || index >= start + size) return "hidden";
  if (index === active) return "active";
  return Math.abs(index - active) === 1 ? "neighbour" : "rest";
}
