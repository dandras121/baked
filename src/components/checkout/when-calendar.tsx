"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { holdDate, type WhenState } from "@/app/(site)/order/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Notice } from "@/components/ui/notice";
import { STATE_WORDS, type CalendarMonth } from "@/lib/capacity";
import type { HandoverInput } from "@/lib/handover";
import { HOLD_COPY } from "@/lib/hold";
import styles from "./checkout.module.css";
import { DateChips } from "./date-chips";
import { HandoverFields, type HandoverPlace } from "./handover-fields";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Step 2's calendar (§5.2; 637:3207, phone 828:6169; day states 636:3143). One month at a time with ‹ › (back
 * disabled in the current month; in the last one forward is disabled and the bespoke route shows); a month with
 * no free day offers the next one that has. Days are a radio group: arrow keys move by day and week, unavailable
 * days stay focusable but cannot be chosen. Continue takes the hold on the server (B: the date went meanwhile).
 * Without JavaScript every month shows and the radios post with Continue.
 */
export function WhenCalendar({
  months,
  start,
  initial,
  longDates,
  minutes,
  caption,
  phone,
  handover,
  place,
}: {
  months: CalendarMonth[];
  start: number;
  initial: string | null;
  longDates: Record<string, string>;
  minutes: number;
  caption: string;
  phone: string | null;
  /** The handover answers saved in the draft (empty strings when none). */
  handover: HandoverInput;
  place: HandoverPlace;
}) {
  const [state, action, pending] = useActionState<WhenState, FormData>(
    holdDate,
    {
      kind: "idle",
      date: initial,
      chips: [],
    },
  );
  const [shown, setShown] = useState(start);
  const [chosen, setChosen] = useState<string | null>(initial);
  const [answers, setAnswers] = useState<HandoverInput>(handover);
  const grid = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Errors on Continue: the focus goes to the first group with one (§5.2).
  useEffect(() => {
    if (state.kind !== "pick") return;
    const f = formRef.current;
    const first = !state.date
      ? f?.querySelector<HTMLElement>('input[name="date"][tabindex="0"]')
      : state.errors?.postcode === "outside"
        ? f?.querySelector<HTMLElement>('input[name="postcode"]')
        : f?.querySelector<HTMLElement>(
            '[aria-invalid="true"], [data-invalid]',
          );
    first?.focus();
  }, [state]);
  const errors = state.kind === "pick" ? (state.errors ?? {}) : {};
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
      setChosen(date);
  };

  return (
    <form
      ref={formRef}
      id="step-form"
      action={action}
      // With JavaScript the answers post without React's form reset, which would untick the chosen radios while the
      // page still shows them chosen (every answer is kept, §5.2). Without JavaScript the action posts as usual.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(
          e.currentTarget,
          (e.nativeEvent as SubmitEvent).submitter,
        );
        startTransition(() => action(data));
      }}
      className={styles.when}
      noValidate
    >
      <input type="hidden" name="next" value="details" />
      <input type="hidden" name="withHandover" value="1" />
      <fieldset className={styles.calendar} aria-describedby="calendar-caption">
        <legend className={styles.sectionHeading}>Date</legend>
        <div className={styles.monthBar}>
          <p className={styles.monthName} aria-live="polite">
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
        <div ref={grid}>
          {months.map((m, i) => (
            <div
              key={m.key}
              className={styles.month}
              data-shown={i === shown || undefined}
            >
              <p className={styles.noJsMonth}>{m.label}</p>
              <div
                className={styles.days}
                role="radiogroup"
                aria-label={m.label}
              >
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
            For a date beyond {month.label}, tell me about it as a bespoke
            order.{" "}
            <ButtonLink href="/bespoke" variant="text">
              Start a bespoke enquiry →
            </ButtonLink>
          </p>
        ) : null}
        <FieldError
          id="date-error"
          message={state.kind === "pick" && !chosen ? HOLD_COPY.pickDay : null}
        />
      </fieldset>

      <div className={styles.whereColumn}>
        <HandoverFields
          values={answers}
          onChange={setAnswers}
          errors={errors}
          place={place}
        />

        {state.kind === "taken" && state.date && (
          <div className={styles.stateNotice}>
            <Notice
              tone="error"
              urgent
              title={HOLD_COPY.takenTitle(longDates[state.date] ?? state.date)}
            >
              {state.chips.length ? HOLD_COPY.takenText : HOLD_COPY.noDates}
            </Notice>
            <DateChips dates={state.chips} next="details" />
          </div>
        )}

        <Button
          type="submit"
          block
          className={styles.continue}
          busy={pending}
          busyLabel="Holding your date"
        >
          <span className={styles.wideDay}>Continue to your details</span>
          <span className={styles.narrowDay}>Your details</span>
        </Button>
        {state.kind === "connection" && (
          <p className={styles.holdNote} role="alert">
            {HOLD_COPY.connection(phone)}
          </p>
        )}
        {chosen && state.kind !== "connection" && (
          <p className={styles.holdNote}>
            {HOLD_COPY.before(longDates[chosen] ?? chosen, minutes)}
          </p>
        )}
      </div>
    </form>
  );
}
