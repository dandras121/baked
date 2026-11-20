"use client";

import { useState } from "react";
import styles from "./today.module.css";

/**
 * Send a text (§9.3; 1598:10477, phone 1598:10481): the ready-written text is copied as well (a page cannot tell
 * whether `sms:` opened anything), “Text copied” shows, and the messages app opens with the number and the text.
 */
export function SendAText({ href, text }: { href: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className={styles.textWrap}>
      <a
        href={href}
        className={styles.sendText}
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => setCopied(true),
            () => {},
          );
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/icon-text-message.svg"
          alt=""
          className={styles.textIcon}
        />
        Send a text
      </a>
      {copied && (
        <span className={styles.copied} role="status">
          Text copied
        </span>
      )}
    </span>
  );
}
