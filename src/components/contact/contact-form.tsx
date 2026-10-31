"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { unstable_rethrow } from "next/navigation";
import type { ContactState } from "@/app/(site)/contact/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { TextArea, TextField } from "@/components/ui/text-field";
import {
  CONTACT,
  CONTACT_COPY,
  CONTACT_FIELDS,
  contactFieldError,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactInput,
} from "@/lib/contact";
import styles from "./contact.module.css";

const EMPTY: ContactInput = { name: "", email: "", phone: "", message: "" };

type Action = (state: ContactState, form: FormData) => Promise<ContactState>;

/**
 * The contact form (§7.4). Checked in the browser before sending and again on the server; errors sit under their
 * field (ANIM-19) and focus moves to the first one (§10.8). A field with an error is checked again as it is
 * corrected. Without JavaScript the same form posts to the server action and comes back with the errors; with
 * JavaScript the send goes through a wrapper that turns a lost connection into “Nothing was sent” (§10.8).
 */
export function ContactForm({ action }: { action: Action }) {
  const INITIAL: ContactState = { errors: {}, values: EMPTY, notice: null };
  // Without JavaScript: the form posts here (a server action keeps working without JavaScript).
  const [posted, postAction] = useActionState<ContactState, FormData>(
    action,
    INITIAL,
  );
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    async (previous, form) => {
      try {
        return await action(previous, form);
      } catch (error) {
        unstable_rethrow(error); // the redirect to Message sent
        return { ...previous, errors: {}, notice: CONTACT_COPY.failed };
      }
    },
    posted,
  );
  const [values, setValues] = useState<ContactInput>(posted.values);
  const [errors, setErrors] = useState<ContactErrors>(posted.errors);
  const [notice, setNotice] = useState<string | null>(posted.notice);
  const [seen, setSeen] = useState(state);
  const [focusFirst, setFocusFirst] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  // A server answer: its errors and notice replace the shown ones. (Without JavaScript the page is drawn again
  // from the answer, so the first values above come from it.)
  if (state !== seen) {
    setSeen(state);
    setErrors(state.errors);
    setNotice(state.notice);
    if (Object.keys(state.errors).length) setFocusFirst((n) => n + 1);
  }

  useEffect(() => {
    if (!focusFirst) return;
    const first = CONTACT_FIELDS.find((f) => errors[f]);
    if (first)
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    // Only when a failed send asks for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusFirst]);

  const change = (field: ContactField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field])
      setErrors((e) => ({
        ...e,
        [field]: contactFieldError(field, value) ?? undefined,
      }));
  };

  return (
    <form
      ref={formRef}
      action={postAction}
      noValidate
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const checked = validateContact(values);
        if (!checked.ok) {
          setErrors(checked.errors);
          setNotice(null);
          setFocusFirst((n) => n + 1);
          return;
        }
        // One key per form: a repeated press or a retry is one message (§10.8).
        if (keyRef.current && !keyRef.current.value)
          keyRef.current.value = crypto.randomUUID();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input ref={keyRef} type="hidden" name="formKey" defaultValue="" />
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-ref">Leave this empty</label>
        <input
          id="contact-ref"
          name={CONTACT.honeypot}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <TextField
        id="contact-name"
        name="name"
        label="Your name"
        autoComplete="name"
        value={values.name}
        error={errors.name}
        onChange={(e) => change("name", e.target.value)}
      />
      <TextField
        id="contact-email"
        name="email"
        type="email"
        inputMode="email"
        label="Email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={(e) => change("email", e.target.value)}
      />
      <TextField
        id="contact-phone"
        name="phone"
        type="tel"
        label="Phone (optional)"
        autoComplete="tel"
        value={values.phone}
        error={errors.phone}
        onChange={(e) => change("phone", e.target.value)}
      />
      <div className={styles.message}>
        <TextArea
          id="contact-message"
          name="message"
          label="What can I help with?"
          max={CONTACT.messageMax}
          counterBelow
          rows={3}
          value={values.message}
          error={errors.message}
          onChange={(e) => change("message", e.target.value)}
        />
      </div>
      <Button
        type="submit"
        className={styles.send}
        busy={pending}
        busyLabel="Sending…"
        aria-describedby={notice ? "contact-send-error" : undefined}
      >
        Send message
      </Button>
      <FieldError
        id="contact-send-error"
        message={notice}
        className={styles.sendError}
      />
      <p className={styles.privacy}>
        No newsletter, no sharing. Your details are used to answer you and
        nothing else.
      </p>
    </form>
  );
}
