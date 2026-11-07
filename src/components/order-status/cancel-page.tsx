"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cancelCopy, type CancelQuote } from "@/lib/cancel-copy";
import { formatPrice } from "@/lib/money";
import type { CancelState } from "@/app/(site)/my-order/[token]/cancel/actions";
import change from "./change.module.css";
import styles from "./cancel.module.css";

/**
 * C · Cancel your order (§6.6; 1037:9182). The refund is stated in pounds and in days before the button that cannot
 * be undone; the safe choice keeps the solid fill, and the cancel button is the page's only maroon.
 */
export function CancelPage({
  token,
  number,
  today,
  quote: shown,
  action,
}: {
  token: string;
  number: string;
  today: string;
  quote: CancelQuote;
  action: (shownPence: number) => Promise<CancelState>;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  // A refund that changed between showing and pressing replaces the shown one (“Cancel anyway?”).
  const [state, formAction, pending] = useActionState(
    async (prev: CancelState): Promise<CancelState> => {
      const r = await action((prev.quote ?? shown).refundPence);
      return { ...r, quote: r.quote ?? prev.quote };
    },
    { outcome: null },
  );
  const quote = state.quote ?? shown;
  const copy = cancelCopy(quote, today);
  return (
    <div className={change.page}>
      <p className={change.number}>Order {number}</p>
      <h1 ref={title} tabIndex={-1} className={change.title}>
        Cancel this order?
      </h1>
      <p className={styles.lead}>{copy.lead}</p>
      <Notice tone="error" icon title="Cancelling cannot be undone">
        <p>Your date goes straight back into the calendar for someone else.</p>
      </Notice>
      <section className={change.panel} aria-labelledby="get-back">
        <h2 id="get-back" className={change.label}>
          What you get back
        </h2>
        <div className={styles.refund}>
          <span>Refund</span>
          <strong>{formatPrice(quote.refundPence)}</strong>
        </div>
        <p className={styles.paid}>{copy.paid}</p>
        {copy.made.map((m) => (
          <p key={m} className={styles.paid}>
            {m}
          </p>
        ))}
        {copy.basis && <p className={styles.paid}>{copy.basis}</p>}
        <p className={styles.small}>
          It goes back to the card you paid with, within 5–10 working days.
        </p>
      </section>
      {state.outcome && (
        <div className={change.notice}>
          <Notice
            icon
            urgent
            tone={state.outcome === "changed" ? "calm" : "error"}
            title={
              state.outcome === "changed"
                ? copy.changed
                : state.outcome === "locked"
                  ? "A payment for a change is going through"
                  : "Your order was not cancelled"
            }
          >
            <p>
              {state.outcome === "changed"
                ? "Nothing has been cancelled yet."
                : state.outcome === "locked"
                  ? "Nothing has been cancelled. Try again in a few minutes, once it has finished."
                  : "Something went wrong on my side. Try again in a minute."}
            </p>
          </Notice>
        </div>
      )}
      <form action={formAction} className={change.buttons}>
        <ButtonLink href={`/my-order/${token}`}>Keep my order</ButtonLink>
        <Button
          type="submit"
          variant="outline"
          className={styles.danger}
          busy={pending}
          busyLabel="Cancelling"
        >
          Cancel the order
        </Button>
      </form>
      <p className={styles.ladder}>{copy.ladder}</p>
    </div>
  );
}
