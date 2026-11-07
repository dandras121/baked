"use client";

import { useActionState, useEffect, useRef } from "react";
import type { OpenState } from "@/app/(site)/my-order/[token]/actions";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { TextField } from "@/components/ui/text-field";
import { LINK_COPY, type CheckKind } from "@/lib/order-link";
import styles from "./state.module.css";

/**
 * Open your order (§6.1): one field — the delivery postcode, or the last four digits of the phone — and Open my
 * order. Nothing personal shows before the right answer. A wrong one: “Nothing has opened yet”, the typed value kept,
 * Try again (A, 1199:9211). Works without JavaScript (the form posts to the server action).
 */
export function OpenOrder({
  action,
  kind,
  phone,
}: {
  action: (state: OpenState, form: FormData) => Promise<OpenState>;
  kind: CheckKind;
  phone: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    answer: "",
    outcome: null,
  });
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;
  const failed = state.outcome === "wrong" || state.outcome === "locked";
  return (
    <div className={styles.narrow}>
      <h1 ref={title} tabIndex={-1} className={styles.title}>
        {LINK_COPY.title}
      </h1>
      <p className={styles.text}>{LINK_COPY.intro[kind]}</p>
      <form action={formAction} className={styles.form} noValidate>
        <TextField
          name="answer"
          label={LINK_COPY.label[kind]}
          defaultValue={state.answer}
          key={`${state.outcome}-${state.answer}`}
          autoComplete={kind === "postcode" ? "postal-code" : "off"}
          inputMode={kind === "phone" ? "numeric" : "text"}
          autoCapitalize={kind === "postcode" ? "characters" : undefined}
          pattern={kind === "phone" ? "[0-9]*" : undefined}
          error={state.outcome === "empty" ? LINK_COPY.empty[kind] : null}
          invalid={failed}
        />
        <Notice
          tone="error"
          icon
          open={failed || state.outcome === "failed"}
          urgent
          title={LINK_COPY.wrongTitle}
        >
          <p>
            {state.outcome === "locked"
              ? LINK_COPY.locked(phone)
              : state.outcome === "failed"
                ? "Nothing has opened yet — the connection dropped. Please try again."
                : LINK_COPY.wrong[kind](phone)}
          </p>
        </Notice>
        <Button type="submit" block busy={pending}>
          {failed ? LINK_COPY.retry : LINK_COPY.open}
        </Button>
      </form>
      <a className={styles.link} href={tel}>
        {LINK_COPY.call(phone)}
      </a>
    </div>
  );
}
