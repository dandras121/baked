"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import type { EnquiryState } from "@/app/(site)/bespoke/actions";
import { Button } from "@/components/ui/button";
import {
  PictureTiles,
  type PicturesState,
} from "@/components/uploads/picture-tiles";
import { Checkbox } from "@/components/ui/choice";
import { FieldError } from "@/components/ui/field-error";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { TextArea, TextField } from "@/components/ui/text-field";
import {
  AREAS,
  budgets,
  dateRange,
  dateWarning,
  DIETARY,
  EMPTY_ENQUIRY,
  FINISHES,
  FLAVOURS,
  hardErrors,
  LIMITS,
  longDate,
  missing as missingOf,
  MISSING_LINES,
  missingHeading,
  needsConsent,
  OCCASIONS,
  SERVINGS,
  toggleDietary,
  type Enquiry,
  type EnquiryErrors,
  type MissingKey,
} from "@/lib/bespoke";
import { CONTACT } from "@/lib/contact";
import { PICTURE_COPY } from "@/lib/uploads/rules";
import styles from "./bespoke.module.css";

/** One question's heading: “01 · The occasion”, an optional violet hint beside it. */
function Heading({
  id,
  n,
  children,
  hint,
}: {
  id: string;
  n: string;
  children: string;
  hint?: string;
}) {
  return (
    <h2 id={id} className={styles.heading}>
      <span>
        {n} · {children}
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </h2>
  );
}

/** A single-select pill group: tapping the selected pill clears it (§7.1). */
function Single({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className={styles.pills}>
      {options.map((o) => (
        <Pill
          key={o}
          selected={value === o}
          onClick={() => onChange(value === o ? "" : o)}
        >
          {o}
        </Pill>
      ))}
    </div>
  );
}

const FIELD_OF: Record<MissingKey, string> = {
  occasion: "occasion",
  date: "date",
  servings: "servings",
  area: "area",
  budget: "budget",
  finish: "finish",
  flavour: "finish",
  email: "email",
};

/**
 * The bespoke enquiry form (§7.1; desktop 660:4068, tablet 1559:11694, phone 847:8028). Mostly tap-and-go pills; the
 * date warnings are calm and never block; with answers missing a summary sits beside the button (K 975:9128).
 * Up to three pictures upload as soon as they are picked; the “Inspired by” card (M 1633:12328) sits above them when
 * the form came from the gallery. Send waits for unfinished uploads.
 */
