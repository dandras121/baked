"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { STATE_WORDS, type CalendarMonth } from "@/lib/capacity";
import { HOLD_COPY } from "@/lib/hold";
import { isMotionReduced } from "@/motion/reduced-motion";
import styles from "./checkout.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The step-2 month grid (§5.2; 637:3207, phone 828:6169; day states 636:3143), shared by step 2 and Change your
 * order (§6.4). One month at a time with ‹ › and the ANIM-21 slide; days are a radio group (arrow keys move by day and
 * week; unavailable days stay focusable but cannot be chosen). Without JavaScript every month shows.
 */
export function DayPicker({
  months,
  start,
  chosen,
  onChoose,
  longDates,
  caption,
  legend = "Date",
  children,
}: {
  months: CalendarMonth[];
  start: number;
  chosen: string | null;
  onChoose: (date: string) => void;
  longDates: Record<string, string>;
  caption: string;
  legend?: string;
  /** Under the grid (step 2: the “pick a day” error). */
  children?: ReactNode;
}) {
  const [shown, setShown] = useState(start);
  const grid = useRef<HTMLDivElement>(null);
  const monthName = useRef<HTMLParagraphElement>(null);
  // ANIM-21: the old month goes 24 px the way of the move and out (0–160 ms), the new one comes from 24 px on the
  // other side (80–320 ms); the month name moves with its grid. Reduced motion: it simply swaps.
  const before = useRef(shown);
  useLayoutEffect(() => {
    const from = before.current;
    before.current = shown;
    const g = grid.current;
    if (from === shown || !g || isMotionReduced()) return;
    const dir = shown > from ? 1 : -1;
    const out = g.children[from] as HTMLElement | undefined;
    const into = g.children[shown] as HTMLElement | undefined;
    const enter = (el: Element | null | undefined) =>
      el?.animate(
        [
          { transform: `translateX(${24 * dir}px)`, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: 240,
          delay: 80,
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
          fill: "backwards",
        },
      );
    const runs = [enter(into), enter(monthName.current)];
    if (out) {
      out.dataset.leaving = "";
      const a = out.animate(
        [
          { transform: "none", opacity: 1 },
          { transform: `translateX(${-24 * dir}px)`, opacity: 0 },
        ],
        {
          duration: 160,
          easing: "cubic-bezier(0.32, 0, 0.67, 0)",
          fill: "forwards",
        },
      );
      a.onfinish = () => {
        delete out.dataset.leaving;
        a.cancel();
      };
      runs.push(a);
    }
    return () => {
      runs.forEach((r) => r?.cancel());
      if (out) delete out.dataset.leaving;
    };
  }, [shown]);
  const month = months[shown];
  const last = shown === months.length - 1;
  const nextOpen = months.findIndex((m, i) => i > shown && m.open);
  const anyOpen = months.some((m) => m.open);

  const allDays = months.flatMap((m) => m.days);
  const focusDay = (date: string) => {
    const i = months.findIndex((m) => date.startsWith(m.key));
    if (i < 0) return;
    setShown(i);
    requestAnimationFrame(() =>
      grid.current
        ?.querySelector<HTMLInputElement>(`input[value="${date}"]`)
        ?.focus(),
    );
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>, date: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      e.key
    ];
    if (!step) {
      if (e.key === "Enter") {
        e.preventDefault();
        choose(date);
      }
      return;
    }
    e.preventDefault();
    const i = allDays.findIndex((d) => d.date === date);
    const to = allDays[i + step];
    if (to) focusDay(to.date);
  };
  const choose = (date: string) => {
    const d = allDays.find((x) => x.date === date);
    if (d && (d.state === "available" || d.state === "selected"))
      onChoose(date);
  };

  return (
    <fieldset className={styles.calendar} aria-describedby="calendar-caption">
      <legend className={styles.sectionHeading}>{legend}</legend>

      <div className={styles.monthBar}>
        <p ref={monthName} className={styles.monthName} aria-live="polite">
          {month.label}
        </p>
        <div className={styles.monthButtons}>
          <button
            type="button"
            className={styles.monthButton}
            aria-label="Previous month"
            disabled={shown === 0}
            data-pressable
            onClick={() => setShown((s) => s - 1)}
          >
            <svg viewBox="0 0 8 12" aria-hidden>
              <path d="M7 1 2 6l5 5" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.monthButton}
            aria-label="Next month"
            disabled={last}
            data-pressable
            onClick={() => setShown((s) => s + 1)}
          >
            <svg viewBox="0 0 8 12" aria-hidden>
              <path d="M1 1l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.weekdays} aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w}>
            <span className={styles.wideDay}>{w}</span>
            <span className={styles.narrowDay}>{w[0]}</span>
          </span>
        ))}
      </div>
      <div ref={grid} className={styles.monthStage}>
        {months.map((m, i) => (
          <div
            key={m.key}
            className={styles.month}
            data-shown={i === shown || undefined}
          >
            <p className={styles.noJsMonth}>{m.label}</p>
            <div className={styles.days} role="radiogroup" aria-label={m.label}>
              {Array.from({ length: m.lead }, (_, k) => (
                <span key={`e${k}`} aria-hidden />
              ))}
              {m.days.map((d) => {
                const can = d.state === "available" || d.state === "selected";
                const picked = chosen === d.date;
                return (
                  <label
                    key={d.date}
                    className={styles.day}
                    data-state={
                      picked
                        ? "selected"
                        : d.state === "selected"
                          ? "available"
                          : d.state
                    }
                    data-pressable={can ? "" : undefined}
                  >
                    <input
                      type="radio"
                      name="date"
                      value={d.date}
                      checked={picked}
                      aria-disabled={can ? undefined : true}
                      aria-label={`${longDates[d.date]}, ${picked ? "selected" : STATE_WORDS[d.state === "selected" ? "available" : d.state]}`}
                      tabIndex={
                        picked ||
                        (!chosen &&
                          d.state === "available" &&
                          d === m.days.find((x) => x.state === "available"))
                          ? 0
                          : -1
                      }
                      className="visually-hidden"
                      onChange={() => choose(d.date)}
                      onClick={(e) => {
                        if (!can) e.preventDefault();
                      }}
                      onKeyDown={(e) => onKey(e, d.date)}
                    />
                    <span aria-hidden>{d.n}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p id="calendar-caption" className={styles.caption}>
        {caption}
      </p>
      {!anyOpen ? (
        <Notice title={HOLD_COPY.noDates}>
          <ButtonLink href="/bespoke" variant="text">
            Start a bespoke enquiry →
          </ButtonLink>
        </Notice>
      ) : !month.open && nextOpen > 0 ? (
        <Notice title={`${month.label.split(" ")[0]} is fully booked`}>
          <button
            type="button"
            className={styles.inlineAction}
            data-pressable
            onClick={() => setShown(nextOpen)}
          >
            Show me {months[nextOpen].label.split(" ")[0]} →
          </button>
        </Notice>
      ) : last ? (
        <p className={styles.beyond}>
          For a date beyond {month.label}, tell me about it as a bespoke order.{" "}
          <ButtonLink href="/bespoke" variant="text">
            Start a bespoke enquiry →
          </ButtonLink>
        </p>
      ) : null}
      {children}
    </fieldset>
  );
}
