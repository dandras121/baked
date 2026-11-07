"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FindState } from "@/app/(site)/find-my-order/actions";
import contact from "@/components/contact/contact.module.css";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { CONTACT } from "@/lib/contact";
import { LINK_COPY } from "@/lib/order-link";
import styles from "./find.module.css";

/**
 * Find my order (§6.7; 654:3636, tablet 1558:11308, phone 839:7183). The answer F replaces the form in place, the
 * same whether an order matched; its Find my order link is left out here. Too many requests: B under the fields,
 * the typed values kept and the button still enabled.
 */
export function FindMyOrder({
  action,
  phone,
}: {
  action: (state: FindState, form: FormData) => Promise<FindState>;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    email: "",
    number: "",
    outcome: null,
  });
  const answer = useRef<HTMLDivElement>(null);
  const sent = state.outcome === "sent";
  useEffect(() => {
    if (sent) answer.current?.focus();
  }, [sent]);
  const limited =
    state.outcome === "limit-address" || state.outcome === "limit-connection";
  return (
    <div className={contact.page}>
      <h1 className={`${contact.title} ${styles.title}`}>
        Track your <br />
        order easily.
      </h1>
      <div className={styles.body}>
        <p className={contact.intro}>
          Put in the email you ordered with — and your order number, if you have
          it — and a link to your order arrives in a minute. It works until 30
          days after your date.
        </p>
        {sent ? (
          <div ref={answer} tabIndex={-1} className={styles.answer}>
            <Notice icon title={LINK_COPY.sentTitle}>
              <p>{LINK_COPY.sentText}</p>
            </Notice>
          </div>
        ) : (
          <form action={formAction} className={styles.form} noValidate>
            <div className={contact.honeypot} aria-hidden="true">
              <label htmlFor="find-ref">Leave this empty</label>
              <input
                id="find-ref"
                name={CONTACT.honeypot}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                defaultValue=""
              />
            </div>
            <TextField
              id="find-number"
              name="number"
              label="Order number (optional)"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              defaultValue={state.number}
              key={`n-${state.outcome}-${state.number}`}
            />
            <TextField
              id="find-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              label="Email"
              defaultValue={state.email}
              key={`e-${state.outcome}-${state.email}`}
              error={
                state.outcome === "invalid" ? LINK_COPY.emailInvalid : null
              }
            />
            <Notice
              icon
              open={limited || state.outcome === "failed"}
              title={
                state.outcome === "failed"
                  ? "Nothing was sent"
                  : LINK_COPY.tooManyTitle
              }
            >
              <p>
                {state.outcome === "limit-address"
                  ? LINK_COPY.tooManyAddress(phone)
                  : state.outcome === "limit-connection"
                    ? LINK_COPY.tooManyConnection(phone)
                    : "Nothing was sent — please try again."}
              </p>
            </Notice>
            <Button
              type="submit"
              className={contact.send}
              busy={pending}
              busyLabel="Sending"
            >
              Send me the link
            </Button>
          </form>
        )}
        <p className={styles.note}>
          No password and no account — the link is the key. If no order matches,
          you get the same message either way.
        </p>
      </div>
    </div>
  );
}
