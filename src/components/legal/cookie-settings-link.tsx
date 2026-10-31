"use client";

import { OPEN_COOKIE_SETTINGS } from "@/components/cookies/cookie-consent";
import styles from "./legal.module.css";

/** “the cookie preferences link” in the Cookie policy (§4.5): a button that opens the cookie panel. */
export function CookieSettingsLink({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.inlineButton}
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}
    >
      {children}
    </button>
  );
}
