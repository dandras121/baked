"use client";

import { useSyncExternalStore } from "react";
import styles from "./admin-shell.module.css";

const subscribe = (on: () => void) => {
  window.addEventListener("online", on);
  window.addEventListener("offline", on);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", on);
  };
};

/** No offline mode (§9.17): offline, a line says so. */
export function OfflineLine() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p className={styles.offline} role="status">
      You’re offline — nothing can be saved until you’re back.
    </p>
  );
}
