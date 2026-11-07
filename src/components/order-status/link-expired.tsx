"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import type { ResendState } from "@/app/(site)/my-order/[token]/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { LINK_COPY } from "@/lib/order-link";
import styles from "./state.module.css";

/**
 * D · Let me send you a new one (1037:9232): an expired, unknown or tampered status link. One e-mail field, always
 * empty at first; Send me a new link → F “New link sent” (1037:9244), the same answer whether an order matched. The
 * Find my order limits apply (§6.7: B “Too many requests”, the typed address kept, the button still enabled).
 */
export function LinkExpired({
  action,
  phone,
}: {
  action: (state: ResendState, form: FormData) => Promise<ResendState>;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    email: "",
    outcome: null,
  });
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);

  if (state.outcome === "sent")
    return (
      <div className={styles.narrow}>
        <h1 ref={title} tabIndex={-1} className="visually-hidden">
          {LINK_COPY.sentTitle}
        </h1>
        <Notice icon title={LINK_COPY.sentTitle}>
          <p>{LINK_COPY.sentText}</p>
        </Notice>
        <Link className={styles.link} href="/find-my-order">
          {LINK_COPY.find}
        </Link>
      </div>
    );

  const limited =
    state.outcome === "limit-address" || state.outcome === "limit-connection";
  return (
    <div className={`${styles.narrow} ${styles.centre}`}>
      <p className={styles.eyebrow}>{LINK_COPY.expiredEyebrow}</p>
      <h1 ref={title} tabIndex={-1} className={styles.title}>
        {LINK_COPY.expiredTitle}
      </h1>
      <p className={styles.text}>{LINK_COPY.expiredText}</p>
      <form action={formAction} className={styles.form} noValidate>
        <TextField
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          label={LINK_COPY.emailLabel}
          defaultValue={state.email}
          key={`${state.outcome}-${state.email}`}
          error={state.outcome === "invalid" ? LINK_COPY.emailInvalid : null}
        />
        <Notice
          icon
          open={limited || state.outcome === "failed"}
          title={LINK_COPY.tooManyTitle}
        >
          <p>
            {state.outcome === "limit-address"
              ? LINK_COPY.tooManyAddress(phone)
              : state.outcome === "limit-connection"
                ? LINK_COPY.tooManyConnection(phone)
                : "The connection dropped — please try again."}
          </p>
        </Notice>
        <Button type="submit" block busy={pending}>
          {LINK_COPY.send}
        </Button>
      </form>
      <p className={styles.small}>{LINK_COPY.noPassword}</p>
    </div>
  );
}
