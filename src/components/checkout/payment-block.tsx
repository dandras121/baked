"use client";

import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  paymentDidNotGoThrough,
  prepareToPay,
} from "@/app/(site)/order/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatPrice } from "@/lib/money";
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
 * never to this server (CLAUDE.md rule 4). Pressing Pay first runs prepare on the server (§5.5); outcomes beyond
 * success and a plain failure arrive in slice 4.5a.
 */
export function PaymentBlock({
  clientSecret,
  publishableKey,
  totalPence,
  billingName,
}: {
  clientSecret: string | null;
  publishableKey: string;
  totalPence: number;
  billingName: string;
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
      <PayForm totalPence={totalPence} billingName={billingName} />
    </Elements>
  );
}

function PayForm({
  totalPence,
  billingName,
}: {
  totalPence: number;
  billingName: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [wallets, setWallets] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const returnUrl = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/order/confirmed`,
    [],
  );

  /** prepare, then Stripe confirms; true when the payment went through or is processing. */
  async function payNow(): Promise<boolean> {
    if (!stripe || !elements) return false;
    setMessage(null);
    const p = await prepareToPay(totalPence);
    if (p.kind !== "ok") {
      if (p.kind === "changed")
        setMessage(PAY_COPY.changed(formatPrice(p.amountPence)));
      if (p.kind === "locked") setMessage(PAY_COPY.locked);
      router.refresh();
      return false;
    }
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: { billing_details: { name: billingName } },
      },
    });
    if (error) {
      await paymentDidNotGoThrough();
      setMessage(error.message ?? PAY_COPY.failed);
      return false;
    }
    if (
      paymentIntent &&
      ["succeeded", "processing"].includes(paymentIntent.status)
    ) {
      router.push("/order/confirmed");
      return true;
    }
    return false;
  }

  return (
    <div className={styles.payBlock}>
      <ExpressCheckoutElement
        options={{ buttonHeight: 48 }}
        onReady={({ availablePaymentMethods }) =>
          setWallets(!!availablePaymentMethods)
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
      {wallets && <p className={styles.payDivider}>or pay by card</p>}
      <PaymentElement
        options={{
          wallets: { applePay: "never", googlePay: "never" },
          fields: { billingDetails: { name: "never" } },
        }}
        onChange={(e) => setComplete(e.complete)}
        onLoadError={() => setLoadFailed(true)}
      />
      {loadFailed && <Notice tone="error" title={PAY_COPY.loading} />}
      {message && (
        <p className={styles.payMessage} role="alert">
          {message}
        </p>
      )}
      <Button
        block
        className={styles.payButton}
        disabled={!complete || !stripe}
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
    </div>
  );
}
