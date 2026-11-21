"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { SignInState } from "@/app/admin/sign-in/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { TextField } from "@/components/ui/text-field";
import { codeDigits, SIGN_IN_COPY as C } from "@/lib/admin/sign-in";
import styles from "./sign-in.module.css";

type Action = (s: SignInState, f: FormData) => Promise<SignInState>;

/**
 * Sign in (§9.2; desktop 932:8144 / code 1801:13621, phone 1801:13646 / code 950:9002): the e-mail step, then six
 * boxes for the code — pasting fills all six, the sixth digit signs in. Resend ends the earlier code.
 */
export function SignInForm({
  askCode,
  signIn,
  again,
  inline,
  onDone,
}: {
  askCode: Action;
  signIn: Action;
  again: boolean;
  /** Inside the sign-in dialog of a save after the session ended (§9.2): no brand, smaller headings, stays. */
  inline?: boolean;
  onDone?: () => void;
}) {
  const start: SignInState = {
    step: "email",
    email: "",
    error: null,
    dead: null,
  };
  const [asked, ask, asking] = useActionState(askCode, start);
  const [tried, trySignIn, signing] = useActionState(signIn, start);
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [back, setBack] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // The newest answer decides the step: the last code request, or the last sign-in try after it.
  const [seen, setSeen] = useState({ asked, tried, back });
  const [view, setView] = useState<SignInState>(start);
  if (seen.asked !== asked || seen.tried !== tried || seen.back !== back) {
    const latest =
      seen.back !== back
        ? { ...start, email }
        : seen.tried !== tried
          ? tried
          : asked;
    setSeen({ asked, tried, back });
    setView(latest);
    if (seen.asked !== asked && asked.step === "code")
      setDigits(["", "", "", "", "", ""]);
  }

  const sendCode = (resend: boolean) => {
    const f = new FormData();
    f.set("email", email);
    if (resend) f.set("resend", "1");
    startTransition(() => ask(f));
  };
  const submitCode = (code: string) => {
    const f = new FormData();
    f.set("email", view.email || email);
    f.set("code", code);
    if (inline) f.set("stay", "1");
    startTransition(() => trySignIn(f));
  };

  function type(i: number, raw: string) {
    const typed = codeDigits(raw);
    const next = [...digits];
    if (typed.length > 1) {
      // A pasted code (or the phone's one-time-code offer) fills the boxes from here.
      typed.split("").forEach((d, k) => i + k < 6 && (next[i + k] = d));
    } else next[i] = typed;
    setDigits(next);
    const filled = next.findIndex((d) => !d);
    boxes.current[
      filled === -1 ? 5 : Math.max(filled, Math.min(i + 1, 5))
    ]?.focus();
    if (next.every(Boolean)) submitCode(next.join(""));
  }

  // Signed in inside the dialog: hand back to the page once.
  const [doneSeen, setDoneSeen] = useState(false);
  if (view.step === "done" && !doneSeen) {
    setDoneSeen(true);
    queueMicrotask(() => onDone?.());
  }
  const Title = inline ? "h3" : "h1";

  const card = (children: React.ReactNode) =>
    inline ? (
      <div>{children}</div>
    ) : (
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" className={styles.mark} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark.svg" alt="" className={styles.wordmark} />
          <span className={styles.admin}>Admin</span>
        </div>
        {children}
      </div>
    );

  if (view.step === "email")
    return card(
      <form
        className={styles.form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          sendCode(false);
        }}
      >
        <Title className={styles.title}>{C.title}</Title>
        {again && <p className={styles.again}>{C.again}</p>}
        <p className={styles.intro}>{C.intro}</p>
        <TextField
          id="admin-email"
          type="email"
          label="Email"
          labelStyle="hidden"
          autoComplete="email"
          inputMode="email"
          value={email}
          error={view.error}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button
          key="send"
          type="submit"
          block
          busy={asking}
          busyLabel="Sending"
        >
          {C.send}
        </Button>
      </form>,
    );

  return (
    <>
      {card(
        <form
          className={styles.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submitCode(digits.join(""));
          }}
        >
          <Title className={styles.title}>{C.checkTitle}</Title>
          <p className={styles.intro}>{C.checkIntro(view.email)}</p>
          <fieldset
            className={styles.boxes}
            aria-describedby="admin-code-error"
          >
            <legend className={styles.hidden}>The six-digit code</legend>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                className={styles.box}
                value={d}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${i + 1} of 6`}
                aria-invalid={!!view.error || undefined}
                onChange={(e) => type(i, e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  type(i, e.clipboardData.getData("text"));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0)
                    boxes.current[i - 1]?.focus();
                }}
              />
            ))}
          </fieldset>
          <FieldError id="admin-code-error" message={view.error} />
          {view.dead ? (
            <Button
              key="again"
              type="button"
              block
              busy={asking}
              busyLabel="Sending"
              onClick={() => sendCode(true)}
            >
              {view.dead === "usedUp" ? C.newCode : C.resend}
            </Button>
          ) : (
            <Button
              key="sign-in"
              type="submit"
              block
              busy={signing}
              busyLabel="Signing in"
            >
              {C.signIn}
            </Button>
          )}
          <p className={styles.links}>
            {!view.dead && (
              <>
                <button
                  type="button"
                  className={styles.link}
                  data-pressable
                  onClick={() => sendCode(true)}
                >
                  {C.resend}
                </button>
                <span className={styles.dot} aria-hidden>
                  ·
                </span>
              </>
            )}
            <button
              type="button"
              className={styles.link}
              data-pressable
              onClick={() => setBack((n) => n + 1)}
            >
              {C.restart}
            </button>
          </p>
        </form>,
      )}
      <aside className={styles.why}>
        <h2 className={styles.whyTitle}>{C.whyTitle}</h2>
        <p className={styles.whyText}>{C.why}</p>
      </aside>
    </>
  );
}
