"use client";

import { useRef, type KeyboardEvent } from "react";
import { dashState, sliderWindow } from "./slider-window";
import styles from "./slider-indicator.module.css";

type SliderIndicatorProps = {
  count: number;
  active: number;
  onSelect: (index: number) => void;
  /** “Slide 3 of 8”, “Testimonial 3 of 5”, “Photo 3 of 30” … (ANIM-10). */
  label: (index: number, count: number) => string;
  surface?: "light" | "dark";
  /** The hero keeps its left edge; everywhere else the row is centred (ANIM-10 Alignment). */
  align?: "centre" | "left";
};

/** Rendered around the window so a jump of up to five keeps the dashes' grow and fade (a longer jump just appears). */
const MARGIN = 5;

/**
 * Slider position indicator (ANIM-10; V2 · Slider indicator 1759:12772): at most 5 dashes, the active one longest and
 * darkest, its neighbours a little longer; every change is a 360 ms change of width, colour and opacity.
 * One tab stop: arrow keys go to the next or previous item.
 */
export function SliderIndicator({
  count,
  active,
  onSelect,
  label,
  surface = "light",
  align = "centre",
}: SliderIndicatorProps) {
  const row = useRef<HTMLDivElement>(null);
  if (count < 2) return null;
  const { start, size } = sliderWindow(count, active);
  const from = Math.max(0, start - MARGIN);
  const to = Math.min(count, start + size + MARGIN);

  const go = (index: number) => {
    const next = Math.min(Math.max(index, 0), count - 1);
    if (next === active) return;
    onSelect(next);
    requestAnimationFrame(() =>
      row.current
        ?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
        ?.focus(),
    );
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (step) {
      e.preventDefault();
      go(active + step);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(count - 1);
    }
  };

  return (
    <div
      ref={row}
      className={`${styles.row} ${styles[surface]} ${styles[align]}`}
      role="group"
      aria-label="Choose a slide"
      onKeyDown={onKeyDown}
    >
      {Array.from({ length: to - from }, (_, k) => {
        const index = from + k;
        const state = dashState(index, count, active);
        const hidden = state === "hidden";
        return (
          <button
            key={index}
            type="button"
            data-index={index}
            data-state={state}
            data-pressable
            className={`${styles.dash} hit-44`}
            aria-label={label(index, count)}
            aria-current={state === "active" ? "true" : undefined}
            tabIndex={state === "active" ? 0 : -1}
            inert={hidden}
            aria-hidden={hidden || undefined}
            onClick={() => go(index)}
          />
        );
      })}
    </div>
  );
}
