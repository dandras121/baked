"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RedeliverResult } from "@/db/delivery-repo";
import checkout from "@/components/checkout/checkout.module.css";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { FieldError } from "@/components/ui/field-error";
import { WINDOWS } from "@/lib/handover";
import { formatPrice } from "@/lib/money";
import { ChangePayment } from "./change-payment";
import change from "./change.module.css";
import styles from "./delivery.module.css";

type Refused = RedeliverResult | { kind: "failed" };

/** What did not happen, in words (§10.8), for a refused Pay / Book. */
function refusedText(r: Refused, phone: string) {
  switch (r.kind) {
    case "no-window":
      return "Pick a time first — nothing was charged.";
    case "closed":
      return `These choices have closed — nothing was charged. Ring me on ${phone}.`;
    case "already":
      return "You have already chosen — nothing was charged.";
    default:
      return "Nothing was booked and nothing was taken. Please try again.";
  }
}

/**
 * Redeliver tomorrow (§6.8): the window pills for the next day, then the fee's card field and Pay £15 — booked only
 * once the payment succeeds. With no fee: Book the redelivery. Card data goes to Stripe only (CLAUDE.md rule 4).
 */
export function RedeliverForm({
  token,
  dayLong,
  feePence,
  phone,
  publishableKey,
  redeliver,
  finish,
}: {
  token: string;
  dayLong: string;
  feePence: number;
  phone: string;
  publishableKey: string;
  redeliver: (window: string) => Promise<Refused>;
  finish: () => Promise<"booked" | "processing" | "failed">;
}) {
  const [window, setWindow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/delivery/${token}`;
  const router = useRouter();
  const done = () => router.refresh();

  return (
    <>
      <fieldset className={checkout.group}>
        <legend className={checkout.sectionHeading}>What time?</legend>
        <div className={checkout.windows}>
          {WINDOWS.map((w) => (
            <label
              key={w.key}
              className={checkout.window}
              data-checked={window === w.key || undefined}
              data-pressable
            >
              <input
                type="radio"
                name="window"
                value={w.key}
                checked={window === w.key}
                onChange={() => {
                  setWindow(w.key);
                  setError(null);
                }}
                className="visually-hidden"
                aria-label={`${w.name} · ${w.times}`}
              />
              <span aria-hidden>
                {w.name}
                <span className={checkout.wideDay}> · {w.times}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="redeliver-error" message={error} />
      </fieldset>
      {feePence > 0 ? (
        <ChangePayment
          amountPence={feePence}
          what={`I bring it back on ${dayLong}`}
          label="Pay the redelivery fee"
          button={`Pay ${formatPrice(feePence)}`}
          publishableKey={publishableKey}
          prepare={async () => {
            const r = await redeliver(window ?? "");
            if (r.kind === "pay")
              return {
                kind: "pay",
                clientSecret: r.clientSecret,
                changeId: r.attemptId,
                amountPence: r.amountPence,
              };
            if (r.kind === "booked") done();
            else setError(refusedText(r, phone));
            return { kind: "error", outcome: null, errors: {} };
          }}
          finish={async () => {
            const r = await finish();
            if (r === "booked") done();
            return r === "booked" ? "saved" : r;
          }}
          returnUrl={() => `${location.origin}${base}?paid=1`}
          onRefused={() => {}}
        />
      ) : (
        <div className={change.buttons}>
          <Button
            busy={busy}
            busyLabel="Booking"
            onClick={async () => {
              setBusy(true);
              const r = await redeliver(window ?? "");
              setBusy(false);
              if (r.kind === "booked") done();
              else setError(refusedText(r, phone));
            }}
          >
            Book the redelivery
          </Button>
        </div>
      )}
      <p className={styles.foot}>
        <Link href={`${base}?choice=collect`}>Collect it free instead</Link>
      </p>
    </>
  );
}
