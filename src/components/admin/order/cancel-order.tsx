"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction } from "@/app/admin/(shell)/orders/[number]/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import {
  amountError,
  cancelButton,
  readPounds,
  splitLine,
  splitRefund,
  termsLine,
} from "@/lib/admin/cancel";
import type { RefundTier } from "@/lib/deadlines";
import { formatAdminMoney } from "@/lib/money";
import { SignInAgain } from "./sign-in-again";
import styles from "./order.module.css";

/**
 * Cancel the order (§9.5, Owner; the confirm is not drawn): “Cancel {BBL-…}?”, the refund the terms give today,
 * editable from £0 to what was paid, split card first / the rest by hand; Cancel and refund £x · Keep the order.
 */
export function CancelOrder({
  orderId,
  version,
  number,
  first,
  quote,
  className,
}: {
  orderId: number;
  version: number;
  number: string;
  first: string;
  quote: {
    tier: RefundTier;
    proposedPence: number;
    paidPence: number;
    cardPence: number;
  };
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(
    formatAdminMoney(quote.proposedPence, "breakdown").slice(1),
  );
  const [shown, setShown] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [busy, start] = useTransition();
  const pence = readPounds(raw);
  const error = amountError(pence, quote.paidPence);
  const split = splitRefund(pence ?? 0, quote.cardPence);

  const save = () => {
    setShown(true);
    if (error || pence === null) return;
    start(async () => {
      const r = await cancelOrderAction(orderId, version, pence).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "cancelled") {
        setOpen(false);
        router.refresh();
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "conflict") {
        setLine(r.line);
        router.refresh();
        return;
      }
      if (r.kind === "already") {
        setLine("This order is already cancelled — nothing was changed.");
        router.refresh();
        return;
      }
      if (r.kind === "locked")
        return setLine(
          "A payment is going through on this order — nothing was cancelled. Try again in a few minutes.",
        );
      if (r.kind === "amount")
        return setLine(
          `That is more than the ${formatAdminMoney(r.paidPence, "breakdown")} paid — nothing was cancelled.`,
        );
      setLine("Nothing was saved — please try again.");
    });
  };

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        Cancel the order
      </Button>
      <Overlay
        open={open}
        onClose={() => {
          setOpen(false);
          setLine(null);
          setSignIn("no");
        }}
        title={`Cancel ${number}?`}
        description={
          <span className={styles.dialogText}>
            {termsLine(quote.tier, quote.proposedPence)} Paid so far:{" "}
            {formatAdminMoney(quote.paidPence, "breakdown")}.
          </span>
        }
        classNames={{ body: styles.dialogBody }}
      >
        {signIn === "asking" ? (
          <SignInAgain onDone={() => setSignIn("back")} />
        ) : (
          <>
            <label className={styles.amountLabel} htmlFor="cancel-amount">
              Refund
            </label>
            <div className={styles.amountRow}>
              <span aria-hidden>£</span>
              <input
                id="cancel-amount"
                className={styles.input}
                inputMode="decimal"
                value={raw}
                aria-invalid={(shown && !!error) || undefined}
                aria-describedby="cancel-split cancel-amount-error"
                onChange={(e) => setRaw(e.target.value)}
              />
            </div>
            <FieldError
              id="cancel-amount-error"
              message={shown ? error : null}
            />
            <p id="cancel-split" className={styles.split}>
              {error ? "" : splitLine(split)}
            </p>
            <p className={styles.note}>
              Cannot be undone. The date is released, open payment links are
              withdrawn and {first} gets the cancellation e-mail.
            </p>
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
              <Button busy={busy} busyLabel="Cancelling" onClick={save}>
                {signIn === "back" ? "Save again" : cancelButton(pence ?? 0)}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Keep the order
              </Button>
            </div>
          </>
        )}
      </Overlay>
    </>
  );
}
