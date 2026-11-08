"use client";

import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
// The pure entry: Stripe.js loads only when the payment block is shown (§10.11).
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe, StripeError } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  paymentDidNotGoThrough,
  prepareToPay,
} from "@/app/(site)/order/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatPrice } from "@/lib/money";
import {
  isAuthenticationFailure,
  PAY_COPY as OUTCOME_COPY,
  walletClause,
} from "@/lib/pay-copy";
import styles from "./checkout.module.css";

const PAY_COPY = {
  off: "Payments are not switched on yet on this site, so nothing can be charged here.",
  changed: (total: string) =>
    `The total is now ${total} — please read your order again and press Pay.`,
  locked:
    "This order is being paid in another tab — changes are paused until that payment finishes.",
  failed:
    "Nothing has been taken. Please check the card details, or try another card.",
  loading:
    "Card payments are not loading. Nothing has been taken. Try again in a minute.",
};

/** A design token's value (tokens.css), read in the browser. */
const token = (name: string) =>
  typeof window === "undefined"
    ? undefined
    : getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || undefined;

let stripePromise: Promise<Stripe | null> | null = null;
const stripeFor = (key: string) => (stripePromise ??= loadStripe(key));

/**
 * The payment block (§5.4, 983:9092): Stripe's Express Checkout Element (Apple Pay / Google Pay, only where the device
 * offers them) above “or pay by card” and a card-only Payment Element, then Pay £…. Card data goes to Stripe only,
 * never to this server (CLAUDE.md rule 4). Pressing Pay first runs prepare on the server (§5.5); a decline shows
 * “Your bank declined the payment” above the block, an unfinished bank check “Not confirmed” with Try again, and
 * Pay stays off while the hold has run out or another tab is paying.
 */
export function PaymentBlock({
  clientSecret,
  publishableKey,
  totalPence,
  billingName,
  context,
}: {
  clientSecret: string | null;
  publishableKey: string;
  totalPence: number;
  billingName: string;
  context: PayContext;
}) {
  if (!clientSecret || !publishableKey)
    return (
      <div className={styles.payBlock}>
        <Notice title={PAY_COPY.off} />
        <Button block disabled className={styles.payButton}>
          Pay {formatPrice(totalPence)}
        </Button>
      </div>
    );
  return (
    <Elements
      stripe={stripeFor(publishableKey)}
      options={{
        clientSecret,
        // The site is in British English, so Stripe's labels are too (not the browser's language).
        locale: "en-GB",
        appearance: {
          theme: "stripe",
          // Stripe's fields cannot read CSS variables: the design tokens are passed in as values.
          variables: {
            colorPrimary: token("--colour-ink"),
            colorText: token("--colour-ink"),
            colorDanger: token("--colour-error"),
            fontFamily: "Quicksand, system-ui, sans-serif",
            borderRadius: "10px",
          },
        },
        fonts: [
          {
            family: "Quicksand",
            src: `url(${typeof window === "undefined" ? "" : window.location.origin}/fonts/quicksand-latin-wght-normal.woff2)`,
            weight: "300 700",
          },
        ],
      }}
    >
      <PayForm
        totalPence={totalPence}
        billingName={billingName}
        clientSecret={clientSecret}
        context={context}
      />
    </Elements>
  );
}

export type PayContext = {
  /** The hold's end (ISO), or null when it has run out. */
  holdExpiresAt: string | null;
  dateLabel: string;
  phone: string | null;
  /** This order is being paid in another tab (§5.5). */
  pausedHere: boolean;
  /** Reopened while the bank check waits: Try again finishes it with the same PaymentIntent (§5.5 G). */
  bankCheckSecret: string | null;
};

type Outcome =
  | null
  | { kind: "declined" }
  | { kind: "not-confirmed" }
  | { kind: "message"; text: string };

/** The hold's time left, ticking (the copy names the minutes, §5.5). */
function useHoldLeft(expiresAt: string | null): number {
  const end = expiresAt ? new Date(expiresAt).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!end) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [end]);
  return end ? end - now : 0;
}

