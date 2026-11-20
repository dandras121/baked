"use client";

import { useState, useTransition } from "react";
import { setCollectionTime } from "@/app/admin/(shell)/today/actions";
import styles from "./order.module.css";

/** Collection time (1607:10904): free text up to 40, saved on blur; “Saved.” or the §9.1 failure line. */
export function CollectionTime({
  orderId,
  initial,
  first,
}: {
  orderId: number;
  initial: string | null;
  first: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [line, setLine] = useState<"saved" | "failed" | null>(null);
  const [busy, start] = useTransition();
  const save = () => {
    if (value.trim() === saved.trim()) return;
    start(async () => {
      try {
        const t = await setCollectionTime(orderId, value);
        setSaved(t ?? "");
        setValue(t ?? "");
        setLine("saved");
      } catch {
        setLine("failed");
      }
    });
  };
  return (
    <div className={styles.timeField}>
      <input
        id="collection-time"
        className={styles.input}
        value={value}
        maxLength={40}
        placeholder="Agreed with Linda"
        aria-describedby="collection-time-help collection-time-line"
        onChange={(e) => {
          setValue(e.target.value);
          setLine(null);
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <p id="collection-time-help" className={styles.help}>
        Shows on Today, in the collection text and on {first}’s order page.
        Leave empty for ‘at the time we agreed’.
      </p>
      <p
        id="collection-time-line"
        className={styles.saveLine}
        aria-live="polite"
      >
        {busy
          ? "Saving…"
          : line === "saved"
            ? "Saved."
            : line === "failed"
              ? "Nothing was saved — please try again."
              : ""}
      </p>
    </div>
  );
}
