"use client";

import { useEffect, useState } from "react";
import { keepHolding } from "@/app/(site)/order/actions";
import { Notice } from "@/components/ui/notice";
import { clock, HOLD_COPY, WARN_SECONDS } from "@/lib/hold";
import styles from "./checkout.module.css";
import { DateChips } from "./date-chips";

/**
 * The hold line on steps 3–4 (§5.3, §10.3; 974:9147 F): “{date} is held for m:ss”, counting down from the server's
 * expiry. With two minutes left it offers Keep holding (when an extension is left and the day is still free) or
 * says it can't. At 0 the line becomes “Your twenty minutes are up” with date chips (975:9087 G); focus moves to it.
 * Screen readers hear the time only at 5 and at 1 minute left.
 */
export function HoldLine({
  dateLabel,
  expiresAt,
  serverLeft,
  canKeep,
  minutes,
  step,
  chips,
}: {
  dateLabel: string;
  /** ISO time; null when the hold had already run out when the page loaded. */
  expiresAt: string | null;
  /** Milliseconds left when the server drew the page (shown before the first tick and without JavaScript). */
  serverLeft: number;
  canKeep: boolean;
  minutes: number;
  step: "details" | "pay";
  chips: string[];
}) {
  const end = expiresAt ? new Date(expiresAt).getTime() : 0;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  // Before the first tick (server render, no JavaScript) the line shows the time left as it was then.
  const left = now === null ? serverLeft : end - now;
  const ranOut = !expiresAt || (now !== null && left <= 0);
  const mins = Math.ceil(left / 60_000);
  const spoken =
    mins === 5 || mins === 1
      ? `${mins} ${mins === 1 ? "minute" : "minutes"} left on your date hold`
      : "";

  if (ranOut)
    return (
      <div className={styles.holdBox}>
        <Notice tone="error" urgent title={HOLD_COPY.ranOutTitle(minutes)}>
          {HOLD_COPY.ranOutText(dateLabel)}
        </Notice>
        <DateChips dates={chips} next={step} inForm={false} />
      </div>
    );

  const warn = now !== null && left <= WARN_SECONDS * 1000;
  return (
    <div className={styles.holdBox} data-warn={warn || undefined}>
      <p className={styles.holdLine}>
        {warn && !canKeep
          ? HOLD_COPY.last(dateLabel, clock(left))
          : HOLD_COPY.held(dateLabel, clock(left))}
      </p>
      <span className="visually-hidden" aria-live="polite">
        {spoken}
      </span>
      {warn && canKeep && (
        <form action={keepHolding}>
          <input type="hidden" name="step" value={step} />
          <button type="submit" className={styles.inlineAction} data-pressable>
            {HOLD_COPY.keep(minutes)}
          </button>
        </form>
      )}
    </div>
  );
}
