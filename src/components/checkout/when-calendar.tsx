"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { holdDate, type WhenState } from "@/app/(site)/order/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Notice } from "@/components/ui/notice";
import type { CalendarMonth } from "@/lib/capacity";
import type { HandoverInput } from "@/lib/handover";
import { HOLD_COPY } from "@/lib/hold";
import styles from "./checkout.module.css";
import { DateChips } from "./date-chips";
import { DayPicker } from "./day-picker";
import { HandoverFields, type HandoverPlace } from "./handover-fields";

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
  const [chosen, setChosen] = useState<string | null>(initial);
  const [answers, setAnswers] = useState<HandoverInput>(handover);
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
      <DayPicker
        months={months}
        start={start}
        chosen={chosen}
        onChoose={setChosen}
        longDates={longDates}
        caption={caption}
      >
        <FieldError
          id="date-error"
          message={state.kind === "pick" && !chosen ? HOLD_COPY.pickDay : null}
        />
      </DayPicker>

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
