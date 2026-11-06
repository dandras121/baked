"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { isMotionReduced } from "@/motion/reduced-motion";

/**
 * ANIM-18, the step change (ANIMATIONS §7J): the old content fades out 0–120 ms (linear); the new content rises 8 px
 * and fades in 120–360 ms (checkout.module.css .main; mirrored — from above — when going back); the finished step
 * gets its tick with the new content; the connector fills 80–320 ms. Focus goes to the step heading.
 * Module state survives client-side navigation only, so after a full page load nothing but the rise runs.
 */
let lastStep: number | null = null;
let lastBody: number | null = null;
/** Where the step body was on screen when the customer last pressed something (the fade-out copy goes there). */
let pressedRect: { rect: DOMRect; at: number } | null = null;

const CONNECTOR = {
  duration: 240,
  delay: 80,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
  fill: "backwards" as const,
};

/** In the stepper: the tick and the connector between the step left and the step reached; focus to the heading. */
export function StepMotion({ current }: { current: number }) {
  const mark = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const from = lastStep;
    lastStep = current;
    if (from === null || from === current) return;
    const nav = mark.current?.closest("nav");
    nav?.parentElement
      ?.querySelector<HTMLElement>("[data-step-heading]")
      ?.focus({ preventScroll: true });
    if (!nav || isMotionReduced()) return;
    const steps = [...nav.querySelectorAll<HTMLElement>("li[data-state]")];
    const dots = [...nav.querySelectorAll<HTMLElement>("[data-dot]")];
    const runs: Animation[] = [];
    if (current > from) {
      for (let n = from; n < current; n++) {
        // Step n is now done: its connector fills left to right, its tick appears with the new content.
        runs.push(
          steps[n - 1].animate(
            [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
            { ...CONNECTOR, pseudoElement: "::after" },
          ),
        );
        const disc = steps[n - 1].querySelector("[data-disc]");
        if (disc)
          runs.push(
            disc.animate(
              [
                { transform: "scale(0.6)", opacity: 0 },
                { transform: "none", opacity: 1 },
              ],
              {
                duration: 240,
                delay: 120,
                easing: "cubic-bezier(0.33, 1, 0.68, 1)",
                fill: "backwards",
              },
            ),
          );
        if (dots[n])
          runs.push(
            dots[n].animate(
              [
                { clipPath: "inset(0 100% 0 0)" },
                { clipPath: "inset(0 0 0 0)" },
              ],
              { ...CONNECTOR, pseudoElement: "::before" },
            ),
          );
      }
    } else {
      // Back, mirrored: the connectors after the step reached empty again, right to left.
      const ink = getComputedStyle(document.documentElement)
        .getPropertyValue("--colour-ink")
        .trim();
      for (let n = current; n < from; n++) {
        runs.push(
          steps[n - 1].animate([{ backgroundColor: ink }, {}], {
            ...CONNECTOR,
            pseudoElement: "::after",
          }),
        );
        if (dots[n])
          runs.push(
            dots[n].animate([{ backgroundColor: ink }, {}], {
              ...CONNECTOR,
              pseudoElement: "::before",
            }),
          );
      }
    }
    return () => runs.forEach((r) => r.cancel());
  }, [current]);
  return <span ref={mark} hidden />;
}

/** The step's content: a copy of it fades out over the new one when the step changes; back rises from above. */
export function StepBody({
  step,
  className,
  children,
}: {
  step: number;
  className: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const from = lastBody;
    lastBody = step;
    if (from !== null && from > step) el.dataset.dir = "back";
    const remember = () => {
      const r = el.getBoundingClientRect();
      if (r.height) pressedRect = { rect: r, at: Date.now() };
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("keydown", remember, true);
    return () => {
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("keydown", remember, true);
      const seen = pressedRect;
      pressedRect = null;
      if (!seen || Date.now() - seen.at > 15_000 || isMotionReduced()) return;
      const copy = el.cloneNode(true) as HTMLElement;
      copy.removeAttribute("data-step-body");
      copy.setAttribute("aria-hidden", "true");
      copy.inert = true;
      Object.assign(copy.style, {
        position: "fixed",
        left: `${seen.rect.left}px`,
        top: `${seen.rect.top}px`,
        width: `${seen.rect.width}px`,
        height: `${seen.rect.height}px`,
        margin: "0",
        animation: "none",
        pointerEvents: "none",
        zIndex: "1",
      });
      document.body.appendChild(copy);
      copy
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 120,
          easing: "linear",
          fill: "forwards",
        })
        .finished.then(
          () => copy.remove(),
          () => copy.remove(),
        );
    };
  }, [step]);
  return (
    <div ref={body} className={className} data-step-body>
      {children}
    </div>
  );
}
