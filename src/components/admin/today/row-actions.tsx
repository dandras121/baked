"use client";

import { useState, useTransition } from "react";
import {
  checkDay,
  handOver,
  sendMissedEmail,
  undoHandOver,
} from "@/app/admin/(shell)/today/actions";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import styles from "./today.module.css";

type Copy = { label: string; title: string; text: string; note: string };

/** Mark handed over (on or after the date while confirmed); Handed over {time} · Undo until 23:59. */
export function HandOver({
  orderId,
  done,
  undoable,
  className,
}: {
  orderId: number;
  className?: string;
  /** “Handed over 11:52” when completed. */
  done: string | null;
  undoable: boolean;
}) {
  const [busy, start] = useTransition();
  if (done)
    return (
      <span className={`${styles.done} ${className ?? ""}`}>
        {done}
        {undoable && (
          <button
            type="button"
            className={styles.linkButton}
            disabled={busy}
            onClick={() => start(() => undoHandOver(orderId))}
          >
            Undo
          </button>
        )}
      </span>
    );
  return (
    <Button
      className={`${styles.handOver} ${className ?? ""}`}
      busy={busy}
      busyLabel="Saving"
      onClick={() => start(() => handOver(orderId))}
    >
      Mark handed over
    </Button>
  );
}

/** Checked: clears the check-the-day flag (both roles). */
export function Checked({ orderId }: { orderId: number }) {
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      className={styles.linkButton}
      disabled={busy}
      onClick={() => start(() => checkDay(orderId))}
    >
      Checked
    </button>
  );
}

/** Nobody was in → the confirm (Admin / 21; a sheet on the phone): Send the email · Not yet / Esc. */
export function NobodyWasIn({
  orderId,
  copy,
  button,
}: {
  orderId: number;
  copy: Copy;
  /** Order detail draws it as an outline button (936:8285); Today as a link. */
  button?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  return (
    <>
      {button ? (
        <Button
          variant="outline"
          className={button}
          onClick={() => setOpen(true)}
        >
          Nobody was in
        </Button>
      ) : (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setOpen(true)}
        >
          Nobody was in
        </button>
      )}
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title={copy.title}
        classNames={{
          description: styles.dialogWords,
          body: styles.dialogBody,
        }}
        description={
          <>
            <span className={styles.dialogLabel}>{copy.label}</span>
            <span className={styles.dialogText}>{copy.text}</span>
          </>
        }
      >
        <Button
          busy={busy}
          busyLabel="Sending"
          onClick={() =>
            start(async () => {
              await sendMissedEmail(orderId);
              setOpen(false);
            })
          }
        >
          Send the email
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Not yet
        </Button>
        <p className={styles.dialogNote}>{copy.note}</p>
      </Overlay>
    </>
  );
}
