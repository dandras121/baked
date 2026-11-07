"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type {
  ChangeState,
  PrepareState,
} from "@/app/(site)/my-order/[token]/change/actions";
import { ChangePayment } from "./change-payment";
import { DayPicker } from "@/components/checkout/day-picker";
import checkout from "@/components/checkout/checkout.module.css";
import type { CalendarMonth } from "@/lib/capacity";
import { WINDOWS } from "@/lib/handover";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Radio } from "@/components/ui/choice";
import { TextField } from "@/components/ui/text-field";
import type { SizeChoice } from "@/db/change-repo";
import { OptionBlock } from "@/components/cake-page/option-block";
import {
  allergenLine,
  chosen,
  type Answers,
  type OptionView,
} from "@/lib/cake-config";
import type { AllergenSet } from "@/lib/cakes";
import { optionErrors, optionsLine } from "@/lib/order-line";
import { formatPrice } from "@/lib/money";
import {
  INSCRIPTION_MAX,
  inscriptionError,
  LINE_COPY,
  normaliseText,
} from "@/lib/order-line";
import styles from "./change.module.css";

export type ChangeLine = {
  id: number;
  name: string;
  sizeLine: string;
  options: string;
  /** null: the cake offers no message. */
  message: string | null;
  /** The cake's current sizes with the difference against what was paid (§6.4); empty when it has none left. */
  sizes: SizeChoice[];
  /** The cake's options now (§5.8), the line's answers, what was paid for them; null answers: not changeable here. */
  optionViews: OptionView[];
  answers: Answers | null;
  optionsPaidPence: number;
  cakeAllergens: AllergenSet | null;
};

const optionPrice = (l: ChangeLine, a: Answers) =>
  chosen(l.optionViews, a).reduce((n, { choice }) => n + choice.pricePence, 0);

/** “−£55”, “+£55”, “current”, “same price”. */
const diffLabel = (c: SizeChoice) =>
  c.current
    ? "current"
    : c.diffPence === 0
      ? "same price"
      : `${c.diffPence > 0 ? "+" : "−"}${formatPrice(Math.abs(c.diffPence))}`;

const shown = (m: string | null) => (m ? `“${m}”` : "No message");

/**
 * Change your order (§6.4; A3 1799:12959). Rows per cake (Size, Message, Options), then Date and window. One editor
 * open at a time; an edited row shows its new value, “Changed · was …” and Undo. 6.2a edits the message; size,
 * options and the date get their editors in 6.2b and 6.2c.
 */
