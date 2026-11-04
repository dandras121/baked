"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  continueToPayment,
  saveDetailsAsTyped,
  type DetailsState,
} from "@/app/(site)/order/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { TextArea, TextField } from "@/components/ui/text-field";
import { CAKE_FOR_MAX, DETAILS_COPY, NAME_MAX, NOTE_MAX } from "@/lib/details";
import styles from "./checkout.module.css";

export type DetailsInitial = {
  name: string;
  email: string;
  phone: string;
  cakeFor: string;
  note: string;
};

/**
 * Step 3 — Your details (§5.3; desktop 639:3270, phone 832:…; consent box 1797:13110). How I reach you (name,
 * e-mail, mobile), who the cake is for, each cake's allergens and the allergy note with its consent box (only while
 * the note has text, D16), then the terms box (required), the yearly e-mail box (optional) and Continue to payment.
 * Answers are saved when a field is left, so a refresh keeps them; nothing is ever ticked for the customer.
 */
export function DetailsForm({
  initial,
  contains,
  kitchenHelper,
}: {
  initial: DetailsInitial;
  /** One line per cake: “The Lothian contains gluten (wheat), eggs and milk.” */
  contains: string[];
  kitchenHelper: string;
}) {
  const [state, action, pending] = useActionState<DetailsState, FormData>(
    continueToPayment,
    { errors: {} },
  );
  const [note, setNote] = useState(initial.note);
  const formRef = useRef<HTMLFormElement>(null);
  // A message goes as soon as its field is changed; a new Continue shows the current ones again.
  const [fixed, setFixed] = useState<{ for: DetailsState; names: string[] }>({
    for: state,
    names: [],
  });
  if (fixed.for !== state) setFixed({ for: state, names: [] });
  const e = Object.fromEntries(
    Object.entries(state.errors).filter(([k]) => !fixed.names.includes(k)),
  ) as DetailsState["errors"];

  // A failed Continue moves the focus to the first message (§10.8).
  useEffect(() => {
    const first = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    first?.focus();
  }, [state]);

  const saveAsTyped = () => {
    const f = formRef.current;
    if (f) void saveDetailsAsTyped(new FormData(f));
  };

  return (
    <form
      ref={formRef}
      id="step-form"
      action={action}
      // Without React's form reset, so ticked boxes stay ticked whatever the server answers (nothing is lost).
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => action(data));
      }}
      onChange={(ev) => {
        const name = (ev.target as unknown as HTMLInputElement).name;
        if (name && !fixed.names.includes(name))
          setFixed((f) => ({ ...f, names: [...f.names, name] }));
      }}
      onBlur={(ev) => {
        const t = ev.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") {
          if ((t as HTMLInputElement).type !== "checkbox") saveAsTyped();
        }
      }}
      className={styles.details}
      noValidate
    >
      <div className={styles.detailsColumns}>
        <fieldset className={styles.group}>
          <legend className={styles.sectionHeading}>How I reach you</legend>
          <div className={styles.fields}>
            <TextField
              label="Your name"
              labelStyle="plain"
              name="name"
              autoComplete="name"
              defaultValue={initial.name}
              max={NAME_MAX}
              counterMode="from80"
              error={e.name}
            />
            <TextField
              label="Email"
              labelStyle="plain"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              defaultValue={initial.email}
              error={e.email}
            />
            <TextField
              label="Phone"
              labelStyle="plain"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              defaultValue={initial.phone}
              error={e.phone}
            />
          </div>
        </fieldset>

        <div className={styles.group}>
          <div className={styles.fields}>
            <TextField
              label="Who is the cake for? (optional)"
              labelStyle="heading"
              name="cakeFor"
              defaultValue={initial.cakeFor}
              max={CAKE_FOR_MAX}
              counterMode="from80"
              error={e.cakeFor}
            />
            <div className={styles.allergyBlock}>
              <ul
                className={styles.containsList}
                aria-label="What is in your cakes"
              >
                {contains.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <TextArea
                label="Allergies or anything I should know"
                labelStyle="heading"
                name="note"
                rows={3}
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                max={NOTE_MAX}
                counterMode="from80"
                hint={kitchenHelper}
                error={e.note}
              />
              {note.trim() && (
                <Checkbox
                  name="consent"
                  value="1"
                  label={DETAILS_COPY.consent}
                  error={e.consent}
                  className={styles.consent}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.boxes}>
        <Checkbox
          name="terms"
          value="1"
          error={e.terms}
          label={
            <>
              I have read and agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener">
                terms and conditions
              </a>
              , and to the{" "}
              <a href="/cancellations" target="_blank" rel="noopener">
                cancellation terms
              </a>{" "}
              for a made-to-order cake.
            </>
          }
        />
        <Checkbox name="marketing" value="1" label={DETAILS_COPY.marketing} />
        <p className={styles.boxesNote}>{DETAILS_COPY.boxesNote}</p>
      </div>

      <Button
        type="submit"
        className={styles.detailsContinue}
        busy={pending}
        busyLabel="Saving your details"
      >
        Continue to payment
      </Button>
      {state.failed && (
        <p className={styles.holdNote} role="alert">
          {DETAILS_COPY.failed}
        </p>
      )}
    </form>
  );
}
