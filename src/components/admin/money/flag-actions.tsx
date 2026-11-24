"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  checkedDayAction,
  dismissNoOrderAction,
  keepFeeAction,
  refundFeeAction,
  retryRefundAction,
  type FlagOutcome,
} from "@/app/admin/(shell)/money/actions";
import { SaveDialog } from "@/components/admin/order/save-dialog";
import { Button } from "@/components/ui/button";
import styles from "./money.module.css";

const GONE = {
  gone: "This was already sorted — the screen shows it as it is now.",
};

/** A flag's own button (Try again, Checked, Refund £15): one press, the screen redrawn; words if it did not work. */
function Press({
  label,
  busyLabel,
  run,
  failed,
}: {
  label: string;
  busyLabel: string;
  run: () => Promise<FlagOutcome>;
  failed: string;
}) {
  const router = useRouter();
  const [line, setLine] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <>
      <Button
        variant="outline"
        className={styles.flagButton}
        busy={busy}
        busyLabel={busyLabel}
        onClick={() =>
          start(async () => {
            setLine(null);
            const r = await run().catch(() => ({ kind: "failed" }) as const);
            router.refresh();
            if (r.kind === "signed-out")
              setLine(
                "You are signed out — sign in again, then press it again.",
              );
            else if (r.kind === "failed") setLine(failed);
            else if (r.kind === "gone") setLine(GONE.gone);
          })
        }
      >
        {label}
      </Button>
      {line && (
        <p className={styles.flagLine} role="alert">
          {line}
        </p>
      )}
    </>
  );
}

export const TryAgain = ({ refundId }: { refundId: number }) => (
  <Press
    label="Try again"
    busyLabel="Trying"
    run={() => retryRefundAction(refundId)}
    failed="Stripe did not take the refund this time either — nothing went back. Try again later or refund it in Stripe."
  />
);

export const Checked = ({ orderId }: { orderId: number }) => (
  <Press
    label="Checked"
    busyLabel="Saving"
    run={() => checkedDayAction(orderId)}
    failed="Nothing was saved — please try again."
  />
);

export const RefundFee = ({
  attemptId,
  label,
}: {
  attemptId: number;
  label: string;
}) => (
  <Press
    label={label}
    busyLabel="Refunding"
    run={() => refundFeeAction(attemptId)}
    failed="Stripe did not take the refund — it now shows as “Refund failed” with Try again."
  />
);

/** Dismiss (Stripe payment has no order): asks first; nothing is refunded. */
export const DismissNoOrder = ({ alertId }: { alertId: number }) => (
  <SaveDialog
    trigger={(open) => (
      <Button variant="outline" className={styles.flagButton} onClick={open}>
        Dismiss
      </Button>
    )}
    title="Dismiss this flag?"
    description="The payment stays in Stripe and nothing is refunded. Check it there first."
    saveLabel="Dismiss it"
    busyLabel="Saving"
    keepLabel="Keep it"
    save={() => dismissNoOrderAction(alertId)}
    refused={GONE}
  />
);

/** Dismiss (£15 redelivery to refund): “Keep the £15? Nothing is refunded.” */
export const KeepFee = ({
  attemptId,
  fee,
}: {
  attemptId: number;
  fee: string;
}) => (
  <SaveDialog
    trigger={(open) => (
      <Button variant="outline" className={styles.flagButton} onClick={open}>
        Dismiss
      </Button>
    )}
    title={`Keep the ${fee}?`}
    description="Nothing is refunded."
    saveLabel={`Keep the ${fee}`}
    busyLabel="Saving"
    keepLabel="Not now"
    save={() => keepFeeAction(attemptId)}
    refused={GONE}
  />
);
