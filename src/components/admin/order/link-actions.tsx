"use client";

import { useState } from "react";
import { cancelPayLinkAction } from "@/app/admin/(shell)/orders/[number]/actions";
import { SaveDialog } from "./save-dialog";
import styles from "./order.module.css";

/** An open link's line in MONEY (§9.5): Copy the link · Cancel this link (a waiting change's link: Copy only). */
export function LinkActions({
  linkId,
  token,
  first,
  waiting,
}: {
  linkId: number;
  token: string;
  first: string;
  waiting: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={styles.linkActions}>
      <button
        type="button"
        className={styles.textButton}
        onClick={async () => {
          await navigator.clipboard.writeText(
            new URL(`/pay/${token}`, location.origin).href,
          );
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <span aria-live="polite">
          {copied ? "Link copied" : "Copy the link"}
        </span>
      </button>
      {!waiting && (
        <SaveDialog
          trigger={(open) => (
            <button type="button" className={styles.textButton} onClick={open}>
              Cancel this link
            </button>
          )}
          title="Cancel this link?"
          description={`It stops working at once. No e-mail goes to ${first}.`}
          saveLabel="Cancel the link"
          busyLabel="Cancelling"
          keepLabel="Keep it"
          save={() => cancelPayLinkAction(linkId)}
        />
      )}
    </span>
  );
}
