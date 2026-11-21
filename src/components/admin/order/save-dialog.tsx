"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Overlay } from "@/components/ui/overlay";
import { SignInAgain } from "./sign-in-again";
import styles from "./order.module.css";

type Outcome = { kind: string; line?: string };

/**
 * A confirm that saves (§9.1): the session-ended sign-in in place (§9.2), the two-people line with the page redrawn,
 * and “Nothing was saved — please try again.”; closes when saved.
 */
export function SaveDialog({
  trigger,
  title,
  description,
  children,
  saveLabel,
  busyLabel,
  keepLabel,
  save,
  refused,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  saveLabel: string;
  busyLabel: string;
  keepLabel: string;
  /** null = do not save (the form shows its own error). */
  save: () => Promise<Outcome> | null;
  /** Words for refusals of this action (e.g. not-now). */
  refused?: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [busy, start] = useTransition();
  const close = () => {
    setOpen(false);
    setLine(null);
    setSignIn("no");
  };
  const press = () => {
    const p = save();
    if (!p) return;
    start(async () => {
      const r: Outcome = await p.catch(() => ({ kind: "failed" }));
      if (r.kind === "saved" || r.kind === "cancelled") {
        close();
        router.refresh();
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "conflict") {
        setLine(r.line ?? null);
        router.refresh();
        return;
      }
      setLine(refused?.[r.kind] ?? "Nothing was saved — please try again.");
      router.refresh();
    });
  };
  return (
    <>
      {trigger(() => setOpen(true))}
      <Overlay
        open={open}
        onClose={close}
        title={title}
        description={<span className={styles.dialogText}>{description}</span>}
        classNames={{ body: styles.dialogBody }}
      >
        {signIn === "asking" ? (
          <SignInAgain onDone={() => setSignIn("back")} />
        ) : (
          <>
            {children}
            {signIn === "back" && (
              <p className={styles.saveLine}>
                Signed in again — press the button to save.
              </p>
            )}
            {line && (
              <p className={styles.conflict} role="alert">
                {line}
              </p>
            )}
            <div className={styles.dialogButtons}>
              <Button busy={busy} busyLabel={busyLabel} onClick={press}>
                {signIn === "back" ? "Save again" : saveLabel}
              </Button>
              <Button variant="outline" onClick={close}>
                {keepLabel}
              </Button>
            </div>
          </>
        )}
      </Overlay>
    </>
  );
}
