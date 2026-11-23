"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  recordHandAction,
  removeHandPaymentAction,
} from "@/app/admin/(shell)/orders/[number]/actions";
import form from "@/components/admin/add-order/add-order.module.css";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import {
  handHint,
  removeQuestion,
  type HandForm,
} from "@/lib/admin/hand-money";
import { SaveDialog } from "./save-dialog";
import { SignInAgain } from "./sign-in-again";
import styles from "./order.module.css";

type Errors = Partial<Record<keyof HandForm, string>>;

const COPY = {
  payment: {
    button: "Record a payment",
    title: "Record a payment",
    how: "How it was paid",
    note: "It goes on the order as a payment line and Paid so far updates at once. No e-mail is sent. A wrong line can be removed from the order.",
  },
  refund: {
    button: "Record a refund given back",
    title: "Record a refund given back",
    how: "How you gave it back",
    note: "",
  },
} as const;

/**
 * Record a payment (1801:12967; while still to pay > 0) and Record a refund given back (1801:13035; while a by-hand
 * part is open): Amount · how · Date (today or earlier) · Record it · Not now. Owner only; no e-mail (§9.5).
 */
export function HandMoney({
  kind,
  orderId,
  eyebrow,
  maxPence,
  today,
  refundNote,
  className,
}: {
  kind: "payment" | "refund";
  orderId: number;
  eyebrow: string;
  /** Still to pay, or the by-hand part still to give back. */
  maxPence: number;
  today: string;
  /** Record a refund given back: what it completes (a cancellation or a lowered total). */
  refundNote?: string;
  className?: string;
}) {
  const router = useRouter();
  const copy = COPY[kind];
  const empty: HandForm = { amount: "", method: "", date: today };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<HandForm>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [line, setLine] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [busy, start] = useTransition();
  const set = <K extends keyof HandForm>(k: K, v: HandForm[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setLine(null);
  };
  const show = () => {
    setF(empty);
    setErrors({});
    setLine(null);
    setSignIn("no");
    setOpen(true);
  };
  const save = () =>
    start(async () => {
      const r = await recordHandAction(orderId, kind, f).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "saved") {
        setOpen(false);
        router.refresh();
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") {
        setErrors(r.errors);
        return setLine("Nothing was saved — check the fields marked above.");
      }
      if (r.kind === "closed") {
        router.refresh();
        return setLine(
          kind === "payment"
            ? "Nothing is left to pay on this order — nothing was saved."
            : "Nothing is left to give back on this order — nothing was saved.",
        );
      }
      setLine("Nothing was saved — please try again.");
    });
  const id = (k: string) => `hand-${kind}-${k}`;

  return (
    <>
      <Button variant="outline" className={className} onClick={show}>
        {copy.button}
      </Button>
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={eyebrow}
        title={copy.title}
        classNames={{ body: styles.linkBody }}
      >
        {signIn === "asking" ? (
          <SignInAgain onDone={() => setSignIn("back")} />
        ) : (
          <>
            <div className={form.field}>
              <label htmlFor={id("amount")} className={form.label}>
                Amount
              </label>
              <input
                id={id("amount")}
                className={`${form.input} ${styles.linkAmount}`}
                inputMode="decimal"
                placeholder="£"
                value={f.amount}
                aria-invalid={!!errors.amount || undefined}
                aria-describedby={`${id("hint")} ${id("amount-error")}`}
                onChange={(e) => set("amount", e.target.value)}
              />
              <p id={id("hint")} className={form.hint}>
                {handHint(kind, maxPence)}
              </p>
              <FieldError
                id={id("amount-error")}
                message={errors.amount ?? null}
              />
            </div>
            <fieldset
              className={form.pillSet}
              aria-describedby={errors.method ? id("method-error") : undefined}
            >
              <legend className={form.label}>{copy.how}</legend>
              <div className={form.pills}>
                {(
                  [
                    ["cash", "Cash"],
                    ["bank", "Bank transfer"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className={form.pill}>
                    <input
                      type="radio"
                      name={id("method")}
                      checked={f.method === v}
                      onChange={() => set("method", v)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <FieldError
                id={id("method-error")}
                message={errors.method ?? null}
              />
            </fieldset>
            <div className={form.field}>
              <label htmlFor={id("date")} className={form.label}>
                Date
              </label>
              <input
                id={id("date")}
                type="date"
                max={today}
                className={`${form.input} ${styles.handDate}`}
                value={f.date}
                aria-invalid={!!errors.date || undefined}
                aria-describedby={errors.date ? id("date-error") : undefined}
                onChange={(e) => set("date", e.target.value)}
              />
              <FieldError id={id("date-error")} message={errors.date ?? null} />
            </div>
            <p className={form.hint}>
              {kind === "payment" ? copy.note : refundNote}
            </p>
            {signIn === "back" && (
              <p className={styles.saveLine}>
                Signed in again — press Record it.
              </p>
            )}
            {line && (
              <p className={styles.conflict} role="alert">
                {line}
              </p>
            )}
            <div className={styles.dialogButtons}>
              <Button busy={busy} busyLabel="Saving" onClick={save}>
                {signIn === "back" ? "Save again" : "Record it"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
            </div>
          </>
        )}
      </Overlay>
    </>
  );
}

/** Remove on a by-hand payment line (§9.5): asks first; still to pay goes back up; HISTORY keeps it. */
export function RemoveHandLine({
  lineId,
  pence,
  method,
  on,
}: {
  lineId: number;
  pence: number;
  method: string;
  on: string;
}) {
  return (
    <span className={styles.linkActions}>
      <SaveDialog
        trigger={(open) => (
          <button type="button" className={styles.textButton} onClick={open}>
            Remove
          </button>
        )}
        title="Remove this payment?"
        description={`${removeQuestion(pence, method, on)} Still to pay goes back up. It stays listed in HISTORY.`}
        saveLabel="Remove it"
        busyLabel="Removing"
        keepLabel="Keep it"
        save={() => removeHandPaymentAction(lineId)}
      />
    </span>
  );
}
