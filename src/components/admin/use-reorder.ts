"use client";

import { useRef } from "react";

/**
 * Drag ⠿ and the arrow keys for a short list (§5.8 options and choices): the row follows the pointer through the
 * list, and up / down on a focused handle moves it one place. No motion (the admin, Decided D10).
 */
export function useReorder<T>(
  list: T[],
  onChange: (next: T[]) => void,
  name: (item: T) => string,
) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
    return next;
  };
  const row = (i: number) => (el: HTMLElement | null) => {
    rows.current[i] = el;
  };
  const handle = (i: number, focusId: (i: number) => string) => ({
    "aria-label": `Move ${name(list[i])}`,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const to = i + (e.key === "ArrowUp" ? -1 : 1);
      if (move(i, to) !== list)
        requestAnimationFrame(() =>
          document.getElementById(focusId(to))?.focus(),
        );
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      let current = list;
      let at = i;
      const onMove = (ev: PointerEvent) => {
        let to = 0;
        rows.current.forEach((el, j) => {
          if (
            el &&
            ev.clientY >
              el.getBoundingClientRect().top +
                el.getBoundingClientRect().height / 2
          )
            to = j;
        });
        const first = rows.current[0]?.getBoundingClientRect().top ?? 0;
        if (ev.clientY < first) to = 0;
        if (to !== at && to < current.length) {
          const next = [...current];
          const [x] = next.splice(at, 1);
          next.splice(to, 0, x);
          current = next;
          at = to;
          onChange(next);
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
  });
  return { row, handle };
}
