"use client";

import { useState } from "react";
import {
  deliveredAfterAllAction,
  recordChoiceAction,
} from "@/app/admin/(shell)/orders/[number]/actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { WINDOWS } from "@/lib/handover";
import { addDays } from "@/lib/london-time";
import { SaveDialog } from "./save-dialog";
import styles from "./order.module.css";

const REFUSED = {
  "not-now":
    "This delivery is no longer waiting for a choice — nothing was changed.",
  "bad-day": "Pick a day from today on — nothing was saved.",
};

/** Delivered after all (§9.5, both roles): completed; the customer's choices close; a paid fee goes back (Owner). */
export function DeliveredAfterAll({
  orderId,
  version,
  first,
  feeLine,
  className,
}: {
  orderId: number;
  version: number;
  first: string;
  /** “The £15 redelivery fee goes back to the card.” / “… is flagged for the owner to refund.” / null. */
  feeLine: string | null;
  className?: string;
}) {
  return (
    <SaveDialog
      trigger={(open) => (
        <Button variant="outline" className={className} onClick={open}>
          Delivered after all
        </Button>
      )}
      title="Delivered after all?"
      description={`The order is completed and ${first}’s choices close — the delivery link then reads “This was sorted — thank you”.${feeLine ? ` ${feeLine}` : ""}`}
      saveLabel="Yes, it was delivered"
      busyLabel="Saving"
      keepLabel="Not yet"
      save={() => deliveredAfterAllAction(orderId, version)}
      refused={REFUSED}
    />
  );
}

/** Record their choice (§9.5, Owner): Collect (day) · Redeliver (date, window), e.g. agreed by phone. */
export function RecordTheirChoice({
  orderId,
  version,
  first,
  today,
  current,
  feeLine,
  className,
}: {
  orderId: number;
  version: number;
  first: string;
  today: string;
  current: string | null;
  /** “Their £15 redelivery fee goes back to the card.” when collecting replaces a paid redelivery. */
  feeLine: string | null;
  className?: string;
}) {
  const [kind, setKind] = useState<"collect" | "redeliver">("collect");
  const [day, setDay] = useState(today);
  const [window, setWindow] = useState("morning");
  const [shown, setShown] = useState(false);
  const error = !day || day < today ? "Pick a day from today on." : null;
  return (
    <SaveDialog
      trigger={(open) => (
        <Button variant="outline" className={className} onClick={open}>
          Record their choice
        </Button>
      )}
      title={`What did ${first} choose?`}
      description={`This closes ${first}’s choices on the delivery link.${current ? ` Now: ${current}. The earlier choice stays in HISTORY.` : ""}`}
      saveLabel="Save their choice"
      busyLabel="Saving"
      keepLabel="Not now"
      save={() => {
        setShown(true);
        if (error) return null;
        return recordChoiceAction(
          orderId,
          version,
          kind === "collect" ? { kind, day } : { kind, day, window },
        );
      }}
      refused={REFUSED}
    >
      <fieldset className={styles.choices}>
        <legend className={styles.amountLabel}>Their choice</legend>
        {(["collect", "redeliver"] as const).map((k) => (
          <label key={k} className={styles.choice}>
            <input
              type="radio"
              name="their-choice"
              checked={kind === k}
              onChange={() => {
                setKind(k);
                setDay(k === "collect" ? today : addDays(today, 1));
              }}
            />
            {k === "collect" ? "Collect it" : "Redeliver"}
          </label>
        ))}
      </fieldset>
      <label className={styles.amountLabel} htmlFor="choice-day">
        {kind === "collect" ? "Collecting on" : "Redelivery on"}
      </label>
      <input
        id="choice-day"
        type="date"
        className={styles.input}
        min={today}
        value={day}
        aria-invalid={(shown && !!error) || undefined}
        aria-describedby="choice-day-error"
        onChange={(e) => setDay(e.target.value)}
      />
      <FieldError id="choice-day-error" message={shown ? error : null} />
      {kind === "redeliver" && (
        <>
          <label className={styles.amountLabel} htmlFor="choice-window">
            Window
          </label>
          <select
            id="choice-window"
            className={styles.input}
            value={window}
            onChange={(e) => setWindow(e.target.value)}
          >
            {WINDOWS.map((w) => (
              <option key={w.key} value={w.key}>
                {w.key[0].toUpperCase() + w.key.slice(1)} · {w.times}
              </option>
            ))}
          </select>
          <p className={styles.note}>No fee is asked for this redelivery.</p>
        </>
      )}
      {kind === "collect" && feeLine && (
        <p className={styles.note}>{feeLine}</p>
      )}
    </SaveDialog>
  );
}
