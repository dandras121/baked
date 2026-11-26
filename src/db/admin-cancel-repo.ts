// Cancel the order from the admin (§9.5, Owner): the refund the terms give today is proposed and Linda can change it
// (£0 up to what was paid). The cancellation is saved first, with the version check (§9.1); the Stripe refund follows
// at once, card payments first, newest first; the rest is to give back by hand. E-mail 8 always goes.
import { and, eq } from "drizzle-orm";
import { emailTier, splitLine, splitRefund } from "@/lib/admin/cancel";
import { memberChange } from "@/lib/admin/versions";
import { refundAmount, refundTier } from "@/lib/deadlines";
import type { CancelledView } from "@/lib/mail/after-emails";
import { londonDate, type CalendarDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import { settleCancellation } from "./cancel-repo";
import { paymentInProgress } from "./change-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { cardRefundable, refundBasis, refundOrder } from "./refund-repo";
import {
  orderChanges,
  orderHistory,
  orderLines,
  orders,
  paymentLinks,
} from "./schema";
import { saveOrderVersioned } from "./versioned";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;

export type AdminCancelQuote = {
  tier: "full" | "half" | "none";
  proposedPence: number;
  /** What was paid and not given back: the most that can be refunded. */
  paidPence: number;
  /** What can go back to the card. */
  cardPence: number;
};

export async function adminCancelQuote(
  db: Db,
  o: Order,
  today: CalendarDate,
): Promise<AdminCancelQuote> {
  const tier = refundTier(String(o.earliestDate), String(o.date), today);
  const [paid, card] = await Promise.all([
    refundBasis(db, o),
    cardRefundable(db, o),
  ]);
  return {
    tier,
    proposedPence: refundAmount(paid, tier),
    paidPence: paid,
    cardPence: card,
  };
}

export type AdminCancelResult =
  | { kind: "cancelled"; refundOk: boolean }
  | { kind: "conflict"; line: string }
  | { kind: "already" }
  | { kind: "locked" }
  | { kind: "amount"; paidPence: number };

export async function adminCancelOrder(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: {
    orderId: number;
    seenVersion: number;
    amountPence: number;
    by: string;
  },
  now = new Date(),
): Promise<AdminCancelResult> {
  const today = londonDate(now);
  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!o || o.status === "cancelled" || o.status === "refunded")
      return { kind: "already" } as const;
    if (paymentInProgress(o, now)) return { kind: "locked" } as const;
    const q = await adminCancelQuote(tx as unknown as Db, o, today);
    if (
      !Number.isSafeInteger(input.amountPence) ||
      input.amountPence < 0 ||
      input.amountPence > q.paidPence
    )
      return { kind: "amount", paidPence: q.paidPence } as const;
    const split = splitRefund(input.amountPence, q.cardPence);
    const names = await tx
      .select({ name: orderLines.name })
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const view: CancelledView = {
      number: o.number,
      cake: names.map((n) => n.name).join(", "),
      date: String(o.date),
      cancelledOn: today,
      tier: emailTier(q.tier, q.proposedPence, input.amountPence),
      cardPence: split.card,
      handPence: split.hand,
      earliestDiffers: String(o.earliestDate) !== String(o.date),
      byLinda: true,
      manual: o.kind === "manual",
    };
    const saved = await saveOrderVersioned(
      tx,
      o.id,
      input.seenVersion,
      {
        status: "cancelled",
        cancelledAt: now,
        cancellation: view,
        lockedAt: null,
        holdDate: null,
        holdExpiresAt: null,
      },
      memberChange(input.by),
      now,
    );
    if (!saved.ok) return { kind: "conflict", line: saved.line } as const;
    // Open payment links are withdrawn; a change still waiting for its payment is dropped (§9.5, §10.6).
    await tx
      .update(paymentLinks)
      .set({ status: "withdrawn" })
      .where(
        and(eq(paymentLinks.orderId, o.id), eq(paymentLinks.status, "open")),
      );
    await tx
      .update(orderChanges)
      .set({ status: "dropped" })
      .where(
        and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "pending")),
      );
    await tx.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: input.by,
      what: `Cancelled the order · ${splitLine(split)}`,
    });
    return { kind: "cancelled", order: o, split, view } as const;
  });
  if (result.kind !== "cancelled") return result;
  const { order: o, split, view } = result;
  let refundOk = true;
  if (split.card > 0) {
    refundOk = (
      await refundOrder(
        db,
        gw,
        { orderId: o.id, amountPence: split.card, kind: "cancel" },
        now,
      )
    ).ok;
    // Refunded once the card refund went through — unless a by-hand part is still to give back (8.7).
    if (split.hand === 0) await settleCancellation(db, o.id);
  }
  // E-mail 8 goes even with customer e-mails off (§9.5).
  if (o.email)
    await queueMail(
      db,
      {
        key: `order:${o.id}:8`,
        template: "cancelled",
        data: { view },
        to: o.email,
      },
      now,
    );
  return { kind: "cancelled", refundOk };
}
