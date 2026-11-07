"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeState } from "@/app/(site)/my-order/[token]/change/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
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
};

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
  const [open, setOpen] = useState<number | null>(null);
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
      setOpen(null);
      router.refresh();
    }
  }

  const changed = lines.filter(
    (l) => l.id in edits && normaliseText(edits[l.id]) !== (l.message ?? ""),
  );

  const openEditor = (l: ChangeLine) => {
    setOpen(l.id);
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
                  <p className={styles.what}>Size</p>
                  <p className={styles.value}>{l.sizeLine}</p>
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
                      {open !== l.id &&
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
                    {edited && open !== l.id && (
                      <p className={styles.was}>
                        Changed · was {shown(l.message)}
                      </p>
                    )}
                    {(state.errors[l.id] ?? null) && (
                      <p className={styles.was}>{state.errors[l.id]}</p>
                    )}
                    {open === l.id && (
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
        <div className={styles.buttons}>
          <Button
            type="submit"
            disabled={!changed.length || open !== null}
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
