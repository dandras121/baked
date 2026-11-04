"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./checkout.module.css";

export const CONFIRMING_COPY = {
  wait: "Confirming your order…",
  stillTitle: "Payment received — confirming your order",
  stillText:
    "Your payment has gone through, but the confirmation has not reached me yet. This page updates itself — there is nothing you need to do, and you will not be charged twice.",
  longText:
    "This is taking longer than usual. Your payment is safe; the confirmation e-mail arrives as soon as it is through.",
};

/** Ten seconds before “Still processing”, every 5 s after it, for 10 minutes (§5.5 Success). */
const QUIET_MS = 10_000;
const EVERY_MS = 5_000;
const STOP_MS = 10 * 60_000;

/**
 * Paid but not yet confirmed (§5.5 Success; 974:9087 · H): the page asks the server until Stripe's confirmation has
 * arrived (then shows the confirmation without a reload), or the payment turns out not to have gone through (step 4).
 */
export function Confirming() {
  const router = useRouter();
  const [phase, setPhase] = useState<"wait" | "still" | "long">("wait");
  useEffect(() => {
    const start = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const ask = async () => {
      const r = await fetch("/api/order/status", { cache: "no-store" })
        .then((res) => res.json() as Promise<{ state: string }>)
        .catch(() => null);
      if (stopped) return;
      if (r?.state === "confirmed") return router.refresh();
      if (r?.state === "failed") return router.replace("/order/pay");
      const spent = Date.now() - start;
      if (spent >= STOP_MS) return setPhase("long");
      if (spent >= QUIET_MS) setPhase("still");
      timer = setTimeout(ask, spent < QUIET_MS ? 2_000 : EVERY_MS);
    };
    timer = setTimeout(ask, 1_000);
    const quiet = setTimeout(
      () => setPhase((p) => (p === "wait" ? "still" : p)),
      QUIET_MS,
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(quiet);
    };
  }, [router]);

  if (phase === "wait")
    return (
      <div role="status" data-confirming="wait">
        <h1 className={styles.emptyTitle}>{CONFIRMING_COPY.wait}</h1>
      </div>
    );
  return (
    <div role="status" data-confirming={phase}>
      <h1 className={styles.emptyTitle}>{CONFIRMING_COPY.stillTitle}</h1>
      <p className={styles.emptyText}>
        {phase === "long"
          ? CONFIRMING_COPY.longText
          : CONFIRMING_COPY.stillText}
      </p>
    </div>
  );
}
