"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deliveredAfterAllAction,
  recordChoiceAction,
} from "@/app/admin/(shell)/orders/[number]/actions";
import { cancelWaitingChangeAction } from "@/app/admin/(shell)/orders/[number]/change/actions";
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
  feeToAsk = null,
  number = "",
  className,
}: {
  orderId: number;
  version: number;
  first: string;
  today: string;
  current: string | null;
  /** “Their £15 redelivery fee goes back to the card.” when collecting replaces a paid redelivery. */
  feeLine: string | null;
  /** “£15”: an unpaid redelivery asks for its fee by link, or waives it (§9.5, §9.8). */
  feeToAsk?: string | null;
  number?: string;
  className?: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"collect" | "redeliver">("collect");
  const [fee, setFee] = useState<"" | "link" | "waive">("");
  const [day, setDay] = useState(today);
  const [window, setWindow] = useState("morning");
  const [shown, setShown] = useState(false);
  const error = !day || day < today ? "Pick a day from today on." : null;
  const feeError =
    kind === "redeliver" && feeToAsk && !fee
      ? `Choose whether to send a ${feeToAsk} payment link or waive it.`
      : null;
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
        if (error || feeError) return null;
        const link = kind === "redeliver" && !!feeToAsk && fee === "link";
        return recordChoiceAction(
          orderId,
          version,
          kind === "collect"
            ? { kind, day }
            : {
                kind,
                day,
                window,
                fee: feeToAsk ? (fee as "link" | "waive") : undefined,
              },
        ).then((r) => {
          // Then Send a payment link opens with Redelivery and the fee (§9.8).
          if (r.kind === "saved" && link)
            router.replace(`/admin/orders/${number}?pay=redelivery`);
          return r;
        });
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
          {feeToAsk ? (
            <fieldset
              className={styles.choices}
              aria-describedby={
                shown && feeError ? "choice-fee-error" : undefined
              }
            >
              <legend className={styles.amountLabel}>The {feeToAsk} fee</legend>
              {(
                [
                  ["link", `Send a ${feeToAsk} payment link`],
                  ["waive", "Waive it"],
                ] as const
              ).map(([v, label]) => (
                <label key={v} className={styles.choice}>
                  <input
                    type="radio"
                    name="choice-fee"
                    checked={fee === v}
                    onChange={() => setFee(v)}
                  />
                  {label}
                </label>
              ))}
              <FieldError
                id="choice-fee-error"
                message={shown ? feeError : null}
              />
            </fieldset>
          ) : (
            <p className={styles.note}>The redelivery fee is paid already.</p>
          )}
        </>
      )}
      {kind === "collect" && feeLine && (
        <p className={styles.note}>{feeLine}</p>
      )}
    </SaveDialog>
  );
}

/** Cancel this change (§9.7, Owner): the waiting change's link is withdrawn; no e-mail. */
export function CancelWaiting({
  orderId,
  first,
  className,
}: {
  orderId: number;
  first: string;
  className?: string;
}) {
  return (
    <SaveDialog
      trigger={(open) => (
        <Button variant="outline" className={className} onClick={open}>
          Cancel this change
        </Button>
      )}
      title="Cancel this change?"
      description={`Its payment link is withdrawn and the order stays as it is. No e-mail goes to ${first}.`}
      saveLabel="Cancel the change"
      busyLabel="Cancelling"
      keepLabel="Keep it"
      save={async () => {
        const r = await cancelWaitingChangeAction(orderId);
        return r.kind === "done" ? { kind: "saved" } : r;
      }}
    />
  );
}