export function ChangePage({
  action,
  prepare,
  finish,
  publishableKey,
  paying,
  paidChangeId,
  token,
  number,
  until,
  dateRow,
  lines,
  calendar,
}: {
  action: (state: ChangeState, form: FormData) => Promise<ChangeState>;
  prepare: (form: FormData) => Promise<PrepareState>;
  finish: (changeId: number) => Promise<"saved" | "processing" | "failed">;
  publishableKey: string;
  /** A payment for a change is going through on this order (another tab, §6.4). */
  paying: boolean;
  /** Back from the bank's check (Stripe's return_url): finish that payment. */
  paidChangeId: number | null;
  token: string;
  number: string;
  /** “Thursday 10 September” — the last day to change online (D-2). */
  until: string;
  dateRow: { label: string; value: string };
  lines: ChangeLine[];
  /** The step-2 calendar for moving the order (its own cakes do not count, §6.4) and its current date and window. */
  calendar: {
    months: CalendarMonth[];
    start: number;
    longDates: Record<string, string>;
    caption: string;
    date: string;
    window: string | null;
    delivery: boolean;
    /** “Sat 12 September”, “Sat 12 September · 9am – 12pm” for a date and window. */
    rowValue: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    outcome: null,
    errors: {},
  });
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [sizes, setSizes] = useState<Record<number, number>>({});
  /** Option answers per line: the edited ones (applied) and the open editor's draft. */
  const [optEdits, setOptEdits] = useState<Record<number, Answers>>({});
  const [optDraft, setOptDraft] = useState<Answers | null>(null);
  const [optErrors, setOptErrors] = useState<Record<number, string>>({});
  /** The new date and window (applied), and the open editor's draft. */
  const [move, setMove] = useState<{
    date: string;
    window: string | null;
  } | null>(null);
  const [moveDraft, setMoveDraft] = useState<{
    date: string;
    window: string | null;
  } | null>(null);
  const moved =
    move && (move.date !== calendar.date || move.window !== calendar.window)
      ? move
      : null;
  const rowText = (m: { date: string; window: string | null }) =>
    `${calendar.rowValue[m.date] ?? m.date}${calendar.delivery && m.window ? ` · ${WINDOWS.find((w) => w.key === m.window)?.times ?? ""}` : ""}`;
  /** The open editor: “m{line id}” for a message, “s{line id}” for a size. */
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [askPlain, setAskPlain] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => title.current?.focus(), []);
  const [refused, setRefused] = useState<ChangeState | null>(null);
  const [returning, setReturning] = useState<string | null>(
    paidChangeId ? "Finishing your payment…" : null,
  );
  useEffect(() => {
    if (!paidChangeId) return;
    void finish(paidChangeId).then((r) =>
      setReturning(
        r === "processing"
          ? "Your bank is still confirming the payment — reload this page in a minute."
          : r === "failed"
            ? "Nothing has changed and nothing was taken. Please try again."
            : null,
      ),
    );
    // Once, on arriving back from the bank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The window closed or the order changed elsewhere: the server draws the page again as it is now.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.outcome === "stale" || state.outcome === "closed") {
      setEdits({});
      setSizes({});
      setOptEdits({});
      setMove(null);
      setOpen(null);
      router.refresh();
    }
  }

  const changed = lines.filter(
    (l) => l.id in edits && normaliseText(edits[l.id]) !== (l.message ?? ""),
  );
  const resized = lines.filter((l) =>
    l.sizes.some((c) => c.id === sizes[l.id] && !c.current),
  );
  const chosenSize = (l: ChangeLine) =>
    l.sizes.find((c) => c.id === sizes[l.id] && !c.current) ?? null;
  const reoptioned = lines.filter(
    (l) =>
      l.id in optEdits &&
      optionsLine(l.optionViews, optEdits[l.id]) !== l.options,
  );
  const net =
    resized.reduce((n, l) => n + (chosenSize(l)?.diffPence ?? 0), 0) +
    reoptioned.reduce(
      (n, l) => n + optionPrice(l, optEdits[l.id]) - l.optionsPaidPence,
      0,
    );
  const diffText = (pence: number) =>
    pence === 0
      ? "same price"
      : `${pence > 0 ? "+" : "−"}${formatPrice(Math.abs(pence))}`;
  const payUp = net >= 30;
  const what =
    resized.length === 1 && !reoptioned.length
      ? `the size goes up from ${resized[0].sizeLine.replace(/^.* · /, "")} to ${chosenSize(resized[0])!.label.split(" · ")[0].toLowerCase()}`
      : resized.length
        ? "the new sizes and options"
        : "the new options";

  if (paying && !paidChangeId)
    return (
      <div className={styles.page}>
        <p className={styles.number}>Order {number}</p>
        <h1 ref={title} tabIndex={-1} className={styles.title}>
          What would you like to change?
        </h1>
        <Notice icon title="A payment is going through">
          <p>
            A payment for your change is going through — nothing else can change
            until it finishes.
          </p>
        </Notice>
        <div className={styles.buttons}>
          <ButtonLink href={`/my-order/${token}`} variant="outline">
            Back to your order
          </ButtonLink>
        </div>
      </div>
    );

  const openEditor = (l: ChangeLine) => {
    setOpen(`m${l.id}`);
    setDraft(edits[l.id] ?? l.message ?? "");
    setError(null);
    setAskPlain(false);
  };
  const done = (l: ChangeLine, plainOk = false) => {
    const e = inscriptionError(draft);
    if (e) return setError(e);
    if (!normaliseText(draft) && l.message && !plainOk)
      return setAskPlain(true);
    setEdits((x) => ({ ...x, [l.id]: normaliseText(draft) }));
    setOpen(null);
    setAskPlain(false);
  };
  const undo = (id: number) =>
    setEdits((x) => {
      const rest = { ...x };
      delete rest[id];
      return rest;
    });
  const undoSize = (id: number) =>
    setSizes((x) => {
      const rest = { ...x };
      delete rest[id];
      return rest;
    });

  return (
    <div className={styles.page}>
      <p className={styles.number}>Order {number}</p>
      <h1 ref={title} tabIndex={-1} className={styles.title}>
        What would you like to change?
      </h1>
      <Notice icon title={`Changes are free until ${until}`}>
        <p>After that your cake is already being made.</p>
      </Notice>
      {state.outcome === "stale" && (
        <div className={styles.notice}>
          <Notice tone="error" icon urgent title="Nothing was saved">
            <p>
              Your order changed while this page was open — nothing was saved.
              Here is how it looks now.
            </p>
          </Notice>
        </div>
      )}
      {returning && (
        <div className={styles.notice}>
          <Notice icon title="Your payment">
            <p>{returning}</p>
          </Notice>
        </div>
      )}
      <form ref={formRef} action={formAction}>
        {changed.map((l) => (
          <input
            key={l.id}
            type="hidden"
            name={`message-${l.id}`}
            value={edits[l.id]}
          />
        ))}
        {resized.map((l) => (
          <input
            key={l.id}
            type="hidden"
            name={`size-${l.id}`}
            value={sizes[l.id]}
          />
        ))}
        {moved && (
          <>
            <input type="hidden" name="date" value={moved.date} />
            {calendar.delivery && moved.window && (
              <input type="hidden" name="window" value={moved.window} />
            )}
          </>
        )}
        {reoptioned.map((l) => (
          <input
            key={l.id}
            type="hidden"
            name={`options-${l.id}`}
            value={JSON.stringify(optEdits[l.id])}
          />
        ))}
        <section className={styles.panel} aria-labelledby="can-change">
          <h2 id="can-change" className={styles.label}>
            What you can change
          </h2>
          {lines.map((l) => {
            const edited = changed.includes(l);
            return (
              <div key={l.id}>
                <h3 className={styles.cake}>{l.name}</h3>
                <div className={styles.row}>
                  <div className={styles.rowHead}>
                    <div>
                      <p className={styles.what}>Size</p>
                      <p className={styles.value}>
                        {chosenSize(l)?.label ?? l.sizeLine}
                      </p>
                    </div>
                    {open !== `s${l.id}` &&
                      l.sizes.some((c) => !c.current && !c.removed) &&
                      (chosenSize(l) ? (
                        <button
                          type="button"
                          className={`${styles.rowLink} hit-44`}
                          aria-label={`Undo the size change on ${l.name}`}
                          onClick={() => undoSize(l.id)}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.rowLink} hit-44`}
                          aria-label={`Change the size of ${l.name}`}
                          onClick={() => setOpen(`s${l.id}`)}
                        >
                          Change
                        </button>
                      ))}
                  </div>
                  {chosenSize(l) && open !== `s${l.id}` && (
                    <p className={styles.was}>Changed · was {l.sizeLine}</p>
                  )}
                  {open === `s${l.id}` && (
                    <fieldset className={styles.sizes}>
                      <legend className="visually-hidden">
                        Size of {l.name}
                      </legend>
                      {l.sizes.map((c) => (
                        <div key={c.id} className={styles.sizeRow}>
                          <Radio
                            name={`pick-${l.id}`}
                            label={c.label}
                            disabled={c.removed}
                            checked={
                              (sizes[l.id] ??
                                l.sizes.find((x) => x.current)?.id) === c.id
                            }
                            onChange={() =>
                              c.current
                                ? undoSize(l.id)
                                : setSizes((x) => ({ ...x, [l.id]: c.id }))
                            }
                          />
                          <span className={styles.diff}>{diffLabel(c)}</span>
                        </div>
                      ))}
                      <div className={styles.editorActions}>
                        <Button onClick={() => setOpen(null)}>Done</Button>
                      </div>
                    </fieldset>
                  )}
                </div>
                {l.message !== null && (
                  <div className={styles.row}>
                    <div className={styles.rowHead}>
                      <div>
                        <p className={styles.what}>Message</p>
                        <p className={styles.value}>
                          {shown(edited ? edits[l.id] : l.message)}
                        </p>
                      </div>
                      {open !== `m${l.id}` &&
                        (edited ? (
                          <button
                            type="button"
                            className={`${styles.rowLink} hit-44`}
                            aria-label={`Undo the message change on ${l.name}`}
                            onClick={() => undo(l.id)}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.rowLink} hit-44`}
                            aria-label={`Change the message on ${l.name}`}
                            onClick={() => openEditor(l)}
                          >
                            Change
                          </button>
                        ))}
                    </div>
                    {edited && open !== `m${l.id}` && (
                      <p className={styles.was}>
                        Changed · was {shown(l.message)}
                      </p>
                    )}
                    {(state.errors[l.id] ?? null) && (
                      <p className={styles.was}>{state.errors[l.id]}</p>
                    )}
                    {open === `m${l.id}` && (
                      <div className={styles.editor}>
                        <TextField
                          label={`Message on ${l.name}`}
                          name={`edit-${l.id}`}
                          max={INSCRIPTION_MAX}
                          counterMode="always"
                          autoComplete="off"
                          value={draft}
                          error={error}
                          onChange={(e) => {
                            setDraft(e.target.value);
                            if (error)
                              setError(inscriptionError(e.target.value));
                            setAskPlain(false);
                          }}
                        />
                        <Notice open={askPlain} title={LINE_COPY.plainTitle}>
                          <p>{LINE_COPY.plainText}</p>
                        </Notice>
                        <div className={styles.editorActions}>
                          {askPlain ? (
                            <>
                              <Button onClick={() => done(l, true)}>
                                Yes, keep it plain
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setAskPlain(false)}
                              >
                                Add a message
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button onClick={() => done(l)}>Done</Button>
                              <Button
                                variant="outline"
                                onClick={() => setOpen(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(l.optionViews.length > 0 || l.options) && (
                  <div className={styles.row}>
                    <div className={styles.rowHead}>
                      <div>
                        <p className={styles.what}>Options</p>
                        <p className={styles.value}>
                          {(reoptioned.includes(l)
                            ? optionsLine(l.optionViews, optEdits[l.id])
                            : l.options) || "None"}
                        </p>
                      </div>
                      {open !== `o${l.id}` &&
                        l.answers &&
                        l.optionViews.length > 0 &&
                        (reoptioned.includes(l) ? (
                          <button
                            type="button"
                            className={`${styles.rowLink} hit-44`}
                            aria-label={`Undo the options change on ${l.name}`}
                            onClick={() =>
                              setOptEdits((x) => {
                                const rest = { ...x };
                                delete rest[l.id];
                                return rest;
                              })
                            }
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.rowLink} hit-44`}
                            aria-label={`Change the options on ${l.name}`}
                            onClick={() => {
                              setOpen(`o${l.id}`);
                              setOptDraft(optEdits[l.id] ?? l.answers);
                              setOptErrors({});
                            }}
                          >
                            Change
                          </button>
                        ))}
                    </div>
                    {reoptioned.includes(l) && open !== `o${l.id}` && (
                      <p className={styles.was}>
                        Changed · was {l.options || "None"} ·{" "}
                        {diffText(
                          optionPrice(l, optEdits[l.id]) - l.optionsPaidPence,
                        )}
                      </p>
                    )}
                    {state.errors[l.id] && (
                      <p className={styles.was}>{state.errors[l.id]}</p>
                    )}
                    {open === `o${l.id}` && optDraft && (
                      <div className={styles.editor}>
                        {l.optionViews.map((o) => (
                          <OptionBlock
                            key={o.id}
                            option={o}
                            answers={optDraft}
                            error={optErrors[o.id]}
                            onChange={(a) => {
                              setOptDraft(a);
                              if (Object.keys(optErrors).length)
                                setOptErrors(optionErrors(l.optionViews, a));
                            }}
                          />
                        ))}
                        <p className={styles.was}>
                          {diffText(
                            optionPrice(l, optDraft) - l.optionsPaidPence,
                          )}
                          {l.cakeAllergens &&
                            ` · ${allergenLine(l.cakeAllergens, l.optionViews, optDraft, [])}`}
                        </p>
                        <div className={styles.editorActions}>
                          <Button
                            onClick={() => {
                              const errs = optionErrors(
                                l.optionViews,
                                optDraft,
                              );
                              setOptErrors(errs);
                              if (Object.keys(errs).length) return;
                              setOptEdits((x) => ({ ...x, [l.id]: optDraft }));
                              setOpen(null);
                            }}
                          >
                            Done
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setOpen(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className={styles.row}>
            <div className={styles.rowHead}>
              <div>
                <p className={styles.what}>{dateRow.label}</p>
                <p className={styles.value}>
                  {moved ? rowText(moved) : dateRow.value}
                </p>
              </div>
              {open !== "date" &&
                (moved ? (
                  <button
                    type="button"
                    className={`${styles.rowLink} hit-44`}
                    aria-label={`Undo the ${dateRow.label.toLowerCase()} change`}
                    onClick={() => setMove(null)}
                  >
                    Undo
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.rowLink} hit-44`}
                    aria-label={`Change the ${dateRow.label.toLowerCase()}`}
                    onClick={() => {
                      setOpen("date");
                      setMoveDraft(
                        move ?? {
                          date: calendar.date,
                          window: calendar.window,
                        },
                      );
                    }}
                  >
                    Change
                  </button>
                ))}
            </div>
            {moved && open !== "date" && (
              <p className={styles.was}>Changed · was {dateRow.value}</p>
            )}
            {open === "date" && moveDraft && (
              <div className={styles.editor}>
                <DayPicker
                  months={calendar.months}
                  start={calendar.start}
                  chosen={moveDraft.date}
                  onChoose={(date) => setMoveDraft((m) => ({ ...m!, date }))}
                  longDates={calendar.longDates}
                  caption={calendar.caption}
                />
                {calendar.delivery && (
                  <fieldset className={checkout.group}>
                    <legend className={checkout.sectionHeading}>
                      What time?
                    </legend>
                    <div className={checkout.windows}>
                      {WINDOWS.map((w) => (
                        <label
                          key={w.key}
                          className={checkout.window}
                          data-checked={moveDraft.window === w.key || undefined}
                          data-pressable
                        >
                          <input
                            type="radio"
                            name="window-pick"
                            value={w.key}
                            checked={moveDraft.window === w.key}
                            onChange={() =>
                              setMoveDraft((m) => ({ ...m!, window: w.key }))
                            }
                            className="visually-hidden"
                            aria-label={`${w.name} · ${w.times}`}
                          />
                          <span aria-hidden>
                            {w.name}
                            <span className={checkout.wideDay}>
                              {" "}
                              · {w.times}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className={styles.editorActions}>
                  <Button
                    onClick={() => {
                      setMove(moveDraft);
                      setOpen(null);
                    }}
                  >
                    Done
                  </Button>
                  <Button variant="outline" onClick={() => setOpen(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          {(refused ?? state).outcome === "taken" && (
            <div className={styles.notice}>
              <Notice
                tone="error"
                icon
                urgent
                title="That day has just been taken"
              >
                <p>
                  That day has just been taken — nothing has changed. Pick
                  another:
                </p>
                <div className={styles.editorActions}>
                  {((refused ?? state).chips ?? []).map((d) => (
                    <Button
                      key={d}
                      variant="outline"
                      onClick={() => {
                        setMove({
                          date: d,
                          window: move?.window ?? calendar.window,
                        });
                        setRefused(null);
                      }}
                    >
                      {calendar.rowValue[d] ?? d}
                    </Button>
                  ))}
                </div>
              </Notice>
            </div>
          )}
          <p className={styles.foot}>
            Delivery address, allergy notes and anything else: send me a message
            and I will update it by hand.
          </p>
        </section>
        {state.outcome === "failed" && (
          <div className={styles.notice}>
            <Notice tone="error" icon urgent title="Nothing was saved">
              <p>The connection dropped — please try again.</p>
            </Notice>
          </div>
        )}
        {net < 0 && (
          <p className={styles.money}>
            {net <= -30
              ? `${formatPrice(-net)} goes back to your card when you save — most banks show it within 5–10 working days.`
              : "The difference is under £0.30, so nothing is charged or refunded."}
          </p>
        )}
        {(refused ?? state).outcome === "locked" && (
          <div className={styles.notice}>
            <Notice icon title="A payment is going through">
              <p>
                A payment for your change is going through — nothing else can
                change until it finishes.
              </p>
            </Notice>
          </div>
        )}
        {payUp && open === null && (
          <ChangePayment
            amountPence={net}
            what={what}
            publishableKey={publishableKey}
            prepare={() => prepare(new FormData(formRef.current!))}
            finish={finish}
            returnUrl={(id) =>
              `${window.location.origin}/my-order/${token}/change?paid=${id}`
            }
            onRefused={(r) => {
              setRefused({
                outcome: r.outcome,
                errors: r.errors,
                chips: r.chips,
              });
              if (r.outcome === "stale" || r.outcome === "closed") {
                setEdits({});
                setSizes({});
                router.refresh();
              }
            }}
          />
        )}
        <div className={styles.buttons}>
          {!payUp && (
            <Button
              type="submit"
              disabled={
                (!changed.length &&
                  !resized.length &&
                  !reoptioned.length &&
                  !moved) ||
                open !== null
              }
              busy={pending}
              busyLabel="Saving"
            >
              Save changes
            </Button>
          )}
          <ButtonLink href={`/my-order/${token}`} variant="outline">
            Back to your order
          </ButtonLink>
        </div>
        <p className={styles.foot}>
          Changing the size changes the price — I take or refund the difference
          straight away. Everything else is free.
        </p>
      </form>
    </div>
  );
}
