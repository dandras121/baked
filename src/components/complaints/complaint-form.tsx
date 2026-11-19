"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { ComplaintState } from "@/app/(site)/complaints/actions";
import {
  PictureTiles,
  type PicturesState,
} from "@/components/uploads/picture-tiles";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Pill } from "@/components/ui/pill";
import { TextArea, TextField } from "@/components/ui/text-field";
import {
  COMPLAINT,
  complaintErrors,
  EMPTY_COMPLAINT,
  WANTED,
  type Complaint,
  type ComplaintErrors,
} from "@/lib/complaint";
import { CONTACT } from "@/lib/contact";
import type { BlobMode } from "@/lib/storage";
import { PICTURE_COPY } from "@/lib/uploads/rules";
import styles from "./complaint-form.module.css";

const ORDER: (keyof Complaint)[] = ["orderNumber", "name", "email", "body"];

/**
 * Send it here (§7.5; 666:4722 section 6, phone 844:8217): order number, name, e-mail, what's wrong (400), up to
 * three pictures (the §7.1 tiles), What would help (one, optional). Errors under their fields, focus to the first;
 * Send waits for unfinished pictures.
 */
export function ComplaintForm({
  action,
  direct,
}: {
  action: (s: ComplaintState, f: FormData) => Promise<ComplaintState>;
  direct: BlobMode;
}) {
  const [v, setV] = useState<Complaint>(EMPTY_COMPLAINT);
  const [errors, setErrors] = useState<ComplaintErrors>({});
  const [state, formAction, pending] = useActionState(action, {
    errors: {},
    notice: null,
  });
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (Object.keys(state.errors).length) setErrors(state.errors);
  }
  const formKey = useRef("");
  const keyOf = () => (formKey.current ||= crypto.randomUUID());
  const honeypot = useRef<HTMLInputElement>(null);
  const [pictures, setPictures] = useState<PicturesState>({
    ids: [],
    pending: 0,
  });
  const picturesNow = useRef(pictures);
  const [waiting, setWaiting] = useState(false);

  const set = <K extends keyof Complaint>(k: K, value: Complaint[K]) => {
    setV((x) => ({ ...x, [k]: value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function send() {
    const e = complaintErrors(v);
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) {
      document.getElementById(`complaint-${first}`)?.focus();
      return;
    }
    if (picturesNow.current.pending) {
      setWaiting(true);
      return;
    }
    setWaiting(false);
    const data = new FormData();
    data.set("complaint", JSON.stringify(v));
    data.set("formKey", keyOf());
    data.set("pictures", JSON.stringify(picturesNow.current.ids));
    data.set(CONTACT.honeypot, honeypot.current?.value ?? "");
    startTransition(() => formAction(data));
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="complaint-ref">Leave this empty</label>
        <input
          ref={honeypot}
          id="complaint-ref"
          name={CONTACT.honeypot}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <TextField
        id="complaint-orderNumber"
        label="Order number"
        labelStyle="plain"
        autoComplete="off"
        value={v.orderNumber}
        error={errors.orderNumber}
        onChange={(e) => set("orderNumber", e.target.value)}
      />
      <TextField
        id="complaint-name"
        label="Your name"
        labelStyle="plain"
        autoComplete="name"
        value={v.name}
        error={errors.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <TextField
        id="complaint-email"
        type="email"
        label="Email"
        labelStyle="plain"
        autoComplete="email"
        inputMode="email"
        value={v.email}
        error={errors.email}
        onChange={(e) => set("email", e.target.value)}
      />
      <TextArea
        id="complaint-body"
        label="What’s wrong"
        labelStyle="plain"
        max={COMPLAINT.bodyMax}
        counterMode="always"
        rows={4}
        value={v.body}
        error={errors.body}
        onChange={(e) => set("body", e.target.value)}
      />
      <section className={styles.block}>
        <h3 className={styles.label}>{PICTURE_COPY.heading}</h3>
        <PictureTiles
          purpose="complaint"
          formKey={keyOf}
          direct={direct}
          onChange={(next) => {
            picturesNow.current = next;
            setPictures(next);
            if (waiting && !next.pending) send();
          }}
        />
        <p className={styles.note}>
          A picture from the day I can look at helps most, but any photo is
          fine.
        </p>
      </section>
      <section className={styles.block}>
        <h3 id="complaint-wanted" className={styles.label}>
          What would help
        </h3>
        <div
          role="group"
          aria-labelledby="complaint-wanted"
          className={styles.pills}
        >
          {WANTED.map((o) => (
            <Pill
              key={o}
              selected={v.wanted === o}
              onClick={() => set("wanted", v.wanted === o ? "" : o)}
            >
              {o}
            </Pill>
          ))}
        </div>
      </section>
      <div className={styles.send}>
        <Button
          type="submit"
          busy={pending || waiting}
          busyLabel={
            waiting && pictures.pending
              ? PICTURE_COPY.waiting(pictures.pending)
              : "Sending"
          }
        >
          Send my complaint
        </Button>
        <FieldError id="complaint-send-error" message={state.notice} />
      </div>
      <p className={styles.note}>
        No newsletter, no sharing — just used to sort this out.
      </p>
    </form>
  );
}
