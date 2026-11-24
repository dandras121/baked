"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendPayLinkAction } from "@/app/admin/(shell)/orders/[number]/actions";
import form from "@/components/admin/add-order/add-order.module.css";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Overlay } from "@/components/ui/overlay";
import {
  checkLinkAmount,
  LINK_PURPOSES,
  linkSums,
  prefill,
  type LinkPurpose,
} from "@/lib/admin/pay-link";
import { SignInAgain } from "./sign-in-again";
import styles from "./order.module.css";

/**
 * Send a payment link (§9.8; 1607:10918, phone: bottom sheet): what it is for, the amount with total · paid so far ·
 * still to pay, Send the link (greyed until valid) · Not now. Owner only; shown while still to pay > 0.
 */
export function SendPayLink({
  orderId,
  number,
  name,
  money,
  className,
  openAtStart = false,
  redelivery = null,
}: {
  orderId: number;
  number: string;
  name: string;
  money: { totalPence: number; paidPence: number; stillToPayPence: number };
  className?: string;
  /** Add an order's Save and send a payment link lands here with the dialog open (§9.6). */
  openAtStart?: boolean;
  /** From Record their choice (§9.8): the Redelivery kind, a fixed fee, not limited by still to pay. */
  redelivery?: { feePence: number } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openAtStart);
  type Kind = LinkPurpose | "redelivery";
  const startKind: Kind = redelivery ? "redelivery" : "rest";
  const fixed = (k: Kind) =>
    k === "redelivery" && redelivery
      ? (redelivery.feePence / 100).toFixed(2)
      : prefill(k as LinkPurpose, money.stillToPayPence);
  const [purpose, setPurpose] = useState<Kind>(startKind);
  const [amount, setAmount] = useState(fixed(startKind));
  const [touched, setTouched] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [signIn, setSignIn] = useState<"no" | "asking" | "back">("no");
  const [busy, start] = useTransition();
  const check =
    purpose === "redelivery"
      ? { pence: redelivery?.feePence ?? 0, error: null }
      : checkLinkAmount(amount, money.stillToPayPence);
  const kinds: { value: Kind; label: string }[] = [
    ...(money.stillToPayPence > 0 ? LINK_PURPOSES : []),
    ...(redelivery
      ? [{ value: "redelivery" as const, label: "Redelivery" }]
      : []),
  ];
  const first = name.trim().split(/\s+/)[0] || "The customer";

  const show = () => {
    setPurpose(startKind);
    setAmount(fixed(startKind));
    setTouched(false);
    setLine(null);
    setSignIn("no");
    setOpen(true);
  };

  const send = () =>
    start(async () => {
      setLine(null);
      const r = await sendPayLinkAction(orderId, purpose, amount).catch(
        () => ({ kind: "failed" }) as const,
      );
      if (r.kind === "sent") {
        setSent(r.line);
        setOpen(false);
        router.refresh();
        return;
      }
      if (r.kind === "signed-out") return setSignIn("asking");
      if (r.kind === "invalid") return setLine(r.error);
      if (r.kind === "closed") {
        router.refresh();
        return setLine(
          "Nothing is left to pay on this order — nothing was sent.",
        );
      }
      setLine("Nothing was sent — please try again.");
    });

  return (
    <>
      {money.stillToPayPence > 0 && (
        <Button variant="outline" className={className} onClick={show}>
          Send a payment link
        </Button>
      )}
      {sent && (
        <p className={styles.saveLine} role="status">
          {sent}
        </p>
      )}
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={`${number} · ${name}`}
        title="Send a payment link"
        classNames={{ body: styles.linkBody }}
      >
        {signIn === "asking" ? (
          <SignInAgain onDone={() => setSignIn("back")} />
        ) : (
          <>
            <fieldset className={form.pillSet}>
              <legend className={form.label}>What it is for</legend>
              <div className={form.pills}>
                {kinds.map((p) => (
                  <label key={p.value} className={form.pill}>
                    <input
                      type="radio"
                      name="link-purpose"
                      checked={purpose === p.value}
                      onChange={() => {
                        setPurpose(p.value);
                        setAmount(fixed(p.value));
                        setTouched(false);
                        setLine(null);
                      }}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className={form.field}>
              <label htmlFor="link-amount" className={form.label}>
                Amount
              </label>
              <input
                id="link-amount"
                className={`${form.input} ${styles.linkAmount}`}
                inputMode="decimal"
                placeholder="£"
                readOnly={purpose === "redelivery"}
                value={amount}
                aria-invalid={(touched && !!check.error) || undefined}
                aria-describedby="link-sums link-amount-error"
                onChange={(e) => {
                  setAmount(e.target.value);
                  setTouched(true);
                  setLine(null);
                }}
              />
              <p id="link-sums" className={form.hint}>
                {purpose === "redelivery"
                  ? "The redelivery fee — it does not count towards the cake."
                  : linkSums(money)}
              </p>
              <FieldError
                id="link-amount-error"
                message={touched && amount.trim() ? check.error : null}
              />
            </div>
            <p className={form.hint}>
              {purpose === "redelivery"
                ? `${first} gets e-mail 15 “Your redelivery” with a Stripe link for the fee. Once it is paid, the redelivery shows as paid on the order.`
                : `${first} gets e-mail 15 “Pay for your cake” with a Stripe link for this amount. Once it is paid, “Paid so far” updates by itself and the Money screen shows the rest.`}
            </p>
            {signIn === "back" && (
              <p className={styles.saveLine}>
                Signed in again — press Send the link.
              </p>
            )}
            {line && (
              <p className={styles.conflict} role="alert">
                {line}
              </p>
            )}
            <div className={styles.dialogButtons}>
              <Button
                busy={busy}
                busyLabel="Sending"
                disabled={!!check.error}
                onClick={send}
              >
                Send the link
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
