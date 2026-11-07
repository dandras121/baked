// Cancel your order (§6.6, §10.1, §10.6): the refund the terms give today, and the cancellation itself. The order is
// cancelled first; its Stripe refund follows at once (newest charge first). A refund that fails leaves the order
// cancelled and tells Linda (refund-repo); e-mail 8 still says it is on its way (§9.5).
import { and, eq, inArray } from "drizzle-orm";
import type { CancelQuote } from "@/lib/cancel-copy";
import type { CancelledView } from "@/lib/mail/after-emails";
import { isChangeWindowOpen, refundAmount, refundTier } from "@/lib/deadlines";
import { londonDate, type CalendarDate } from "@/lib/london-time";

export type { CancelQuote };
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { paymentInProgress } from "./change-repo";
import { queueMail } from "./mail-repo";
import { netPaid, refundOrder } from "./refund-repo";
import { orderChanges, orderLines, orders, refunds } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Order = typeof orders.$inferSelect;

/** What the cancel page shows and the action checks again: the §10.1 tier on what counts for a refund. */
export async function cancelQuote(
  db: Db | Tx,
  o: Order,
  today: CalendarDate,
): Promise<CancelQuote> {
  const date = String(o.date);
  const earliest = String(o.earliestDate);
  const tier = refundTier(earliest, date, today);
  const [changes, made, net] = await Promise.all([
    db
      .select({ paid: orderChanges.paidPence, at: orderChanges.createdAt })
      .from(orderChanges)
      .where(
        and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "saved")),
      )
      .orderBy(orderChanges.id),
    db
      .select({ pence: refunds.amountPence, at: refunds.createdAt })
      .from(refunds)
      .where(
        and(
          eq(refunds.orderId, o.id),
          inArray(refunds.status, ["pending", "succeeded"]),
        ),
      )
      .orderBy(refunds.id),
    netPaid(db as Db, o),
  ]);
  const basis = Math.max(0, net);
  return {
    // The page only opens while the change window is open, so “none” never shows here (§6.6).
    tier: tier === "none" ? "half" : tier,
    refundPence: refundAmount(basis, tier),
    basisPence: basis,
    earliestDiffers: earliest !== date,
    date,
    earliest,
    payments: [
      ...(o.amountReceivedPence > 0
        ? [{ pence: o.amountReceivedPence, on: londonDate(o.confirmedAt) }]
        : []),
      ...changes
        .filter((c) => c.paid > 0)
        .map((c) => ({ pence: c.paid, on: londonDate(c.at) })),
    ],
    refundsMade: made.map((r) => ({ pence: r.pence, on: londonDate(r.at) })),
  };
}

/** Online cancelling is open: a catalogue order, confirmed, until 23:59 on D-2 (§6.6, §10.1). */
export const canCancelOnline = (o: Order, today: CalendarDate) =>
  o.kind === "catalogue" &&
  o.status === "confirmed" &&
  isChangeWindowOpen(String(o.date), today);

export type CancelResult =
  | { kind: "cancelled"; refundOk: boolean }
  | { kind: "closed" }
  | { kind: "locked" }
  | { kind: "already" }
  | { kind: "changed"; quote: CancelQuote };

/**
 * Customer **Cancel the order** (§6.6): the window is checked again, then the refund; if it differs from what was
 * shown nothing is cancelled. Otherwise the order is cancelled, its date released and any waiting change dropped in
 * one transaction; the refund, e-mail 8 and Linda's alert follow.
 */
export async function cancelOrder(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: { orderId: number; shownPence: number },
  now = new Date(),
): Promise<CancelResult> {
  const today = londonDate(now);
  const result = await db.transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!o) return { kind: "closed" } as const;
    if (o.status === "cancelled" || o.status === "refunded")
      return { kind: "already" } as const;
    if (!canCancelOnline(o, today)) return { kind: "closed" } as const;
    if (paymentInProgress(o, now)) return { kind: "locked" } as const;
    const quote = await cancelQuote(tx, o, today);
    if (quote.refundPence !== input.shownPence)
      return { kind: "changed", quote } as const;
    const view = await cancelledView(tx, o, quote, today);
    await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: now,
        cancellation: view,
        version: o.version + 1,
        lockedAt: null,
        holdDate: null,
        holdExpiresAt: null,
      })
      .where(eq(orders.id, o.id));
    // A change still waiting for its payment is dropped; a payment that lands later is refunded (§10.6 Stray payments).
    await tx
      .update(orderChanges)
      .set({ status: "dropped" })
      .where(
        and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "pending")),
      );
    return { kind: "cancelled", order: o, quote, view } as const;
  });
  if (result.kind !== "cancelled") return result;
  const { order: o, quote, view } = result;
  let refundOk = true;
  if (quote.refundPence > 0) {
    refundOk = (
      await refundOrder(
        db,
        gw,
        { orderId: o.id, amountPence: quote.refundPence, kind: "cancel" },
        now,
      )
    ).ok;
    await settleCancellation(db, o.id);
  }
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
  await queueMail(
    db,
    {
      key: `alert:cancelled:${o.id}`,
      template: "alert",
      data: {
        kind: "customer-cancelled",
        view: { number: o.number, refundPence: quote.refundPence },
      },
      to: (await readSettings(db)).email,
      replyTo: o.email || null,
    },
    now,
  );
  return { kind: "cancelled", refundOk };
}

/** `refunded` once every refund decided at cancellation has gone through (§10.6); a £0 one stays `cancelled`. */
export async function settleCancellation(db: Db, orderId: number) {
  const rows = await db
    .select({ status: refunds.status })
    .from(refunds)
    .where(and(eq(refunds.orderId, orderId), eq(refunds.kind, "cancel")));
  if (rows.length && rows.every((r) => r.status === "succeeded"))
    await db
      .update(orders)
      .set({ status: "refunded" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "cancelled")));
}

/** E-mail 8's view, kept on the order so the E state and a resend say what was decided (§8.4). */
async function cancelledView(
  tx: Tx,
  o: Order,
  q: CancelQuote,
  today: CalendarDate,
): Promise<CancelledView> {
  const names = await tx
    .select({ name: orderLines.name })
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(orderLines.position);
  return {
    number: o.number,
    cake: names.map((n) => n.name).join(", "),
    date: String(o.date),
    cancelledOn: today,
    tier: q.tier,
    cardPence: q.refundPence,
    handPence: 0,
    earliestDiffers: q.earliestDiffers,
    byLinda: false,
    manual: false,
  };
}
