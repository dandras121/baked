"use client";

import { useEffect, useState } from "react";
import styles from "./field-error.module.css";

/**
 * The message under a field (ANIM-19): slides 4 px down and fades in over 160 ms; the space below opens with it;
 * leaving takes 120 ms. The text stays while it leaves.
 */
export function FieldError({
  id,
  message,
  className = "",
}: {
  id: string;
  message?: string | null;
  className?: string;
}) {
  const [shown, setShown] = useState(message ?? "");
  if (message && message !== shown) setShown(message);
  const open = Boolean(message);
  // After the 120 ms leave, the text is removed (so it is not read out or found any more).
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setShown(""), 140);
    return () => clearTimeout(timer);
  }, [open]);
  return (
    <div className={`${styles.wrap} ${open ? styles.open : ""} ${className}`}>
      <p
        id={id}
        className={styles.message}
        aria-live="polite"
        hidden={!open && !shown}
      >
        {open ? message : shown}
      </p>
    </div>
  );
}
