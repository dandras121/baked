"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
// The pure entry: Stripe.js loads only when a card field is shown, not on every page that imports this (§10.11).
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";
import { useState } from "react";
import type { PrepareState } from "@/app/(site)/my-order/[token]/change/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatPrice } from "@/lib/money";
import { isAuthenticationFailure } from "@/lib/pay-copy";
import styles from "./change.module.css";

let stripePromise: Promise<Stripe | null> | null = null;
const stripeFor = (key: string) => (stripePromise ??= loadStripe(key));

const token = (name: string) =>
  typeof window === "undefined"
    ? undefined
    : getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || undefined;

/** The §6.4 notices when a size-up payment does not go through: what did not happen first, edits kept. */
export const CHANGE_PAY_COPY = {
  off: "Payments are not switched on yet on this site, so nothing can be charged here.",
  declinedTitle: "Your bank declined the payment",
  notConfirmedTitle: "Not confirmed",
  nothing:
    "Nothing has changed and nothing was taken. Try another card, or message me.",
  failed: "Nothing has changed and nothing was taken. Please try again.",
  processing:
    "Your bank is still confirming the payment — this page moves on by itself once it has.",
};

type Props = {
  amountPence: number;
  /** “the size goes up from serves 24 to serves 30” */
  what: string;
  publishableKey: string;
  /** Checks the edits on the server, locks the order and makes the PaymentIntent. */
  prepare: () => Promise<PrepareState>;
  /** After Stripe answered: applies the paid change (and goes to the order page) or drops it. */
  finish: (changeId: number) => Promise<"saved" | "processing" | "failed">;
  returnUrl: (changeId: number) => string;
  onRefused: (state: Extract<PrepareState, { kind: "error" }>) => void;
  /** The panel's label and the button (the redelivery fee, §6.8, uses its own). */
  label?: string;
  button?: string;
};

/**
 * Pay the difference (§6.4; A3 1799:13020): Stripe's card field for the amount, then Pay £… and save. The PaymentIntent
 * is made only when the button is pressed, after the server has checked the edits again; the change is saved only once
 * the payment succeeded. Card data goes to Stripe only (CLAUDE.md rule 4).
 */
export function ChangePayment(props: Props) {
  if (!props.publishableKey)
    return (
      <div className={styles.payPanel}>
        <h2 className={styles.label}>{props.label ?? "Pay the difference"}</h2>
        <p className={styles.value}>
          {formatPrice(props.amountPence)} today — {props.what}.
        </p>
        <div className={styles.notice}>
          <Notice title={CHANGE_PAY_COPY.off} />
        </div>
        <div className={styles.buttons}>
          <Button disabled>
            {props.button ?? `Pay ${formatPrice(props.amountPence)} and save`}
          </Button>
        </div>
      </div>
    );
  return (
    <Elements
      stripe={stripeFor(props.publishableKey)}
      options={{
        mode: "payment",
        amount: props.amountPence,
        currency: "gbp",
        allowedPaymentMethodTypes: ["card"],
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: token("--colour-ink"),
            colorText: token("--colour-ink"),
            colorDanger: token("--colour-error"),
            fontFamily: "Quicksand, system-ui, sans-serif",
            borderRadius: "10px",
          },
        },
      }}
    >
      <PayForm {...props} />
    </Elements>
  );
}

function PayForm({
  amountPence,
  what,
  prepare,
  finish,
  returnUrl,
  onRefused,
  label = "Pay the difference",
  button,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<null | {
    title: string;
    text: string;
    tone: "calm" | "error";
  }>(null);

  async function waitFor(changeId: number) {
    for (let i = 0; i < 30; i++) {
      const r = await finish(changeId);
      if (r !== "processing") return r;
      setNotice({
        tone: "calm",
        title: "Still processing",
        text: CHANGE_PAY_COPY.processing,
      });
      await new Promise((ok) => setTimeout(ok, 2000));
    }
    return "processing" as const;
  }

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setNotice(null);
    try {
      const submitted = await elements.submit();
      if (submitted.error) return;
      const p = await prepare();
      if (p.kind === "error") return onRefused(p);
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: p.clientSecret,
        redirect: "if_required",
        confirmParams: { return_url: returnUrl(p.changeId) },
      });
      if (!error && paymentIntent) {
        const r = await waitFor(p.changeId);
        if (r === "failed")
          setNotice({
            tone: "error",
            title: "Nothing was taken",
            text: CHANGE_PAY_COPY.failed,
          });
        return;
      }
      await finish(p.changeId); // drops the change and opens the order again
      setNotice(
        error && isAuthenticationFailure(error.code)
          ? {
              tone: "calm",
              title: CHANGE_PAY_COPY.notConfirmedTitle,
              text: CHANGE_PAY_COPY.nothing,
            }
          : error?.type === "card_error"
            ? {
                tone: "error",
                title: CHANGE_PAY_COPY.declinedTitle,
                text: CHANGE_PAY_COPY.nothing,
              }
            : {
                tone: "error",
                title: "Nothing was taken",
                text: error?.message ?? CHANGE_PAY_COPY.failed,
              },
      );
    } catch {
      setNotice({
        tone: "error",
        title: "Nothing was taken",
        text: CHANGE_PAY_COPY.failed,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.payPanel}>
      <h2 className={styles.label}>{label}</h2>
      <p className={styles.value}>
        {formatPrice(amountPence)} today — {what}.
      </p>
      <div className={styles.cardField}>
        <PaymentElement
          options={{
            // Cards only (§5.4): no Apple Pay, Google Pay or Link here.
            wallets: { applePay: "never", googlePay: "never", link: "never" },
            // As at checkout: the country starts as the United Kingdom, so the postcode takes letters (not a US ZIP).
            defaultValues: { billingDetails: { address: { country: "GB" } } },
          }}
        />
      </div>
      {notice && (
        <div className={styles.notice}>
          <Notice tone={notice.tone} icon urgent title={notice.title}>
            <p>{notice.text}</p>
          </Notice>
        </div>
      )}
      <div className={styles.buttons}>
        <Button onClick={pay} busy={busy} busyLabel="Taking payment">
          {button ?? `Pay ${formatPrice(amountPence)} and save`}
        </Button>
      </div>
    </div>
  );
}
