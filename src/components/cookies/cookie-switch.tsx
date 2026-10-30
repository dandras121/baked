"use client";

import styles from "./cookie-consent.module.css";

/**
 * A switch for one cookie category (1003:9141 locked on, 1003:9149 off, 1199:9360 on). A real
 * role="switch" button; the knob slides 160 ms (Proposal). Locked: always on, cannot be pressed.
 */
export function CookieSwitch({
  checked,
  onChange,
  locked = false,
  label,
  describedBy,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  locked?: boolean;
  label: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      aria-disabled={locked || undefined}
      className={`${styles.switch} hit-44`}
      data-locked={locked ? "" : undefined}
      data-pressable={locked ? undefined : ""}
      onClick={() => {
        if (!locked) onChange?.(!checked);
      }}
    >
      <span className={styles.knob} aria-hidden />
    </button>
  );
}

/** The lock beside the locked switch (1003:9143); decorative. */
export function LockIcon() {
  return (
    <svg className={styles.lock} viewBox="0 0 12 14" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M9 5.8H3C1.9 5.8 1 6.7 1 7.8v3.4c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V7.8c0-1.1-.9-2-2-2Z" />
        <path d="M3.4 5.8V4.1a2.6 2.6 0 0 1 5.2 0v1.7" />
      </g>
    </svg>
  );
}
