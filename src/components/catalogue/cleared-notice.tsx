"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/ui/notice";
import { LINE_COPY } from "@/lib/order-line";
import styles from "./catalogue.module.css";

/**
 * “Your order was cleared after a day without changes.” (§10.2) — shown when a checkout step sent the visitor here
 * with ?cleared=1. The address is tidied at once, so a refresh or a shared link does not show it again.
 */
export function ClearedNotice() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("cleared") !== "1") return;
    url.searchParams.delete("cleared");
    window.history.replaceState(window.history.state, "", url);
    // Read once from the address on arrival.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(true);
  }, []);
  if (!shown) return null;
  return (
    <div className={styles.cleared}>
      <Notice title={LINE_COPY.cleared} />
    </div>
  );
}
