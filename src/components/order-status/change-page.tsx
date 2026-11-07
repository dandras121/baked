"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeState } from "@/app/(site)/my-order/[token]/change/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Radio } from "@/components/ui/choice";
import { TextField } from "@/components/ui/text-field";
import type { SizeChoice } from "@/db/change-repo";
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
};

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
  token,
  number,
  until,
  dateRow,
  lines,
}: {
  action: (state: ChangeState, form: FormData) => Promise<ChangeState>;
  token: string;
  number: string;
  /** “Thursday 10 September” — the last day to change online (D-2). */
  until: string;
  dateRow: { label: string; value: string };
  lines: ChangeLine[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    outcome: null,
    errors: {},
  });
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [sizes, setSizes] = useState<Record<number, number>>({});
  /** The open editor: “m{line id}” for a message, “s{line id}” for a size. */
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [askPlain, setAskPlain] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);

  // The window closed or the order changed elsewhere: the server draws the page again as it is now.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.outcome === "stale" || state.outcome === "closed") {
      setEdits({});
      setSizes({});
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
  const net = resized.reduce((n, l) => n + (chosenSize(l)?.diffPence ?? 0), 0);

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
      <form action={formAction}>
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
                      // 6.2b: a cake with a size of the same price or smaller to change to.
                      l.sizes.some((c) => !c.current && c.diffPence <= 0) &&
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
                      {l.sizes
                        .filter((c) => c.current || c.diffPence <= 0)
                        .map((c) => (
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
                {l.options && (
                  <div className={styles.row}>
                    <p className={styles.what}>Options</p>
                    <p className={styles.value}>{l.options}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div className={styles.row}>
            <p className={styles.what}>{dateRow.label}</p>
            <p className={styles.value}>{dateRow.value}</p>
          </div>
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
        <div className={styles.buttons}>
          <Button
            type="submit"
            disabled={(!changed.length && !resized.length) || open !== null}
            busy={pending}
            busyLabel="Saving"
          >
            Save changes
          </Button>
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
