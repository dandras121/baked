// Paying for a draft (SITE-FLOWS §5.5, §10.2, §10.3): one PaymentIntent per draft, and prepare before Pay.
import { eq, sql } from "drizzle-orm";
import type { Gateway, Intent } from "@/lib/payments";
import type { connect } from "./client";
import { draftLineViews } from "./draft-repo";
import { liveHold } from "./hold-repo";
import { readSettings } from "./settings-repo";
import { drafts } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/** A lock lasts 15 minutes (§5.5 Browser closed during the bank check). */
export const LOCK_MS = 15 * 60 * 1000;

/** What the order costs now: the cakes plus the delivery charge (§5.4 Total). */
export async function draftAmount(db: Db, draftId: string): Promise<number> {
  const [d] = await db.select().from(drafts).where(eq(drafts.id, draftId));
  if (!d) return 0;
  const lines = await draftLineViews(db, draftId);
  const settings = await readSettings(db);
  const charge = d.handover === "delivery" ? settings.deliveryChargePence : 0;
  return lines.reduce((s, l) => s + l.pricePence, 0) + charge;
}

const UPDATABLE = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

/**
 * The draft's PaymentIntent, created when step 4 first loads (§5.5): the row is locked, one is created only when none
 * is stored (Stripe's idempotency key `create-{draft id}` as well), and a later amount change updates it.
 */
export async function ensurePaymentIntent(
  db: Db,
  draftId: string,
  gw: Gateway,
): Promise<Intent> {
  const amount = await draftAmount(db, draftId);
  return db.transaction(async (tx) => {
    const [d] = await tx
      .select({ pi: drafts.paymentIntentId })
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .for("update");
    if (!d?.pi) {
      const intent = await gw.create(draftId, amount);
      await tx
        .update(drafts)
        .set({ paymentIntentId: intent.id })
        .where(eq(drafts.id, draftId));
      return intent;
    }
    const intent = await gw.retrieve(d.pi);
    if (intent.amountPence !== amount && UPDATABLE.has(intent.status))
      return gw.updateAmount(intent.id, amount);
    return intent;
  });
}

export type Prepared =
  | { kind: "ok"; amountPence: number }
  | { kind: "changed"; amountPence: number }
  | { kind: "held-out" }
  | { kind: "locked" }
  | { kind: "gone" };

/**
 * Pressing Pay (§5.5 prepare): the hold must still run; the amount is worked out again and must be the one the
 * customer saw (otherwise nothing is charged and the page shows the new total); the PaymentIntent gets that amount;
 * the snapshot is stored with it; the draft is locked (`pending`) and the hold kept for at least 15 more minutes.
 */
export async function preparePayment(
  db: Db,
  draftId: string,
  shownPence: number,
  gw: Gateway,
  now = new Date(),
): Promise<Prepared> {
  const amount = await draftAmount(db, draftId);
  const lines = await draftLineViews(db, draftId);
  return db.transaction(async (tx) => {
    const [d] = await tx
      .select()
      .from(drafts)
      .where(eq(drafts.id, draftId))
      .for("update");
    if (!d || !d.paymentIntentId || lines.length === 0) return { kind: "gone" };
    const locked =
      d.status === "pending" &&
      d.lockedAt &&
      now.getTime() < d.lockedAt.getTime() + LOCK_MS;
    if (locked) return { kind: "locked" };
    if (!liveHold(d, now)) return { kind: "held-out" };
    if (amount !== shownPence) return { kind: "changed", amountPence: amount };
    const intent = await gw.retrieve(d.paymentIntentId);
    if (intent.amountPence !== amount) await gw.updateAmount(intent.id, amount);
    const keepUntil = new Date(now.getTime() + LOCK_MS);
    await tx
      .update(drafts)
      .set({
        status: "pending",
        lockedAt: now,
        snapshot: {
          takenAt: now.toISOString(),
          date: d.holdDate,
          handover: d.handover,
          window: d.deliveryWindow,
          lines: lines.map((l) => ({
            id: l.id,
            slug: l.slug,
            title: l.title,
            pricePence: l.pricePence,
            allergens: l.allergenText,
          })),
        },
        snapshotAmountPence: amount,
        holdExpiresAt: sql`greatest(${drafts.holdExpiresAt}, ${keepUntil.toISOString()}::timestamptz)`,
        lastActivityAt: now,
      })
      .where(eq(drafts.id, draftId));
    return { kind: "ok", amountPence: amount };
  });
}

/** A payment that did not go through (declined, cancelled): back to `draft`, the same PaymentIntent (§5.5). */
export async function unlockDraft(db: Db, draftId: string): Promise<void> {
  await db
    .update(drafts)
    .set({ status: "draft", lockedAt: null })
    .where(eq(drafts.id, draftId));
}
