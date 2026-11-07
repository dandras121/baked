"use client";

import { useActionState, useEffect, useRef } from "react";
import type { MessageState } from "@/app/(site)/my-order/[token]/message/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { TextArea } from "@/components/ui/text-field";
import change from "./change.module.css";
import styles from "./message.module.css";

const MAX = 400;

/**
 * B · Message Linda (§6.5; 1037:9164, phone 1058:9130): the order number goes with the message, and the reply time is
 * stated before anything is written. The field keeps its label and counter on every breakpoint.
 */
export function MessagePage({
  token,
  number,
  businessEmail,
  phone,
  action,
}: {
  token: string;
  number: string;
  businessEmail: string;
  phone: string;
  action: (state: MessageState, form: FormData) => Promise<MessageState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    message: "",
    outcome: null,
  });
  const title = useRef<HTMLHeadingElement>(null);
  const key = useRef<HTMLInputElement>(null);
  useEffect(() => title.current?.focus(), []);
  useEffect(() => {
    if (key.current && !key.current.value)
      key.current.value = crypto.randomUUID();
  }, []);
  const fieldError =
    state.outcome === "empty"
      ? "Write a message first — nothing was sent."
      : state.outcome === "too-long"
        ? `Keep it to ${MAX} characters — nothing was sent.`
        : null;
  const underButton =
    state.outcome === "limit"
      ? `You have sent five messages in the last hour — nothing was sent. Ring ${phone} if it is urgent.`
      : state.outcome === "failed"
        ? "Nothing was sent — please try again."
        : null;
  return (
    <div className={change.page}>
      <p className={change.number}>Order {number}</p>
      <h1 ref={title} tabIndex={-1} className={change.title}>
        Send Linda a message
      </h1>
      <p className={styles.lead}>
        I answer every message within 24 hours, usually sooner.
      </p>
      <form action={formAction} noValidate>
        <input ref={key} type="hidden" name="formKey" defaultValue="" />
        <section className={change.panel} aria-labelledby="your-message">
          <h2 id="your-message" className={change.label}>
            Your message
          </h2>
          <p className={styles.routing}>
            This goes to {businessEmail} with order {number} attached, so you
            never have to explain which cake you mean.
          </p>
          <TextArea
            id="order-message"
            name="message"
            label="What would you like to tell me?"
            labelStyle="plain"
            max={MAX}
            rows={4}
            defaultValue={state.message}
            key={state.outcome ?? "new"}
            error={fieldError}
          />
        </section>
        <div className={change.buttons}>
          <Button type="submit" busy={pending} busyLabel="Sending">
            Send message
          </Button>
          <ButtonLink href={`/my-order/${token}`} variant="outline">
            Back to your order
          </ButtonLink>
        </div>
        <FieldError id="message-send-error" message={underButton} />
      </form>
      <p className={styles.foot}>
        I read messages between bakes, so a reply can take a few hours. If it is
        urgent, call {phone}.
      </p>
    </div>
  );
}
