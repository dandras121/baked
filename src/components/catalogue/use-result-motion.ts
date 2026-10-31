"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import data from "@/motion/keyframes.json";
import { isMotionReduced } from "@/motion/reduced-motion";

const C = data.surfaceMotion.catalogue;
const EASE_OUT = data.surfaceMotion.easeOut;
const EASE_IN_OUT = data.surfaceMotion.easeInOut;

type Snapshot = Map<string, DOMRect>;

const shown = (grid: HTMLElement) =>
  [...grid.querySelectorAll<HTMLElement>("[data-key]")].filter(
    (el) => !el.hasAttribute("data-hidden"),
  );

/**
 * ANIM-16, every change of the result (a pill, the search): 0–120 ms leaving cards fade and shrink to 0.98;
 * 80–320 ms staying cards move to their new places (FLIP); 160–320 ms new cards fade in from 0.98. A newer
 * result cancels the running one and starts from where the cards are now. Reduced motion: at once.
 *
 * Call `capture()` just before the change; `version` changes with every result so the motion runs after it.
 */
export function useResultMotion(
  grid: RefObject<HTMLElement | null>,
  version: string,
) {
  const before = useRef<Snapshot | null>(null);
  const ghosts = useRef<HTMLElement[]>([]);

  const capture = () => {
    const el = grid.current;
    if (!el || isMotionReduced()) return;
    // Where everything is now — mid-motion included — then stop what is running.
    const snap: Snapshot = new Map();
    for (const cell of shown(el))
      snap.set(cell.dataset.key!, cell.getBoundingClientRect());
    for (const g of ghosts.current) g.remove();
    ghosts.current = [];
    for (const cell of el.querySelectorAll<HTMLElement>("[data-key]"))
      for (const a of cell.getAnimations()) a.cancel();
    before.current = snap;
  };

  useLayoutEffect(() => {
    const el = grid.current;
    const snap = before.current;
    before.current = null;
    if (!el || !snap) return;
    const box = el.getBoundingClientRect();
    const now = new Set<string>();
    for (const cell of shown(el)) {
      const key = cell.dataset.key!;
      now.add(key);
      const was = snap.get(key);
      if (was) {
        const r = cell.getBoundingClientRect();
        const dx = was.left - r.left;
        const dy = was.top - r.top;
        if (dx || dy)
          cell.animate(
            [
              { transform: `translate(${dx}px, ${dy}px)` },
              { transform: "none" },
            ],
            {
              delay: C.move[0],
              duration: C.move[1] - C.move[0],
              easing: EASE_IN_OUT,
              fill: "backwards",
            },
          );
      } else
        cell.animate(
          [
            { opacity: 0, transform: `scale(${C.scale})` },
            { opacity: 1, transform: "none" },
          ],
          {
            delay: C.enter[0],
            duration: C.enter[1] - C.enter[0],
            easing: EASE_OUT,
            fill: "backwards",
          },
        );
    }
    // The leaving cards: a copy where each was, fading out over the new grid.
    for (const [key, rect] of snap) {
      if (now.has(key)) continue;
      const source = el.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(key)}"]`,
      );
      if (!source) continue;
      const ghost = source.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-hidden");
      ghost.removeAttribute("data-key");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      ghost.style.cssText = `position:absolute;left:${rect.left - box.left}px;top:${rect.top - box.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;pointer-events:none;display:block`;
      el.appendChild(ghost);
      ghosts.current.push(ghost);
      ghost
        .animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: `scale(${C.scale})` },
          ],
          {
            duration: C.leave[1] - C.leave[0],
            easing: EASE_OUT,
            fill: "forwards",
          },
        )
        .finished.then(
          () => ghost.remove(),
          () => ghost.remove(),
        );
    }
  }, [grid, version]);

  return capture;
}