export function BespokeForm({
  minimumPence,
  leadWeeks,
  deliveryArea,
  today,
  inspired,
  direct,
  action,
}: {
  minimumPence: number;
  leadWeeks: number;
  deliveryArea: string;
  today: string;
  inspired: { id: number; caption: string; src: string | null } | null;
  direct: boolean;
  action: (s: EnquiryState, f: FormData) => Promise<EnquiryState>;
}) {
  const [v, setV] = useState<Enquiry>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [summary, setSummary] = useState<MissingKey[] | null>(null);
  const [keepInspired, setKeepInspired] = useState(!!inspired);
  const [state, formAction, pending] = useActionState(action, {
    errors: {},
    missing: [],
    notice: null,
  });
  const formKey = useRef("");
  const keyOf = () => (formKey.current ||= crypto.randomUUID());
  const [pictures, setPictures] = useState<PicturesState>({
    ids: [],
    pending: 0,
  });
  /** Send was pressed while pictures were still uploading: send (anyway or not) once they are done. */
  const [waiting, setWaiting] = useState<{ anyway: boolean } | null>(null);
  const picturesNow = useRef(pictures);
  const honeypot = useRef<HTMLInputElement>(null);
  const range = dateRange(today);
  const warning = dateWarning(v, today, leadWeeks);
  const set = <K extends keyof Enquiry>(k: K, value: Enquiry[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    setSummary(null);
  };

  // The server's answer: the same errors or summary as the page would have shown (set while rendering, once per answer).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (Object.keys(state.errors).length) setErrors(state.errors);
    if (state.missing.length) setSummary(state.missing);
  }

  const focusField = (name: string) => {
    const el = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, textarea, button")?.focus({
      preventScroll: true,
    });
  };

  function send(anyway: boolean) {
    const e = hardErrors(v, today);
    setErrors(e);
    const first = (
      [
        "dietaryConsent",
        "name",
        "phone",
        "email",
        "contact",
        "date",
        "venue",
        "anything",
      ] as const
    ).find((k) => e[k]);
    if (first) {
      focusField(
        first === "contact"
          ? "email"
          : first === "dietaryConsent"
            ? "consent"
            : first,
      );
      return;
    }
    const gaps = missingOf(v);
    if (gaps.length && !anyway) {
      setSummary(gaps);
      return;
    }
    if (picturesNow.current.pending) {
      setWaiting({ anyway });
      return;
    }
    setWaiting(null);
    const data = new FormData();
    data.set("enquiry", JSON.stringify(v));
    data.set("formKey", keyOf());
    data.set("pictures", JSON.stringify(picturesNow.current.ids));
    data.set(CONTACT.honeypot, honeypot.current?.value ?? "");
    if (keepInspired && inspired) data.set("inspired", String(inspired.id));
    if (anyway) data.set("sendAnyway", "1");
    startTransition(() => formAction(data));
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send(false);
      }}
    >
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="bespoke-ref">Leave this empty</label>
        <input
          ref={honeypot}
          id="bespoke-ref"
          name={CONTACT.honeypot}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <section className={styles.block} data-field="occasion">
        <Heading id="q-occasion" n="01">
          The occasion
        </Heading>
        <Single
          labelledBy="q-occasion"
          options={OCCASIONS}
          value={v.occasion}
          onChange={(x) => set("occasion", x)}
        />
      </section>

      <section className={styles.block} data-field="date">
        <Heading id="q-when" n="02">
          When
        </Heading>
        <div className={styles.date}>
          <TextField
            id="bespoke-date"
            type="date"
            label="Date of the event"
            labelStyle="plain"
            min={range.min}
            inputMax={range.max}
            value={v.date}
            error={errors.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        {v.date && !errors.date && (
          <p className={styles.long}>{longDate(v.date, today)}</p>
        )}
        {warning && (
          <p className={styles.warning} role="status">
            {warning.line}
          </p>
        )}
        {warning?.wedding && (
          <div className={styles.notice}>
            <Notice title="You can still send it">
              <p>
                Send your enquiry anyway — I will tell you within 24 hours
                whether I can fit your wedding in.
              </p>
            </Notice>
          </div>
        )}
        <div className={styles.pills}>
          <Pill
            selected={v.flexible}
            onClick={() => set("flexible", !v.flexible)}
          >
            My date is still flexible
          </Pill>
        </div>
      </section>

      <section className={styles.block} data-field="servings">
        <Heading id="q-servings" n="03">
          How many servings
        </Heading>
        <Single
          labelledBy="q-servings"
          options={SERVINGS}
          value={v.servings}
          onChange={(x) => set("servings", x)}
        />
      </section>

      <section className={styles.block} data-field="area">
        <Heading id="q-area" n="04">
          Where it needs to go
        </Heading>
        <Single
          labelledBy="q-area"
          options={AREAS}
          value={v.area}
          onChange={(x) => set("area", x)}
        />
        <p className={styles.note}>
          Free delivery covers {deliveryArea}. Beyond that, it is collection or
          a courier we arrange together.
        </p>
        <div data-field="venue">
          <TextField
            id="bespoke-venue"
            label="Venue name or postcode"
            labelStyle="plain"
            max={LIMITS.venueMax}
            counterMode="from80"
            value={v.venue}
            error={errors.venue}
            onChange={(e) => set("venue", e.target.value)}
          />
        </div>
      </section>

      <section className={styles.block} data-field="budget">
        <Heading
          id="q-budget"
          n="05"
          hint="a range is fine — it saves us both a round of emails"
        >
          Budget
        </Heading>
        <Single
          labelledBy="q-budget"
          options={budgets(minimumPence)}
          value={v.budget}
          onChange={(x) => set("budget", x)}
        />
      </section>

      <section className={styles.block} data-field="finish">
        <Heading id="q-finish" n="06">
          Finish and flavour
        </Heading>
        <h3 id="q-finish-kind" className="visually-hidden">
          Finish
        </h3>
        <Single
          labelledBy="q-finish-kind"
          options={FINISHES}
          value={v.finish}
          onChange={(x) => set("finish", x)}
        />
        <h3 id="q-flavour" className="visually-hidden">
          Flavour
        </h3>
        <div className={styles.second}>
          <Single
            labelledBy="q-flavour"
            options={FLAVOURS}
            value={v.flavour}
            onChange={(x) => set("flavour", x)}
          />
        </div>
      </section>

      <section className={styles.block} data-field="dietary">
        <Heading id="q-dietary" n="07" hint="select all that apply">
          Dietary needs
        </Heading>
        <div role="group" aria-labelledby="q-dietary" className={styles.pills}>
          {DIETARY.map((o) => (
            <Pill
              key={o}
              selected={v.dietary.includes(o)}
              onClick={() => set("dietary", toggleDietary(v.dietary, o))}
            >
              {o}
            </Pill>
          ))}
        </div>
        {needsConsent(v.dietary) && (
          <div className={styles.consent} data-field="consent">
            <Checkbox
              id="bespoke-consent"
              label="I agree to Linda using this to make my cake safely."
              checked={v.dietaryConsent}
              onChange={(e) => set("dietaryConsent", e.target.checked)}
              error={errors.dietaryConsent}
            />
          </div>
        )}
      </section>

      <section className={styles.block} data-field="anything">
        <Heading
          id="q-anything"
          n="08"
          hint="in your own words — as much or as little as you like"
        >
          Anything else
        </Heading>
        <TextArea
          id="bespoke-anything"
          label="Anything else"
          labelStyle="hidden"
          max={LIMITS.anythingMax}
          counterMode="from80"
          rows={4}
          value={v.anything}
          error={errors.anything}
          onChange={(e) => set("anything", e.target.value)}
        />
      </section>

      <section className={styles.block}>
        <h2 className={styles.heading}>{PICTURE_COPY.heading}</h2>
        {inspired && keepInspired && (
          <>
            <div className={styles.inspired}>
              {inspired.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inspired.src} alt="" className={styles.thumb} />
              ) : (
                <span className={styles.thumb} aria-hidden />
              )}
              <div className={styles.inspiredText}>
                <span className={styles.inspiredLabel}>Inspired by</span>
                <span>{inspired.caption}</span>
              </div>
              <button
                type="button"
                className={styles.remove}
                data-pressable
                onClick={() => setKeepInspired(false)}
              >
                Remove ×
              </button>
            </div>
            <p className={styles.note}>
              You came from my gallery — I will see this picture with your
              enquiry.
            </p>
          </>
        )}
        <PictureTiles
          purpose="enquiry"
          formKey={keyOf}
          direct={direct}
          onChange={(next) => {
            picturesNow.current = next;
            setPictures(next);
            // The last upload finished: carry on with the send that was asked for.
            if (waiting && !next.pending) send(waiting.anyway);
          }}
        />
        <p className={styles.note}>{PICTURE_COPY.note}</p>
      </section>

      <section className={styles.block}>
        <Heading id="q-you" n="09">
          You
        </Heading>
        <div className={styles.fields}>
          <div data-field="name">
            <TextField
              id="bespoke-name"
              label="Full name"
              labelStyle="plain"
              autoComplete="name"
              value={v.name}
              error={errors.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div data-field="phone">
            <TextField
              id="bespoke-phone"
              type="tel"
              label="Phone"
              labelStyle="plain"
              autoComplete="tel"
              inputMode="tel"
              value={v.phone}
              error={errors.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div data-field="email">
            <TextField
              id="bespoke-email"
              type="email"
              label="Email"
              labelStyle="plain"
              autoComplete="email"
              inputMode="email"
              value={v.email}
              error={errors.email ?? errors.contact}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
        <div className={styles.pills}>
          <Pill selected={v.callMe} onClick={() => set("callMe", !v.callMe)}>
            I would rather talk it through on the phone
          </Pill>
        </div>
      </section>

      <div className={styles.send}>
        <Button
          type="submit"
          busy={pending || !!waiting}
          busyLabel={
            waiting && pictures.pending
              ? PICTURE_COPY.waiting(pictures.pending)
              : "Sending"
          }
        >
          Send my enquiry
        </Button>
        {summary && summary.length > 0 && (
          <div className={styles.summary}>
            <Notice tone="error" title={missingHeading(summary.length)} urgent>
              {summary.map((k) => (
                <p key={k}>· {MISSING_LINES[k]}</p>
              ))}
              {warning && <p>Also: {warning.line}</p>}
            </Notice>
            <div className={styles.summaryActions}>
              <Button
                type="button"
                size="compact"
                onClick={() => focusField(FIELD_OF[summary[0]])}
              >
                Take me to the first one
              </Button>
              {v.phone.trim() ? (
                <button
                  type="button"
                  className={styles.anyway}
                  data-pressable
                  onClick={() => send(true)}
                >
                  or send it anyway and I will call you →
                </button>
              ) : (
                <p className={styles.small}>
                  I need a phone number to call you
                </p>
              )}
            </div>
          </div>
        )}
        <FieldError id="bespoke-send-error" message={state.notice} />
      </div>
      <p className={styles.small}>
        Sending this is an enquiry, not an order. I check the diary and come
        back within 24 hours by e-mail, or by phone if you prefer — nothing is
        booked until you say yes. No payment and no commitment at this stage.
      </p>
    </form>
  );
}