function PayForm({
  totalPence,
  billingName,
  clientSecret,
  context,
}: {
  totalPence: number;
  billingName: string;
  clientSecret: string;
  context: PayContext;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(
    context.bankCheckSecret ? { kind: "not-confirmed" } : null,
  );
  const [wallets, setWallets] = useState<{
    applePay?: boolean;
    googlePay?: boolean;
  } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Pay keeps the hold for at least 15 more minutes (§5.5 prepare): the notices count from that.
  const [keptUntil, setKeptUntil] = useState<string | null>(null);
  const left = useHoldLeft(keptUntil ?? context.holdExpiresAt);
  const heldOut = !(keptUntil ?? context.holdExpiresAt) || left <= 0;
  const stopped = heldOut || context.pausedHere;
  const returnUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/order/confirmed`,
    [],
  );

  /** prepare on the server first (§5.5); anything but ok stops here, nothing charged. */
  async function prepare(): Promise<boolean> {
    const p = await prepareToPay(totalPence);
    if (p.kind === "ok") {
      setKeptUntil(p.holdExpiresAt);
      return true;
    }
    if (p.kind === "changed")
      setOutcome({
        kind: "message",
        text: PAY_COPY.changed(formatPrice(p.amountPence)),
      });
    if (p.kind === "locked")
      setOutcome({ kind: "message", text: PAY_COPY.locked });
    router.refresh();
    return false;
  }

  /** What Stripe answered: through → the confirmation; not → the right notice, the order open again. */
  async function after(
    error: StripeError | undefined,
    status: string | undefined,
  ): Promise<boolean> {
    if (!error && status && ["succeeded", "processing"].includes(status)) {
      router.push("/order/confirmed");
      return true;
    }
    await paymentDidNotGoThrough();
    // The hold line above counts from the hold Pay kept (§5.5): fetch it again.
    router.refresh();
    if (error && isAuthenticationFailure(error.code))
      setOutcome({ kind: "not-confirmed" });
    else if (error?.type === "card_error") setOutcome({ kind: "declined" });
    else
      setOutcome({ kind: "message", text: error?.message ?? PAY_COPY.failed });
    return false;
  }

  async function payNow(): Promise<boolean> {
    if (!stripe || !elements) return false;
    setOutcome(null);
    if (!(await prepare())) return false;
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: { billing_details: { name: billingName } },
      },
    });
    return after(error, paymentIntent?.status);
  }

  /**
   * Try again after the bank check (§5.5 G, Refresh / reopen step 4): a bank check still waiting is finished on the
   * same PaymentIntent with `handleNextAction` (the draft is still locked for it, the card fields may be empty);
   * otherwise it is a new payment with the card shown, through prepare as usual.
   */
  async function tryAgain() {
    if (!stripe || !elements) return;
    setOutcome(null);
    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
    if (paymentIntent?.status === "requires_action") {
      const r = await stripe.handleNextAction({ clientSecret });
      await after(r.error, r.paymentIntent?.status);
    } else if (complete) await payNow();
    else {
      await paymentDidNotGoThrough();
      setOutcome({ kind: "message", text: PAY_COPY.failed });
    }
  }

  const wallet = walletClause(wallets ?? {});
  return (
    <div className={styles.payBlock}>
      {outcome?.kind === "declined" && (
        <Notice tone="error" title={OUTCOME_COPY.declinedTitle} urgent>
          <p className={styles.payNoticeLine}>
            {OUTCOME_COPY.declinedText(context.dateLabel, left, wallet)}
          </p>
          {context.phone && (
            <a href={`tel:${context.phone.replace(/\s+/g, "")}`}>
              {OUTCOME_COPY.callMe(context.phone)}
            </a>
          )}
        </Notice>
      )}
      {outcome?.kind === "not-confirmed" && (
        <Notice title={OUTCOME_COPY.notConfirmedTitle} urgent>
          <p className={styles.payNoticeLine}>
            {OUTCOME_COPY.notConfirmedText(context.dateLabel, left)}
          </p>
          <Button
            variant="outline"
            className={styles.tryAgain}
            disabled={stopped}
            busy={busy}
            busyLabel="Taking payment"
            onClick={async () => {
              setBusy(true);
              await tryAgain();
              setBusy(false);
            }}
          >
            {OUTCOME_COPY.tryAgain}
          </Button>
        </Notice>
      )}
      {!stopped && (
        <ExpressCheckoutElement
          // Apple Pay and Google Pay only (§5.4): no Link, PayPal, Amazon Pay or Klarna.
          options={{
            buttonHeight: 48,
            paymentMethods: {
              link: "never",
              paypal: "never",
              amazonPay: "never",
              klarna: "never",
            },
          }}
          onReady={({ availablePaymentMethods }) =>
            setWallets(availablePaymentMethods ?? null)
          }
          // Stripe needs the answer within about a second: no server call here (§5.5).
          onClick={({ resolve }) => resolve()}
          onConfirm={async (event) => {
            setBusy(true);
            const ok = await payNow();
            if (!ok) event.paymentFailed();
            setBusy(false);
          }}
        />
      )}
      {!stopped && wallets && (
        <p className={styles.payDivider}>or pay by card</p>
      )}
      <PaymentElement
        options={{
          wallets: { applePay: "never", googlePay: "never", link: "never" },
          fields: { billingDetails: { name: "never" } },
          // A UK bakery: the country starts as the United Kingdom (with its postcode field); the customer can change it.
          defaultValues: { billingDetails: { address: { country: "GB" } } },
          readOnly: busy,
        }}
        onChange={(e) => setComplete(e.complete)}
        onLoadError={() => setLoadFailed(true)}
      />
      {loadFailed && <Notice tone="error" title={PAY_COPY.loading} />}
      {outcome?.kind === "message" && (
        <p className={styles.payMessage} role="alert">
          {outcome.text}
        </p>
      )}
      <Button
        block
        className={styles.payButton}
        disabled={!complete || !stripe || stopped}
        busy={busy}
        busyLabel="Taking payment"
        onClick={async () => {
          setBusy(true);
          await payNow();
          setBusy(false);
        }}
      >
        Pay {formatPrice(totalPence)}
      </Button>
      {busy && <p className={styles.reviewNote}>{OUTCOME_COPY.doNotClose}</p>}
      {heldOut && !context.pausedHere && (
        <p className={styles.reviewNote}>{OUTCOME_COPY.heldOut}</p>
      )}
    </div>
  );
}
