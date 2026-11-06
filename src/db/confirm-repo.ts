// Stripe's answer applied to a draft (SITE-FLOWS §5.5, §10.6, §12): only a succeeded `checkout` PaymentIntent
// confirms, a status only moves forward, and applying the same answer twice changes nothing.
import { and, eq, or } from "drizzle-orm";
import { canHold } from "@/lib/capacity";
import type { Gateway, Intent } from "@/lib/payments";
import type { connect } from "./client";
import { draftLineViews } from "./draft-repo";
import { capacityFor } from "./hold-repo";
import { createOrder } from "./order-repo";
import {
  draftAmount,
  LOCK_MS,
  settleLock,
  snapshotLine,
  type Snapshot,
} from "./payment-repo";
import { drafts, paymentAlerts } from "./schema";

type Db = ReturnType<typeof connect>["db"];

export type Applied =
  "confirmed" | "already-confirmed" | "unlocked" | "no-order" | "nothing";

type AlertKind = "check-payment" | "no-order" | "booked-after-hold";

/** “Check this payment” and the other flags (§8.3): logged until e-mails (phase 5) and the admin (phase 7) show them. */
async function alert(
  db: Db,
  kind: AlertKind,
  intent: Intent,
  draftId: string | null,
  detail: string,
) {
  const added = await db
    .insert(paymentAlerts)
    .values({ kind, paymentIntentId: intent.id, draftId, detail })
    .onConflictDoNothing()
    .returning({ id: paymentAlerts.id });
  if (added.length)
    console.warn(`[payment alert] ${kind} ${intent.id}: ${detail}`);
}

/**
 * Applies what Stripe says now about one PaymentIntent (the caller has just read it from Stripe, so events out of
 * order do no harm). Succeeded → the draft is confirmed (also from `abandoned` or after the hold ran out, §5.5), with
 * “Check this payment” when no snapshot has the amount received, and “Booked after its hold ran out” when the hold
 * had run out and the day is no longer free. Payment failed while `pending` → back to `draft`. Never back from
 * `confirmed`.
 */
export async function applyIntent(
  db: Db,
  intent: Intent,
  now = new Date(),
  /** A `payment_intent.payment_failed` event: the attempt is over. Otherwise (the job) only a lapsed lock opens. */
  failedEvent = false,
  /** To write the order number onto the PaymentIntent (§10.6 metadata.order); left out in tests. */
  gw?: Pick<Gateway, "setOrder">,
): Promise<Applied> {
  if (intent.kind !== "checkout") return "nothing";
  const [found] = await db
    .select()
    .from(drafts)
    .where(
      or(
        eq(drafts.paymentIntentId, intent.id),
        intent.draftId ? eq(drafts.id, intent.draftId) : undefined,
      ),
    );

  if (intent.status === "succeeded") {
    if (!found) {
      await alert(
        db,
        "no-order",
        intent,
        null,
        `Stripe payment of ${intent.amountReceivedPence}p has no order`,
      );
      return "no-order";
    }
    // The snapshot whose amount Stripe received; otherwise the draft as it is now (§5.5 After an unlock).
    const snap = found.snapshot as Snapshot | null;
    const fromSnapshot =
      !!snap && found.snapshotAmountPence === intent.amountReceivedPence;
    const lines = fromSnapshot
      ? snap.lines
      : (await draftLineViews(db, found.id)).map(snapshotLine);
    const total = fromSnapshot
      ? found.snapshotAmountPence!
      : await draftAmount(db, found.id);
    let number = "";
    const result = await db.transaction(async (tx) => {
      const [d] = await tx
        .select()
        .from(drafts)
        .where(eq(drafts.id, found.id))
        .for("update");
      if (d.status === "confirmed") return "already-confirmed" as const;
      await tx
        .update(drafts)
        .set({
          status: "confirmed",
          confirmedAt: now,
          amountReceivedPence: intent.amountReceivedPence,
          lockedAt: null,
        })
        .where(eq(drafts.id, d.id));
      number = await createOrder(
        tx,
        d,
        lines,
        total,
        intent.amountReceivedPence,
        fromSnapshot ? snap : null,
        now,
      );
      return "confirmed" as const;
    });
    if (result === "already-confirmed") return result;
    // Refund in Stripe finds the order by its number (§10.6); a failure here changes nothing else.
    await gw
      ?.setOrder(intent.id, number)
      .catch((e) =>
        console.warn(`[stripe] order number not written on ${intent.id}`, e),
      );
    if (found.snapshotAmountPence !== intent.amountReceivedPence)
      await alert(
        db,
        "check-payment",
        intent,
        found.id,
        `Received ${intent.amountReceivedPence}p; the order snapshot says ${found.snapshotAmountPence ?? "nothing"}`,
      );
    const holdRanOut =
      !found.holdExpiresAt || found.holdExpiresAt.getTime() <= now.getTime();
    if (found.holdDate && holdRanOut) {
      const cap = await capacityFor(db, { ...found, holdExpiresAt: null }, now);
      if (!canHold(found.holdDate, { ...cap, ownHold: null }))
        await alert(
          db,
          "booked-after-hold",
          intent,
          found.id,
          `Booked after its hold ran out — check ${found.holdDate}`,
        );
    }
    return "confirmed";
  }

  // Failed (back to asking for a payment method) or cancelled: a locked draft opens again — at once after a failed
  // payment, after the 15-minute lock otherwise (the customer may be paying right now); nothing else moves.
  const lapsed =
    found?.lockedAt && now.getTime() >= found.lockedAt.getTime() + LOCK_MS;
  if (
    found &&
    ["requires_payment_method", "canceled"].includes(intent.status) &&
    (failedEvent || lapsed)
  ) {
    const opened = await db
      .update(drafts)
      .set({ status: "draft", lockedAt: null })
      .where(and(eq(drafts.id, found.id), eq(drafts.status, "pending")))
      .returning({ id: drafts.id });
    if (opened.length) return "unlocked";
  }
  return "nothing";
}

/**
 * The reconciliation job (§12, every 10 minutes): every PaymentIntent the site created in the last 48 hours is read
 * from Stripe and applied, so a success, or a failure, whose webhook never came is picked up; a succeeded payment
 * with no order is flagged.
 */
export async function reconcile(
  db: Db,
  gw: Pick<Gateway, "listSince" | "setOrder">,
  now = new Date(),
): Promise<Record<Applied, number>> {
  const seen: Record<Applied, number> = {
    confirmed: 0,
    "already-confirmed": 0,
    unlocked: 0,
    "no-order": 0,
    nothing: 0,
  };
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  for (const intent of await gw.listSince(since))
    seen[await applyIntent(db, intent, now, false, gw)]++;
  return seen;
}

export type ConfirmationState = "confirmed" | "processing" | "failed" | "none";

/**
 * What `/order/confirmed` shows for this draft (§5.6 How the page finds the order): confirmed; paid but not yet
 * confirmed (“Still processing”); the payment did not go through (back to step 4); or nothing found.
 */
export async function confirmationState(
  db: Db,
  draftId: string | undefined,
  gw: Gateway | null,
  now = new Date(),
): Promise<ConfirmationState> {
  if (!draftId || !/^[0-9a-f-]{36}$/i.test(draftId)) return "none";
  const [d] = await db.select().from(drafts).where(eq(drafts.id, draftId));
  if (!d) return "none";
  if (d.status === "confirmed") return "confirmed";
  if (d.status !== "pending") return "failed";
  if (!gw) return "processing";
  const lock = await settleLock(db, d, gw, now);
  return lock.kind === "paid" || lock.kind === "paying-elsewhere"
    ? "processing"
    : "failed";
}
