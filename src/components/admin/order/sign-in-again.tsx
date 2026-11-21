"use client";

import { askCode, signIn } from "@/app/admin/sign-in/actions";
import { SignInForm } from "@/components/admin/sign-in-form";
import styles from "./order.module.css";

/**
 * A save sent after the session ended (§9.2): nothing is lost — the dialog asks for the e-mail and the code right
 * here, then the page offers Save again.
 */
export function SignInAgain({ onDone }: { onDone: () => void }) {
  return (
    <div className={styles.signInAgain}>
      <p className={styles.dialogText}>
        Your sign-in has ended, so nothing was saved yet. Sign in here — what
        you typed stays — then save again.
      </p>
      <SignInForm
        askCode={askCode}
        signIn={signIn}
        again={false}
        inline
        onDone={onDone}
      />
    </div>
  );
}
