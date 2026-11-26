// Stripe's refund and dispute events (§10.6): `charge.refunded`, `refund.updated`, `refund.failed`,
// `charge.dispute.created`, `charge.dispute.closed`. Each is read again from Stripe (never trusted from the event),
// so a replay or events out of order change nothing.
import { and, eq, isNull } from "drizzle-orm";
import { formatAdminMoney } from "@/lib/money";
import { londonDate } from "@/lib/london-time";
import type { Gateway, StripeRefund } from "@/lib/payments";
import { settleCancellation } from "./cancel-repo";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import {
  deliveryAttempts,
  disputes,
  orderChanges,
  orderHistory,
  orders,
  paymentAlerts,
  paymentLinks,
  refunds,
} from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
const money = (p: number) => formatAdminMoney(p, "breakdown");

/** The order a PaymentIntent paid for: its checkout, a size-up, a payment link or a redelivery fee. */
export async function orderOfIntent(
  db: Db,
  pi: string,
): Promise<typeof orders.$inferSelect | null> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentIntentId, pi));
  if (o) return o;
  const ids = await Promise.all([
    db
      .select({ id: orderChanges.orderId })
      .from(orderChanges)
      .where(eq(orderChanges.paymentIntentId, pi)),
    db
      .select({ id: paymentLinks.orderId })
      .from(paymentLinks)
      .where(eq(paymentLinks.paymentIntentId, pi)),
    db
      .select({ id: deliveryAttempts.orderId })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.paymentIntentId, pi)),
  ]);
  const id = ids.flat()[0]?.id;
  if (!id) return null;
  const [found] = await db.select().from(orders).where(eq(orders.id, id));
  return found ?? null;
}

const statusOf = (r: StripeRefund) =>
  r.status === "succeeded"
    ? "succeeded"
    : r.status === "failed" || r.status === "canceled"
      ? "failed"
      : "pending";

/**
 * A PaymentIntent's refunds as Stripe has them: our own rows follow Stripe's status (a failed one raises “Refund
 * failed — try again”); a refund made in the Stripe dashboard is recorded as `goodwill` (it never counts towards net
 * paid). A payment with no order whose refunds cover it clears its “has no order” flag.
 */
export async function syncRefunds(
  db: Db,
  gw: Pick<Gateway, "refundsOf">,
  pi: string,
  now = new Date(),
): Promise<{ updated: number; added: number }> {
  const list = await gw.refundsOf(pi);
  const o = await orderOfIntent(db, pi);
  let updated = 0;
  let added = 0;
  for (const r of list) {
    const status = statusOf(r);
    const [mine] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.stripeRefundId, r.id));
    if (mine) {
      if (mine.status !== status) {
        await db
          .update(refunds)
          .set({
            status,
            error: status === "failed" ? (r.failureReason ?? "failed") : null,
          })
          .where(eq(refunds.id, mine.id));
        updated++;
        if (status === "succeeded" && mine.kind === "cancel")
          await settleCancellation(db, mine.orderId);
      }
      continue;
    }
    if (!o || status === "failed") continue;
    // One of ours whose Stripe id was never written (the answer was lost): it is that refund, not a new one.
    const [unanswered] = await db
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.paymentIntentId, pi),
          isNull(refunds.stripeRefundId),
          eq(refunds.amountPence, r.amountPence),
        ),
      );
    if (unanswered && unanswered.kind !== "dispute") {
      await db
        .update(refunds)
        .set({ stripeRefundId: r.id, status, error: null })
        .where(eq(refunds.id, unanswered.id));
      updated++;
      if (status === "succeeded" && unanswered.kind === "cancel")
        await settleCancellation(db, unanswered.orderId);
      continue;
    }
    await db.insert(refunds).values({
      orderId: o.id,
      kind: "goodwill",
      amountPence: r.amountPence,
      paymentIntentId: pi,
      stripeRefundId: r.id,
      status,
      createdAt: now,
    });
    await db.insert(orderHistory).values({
      orderId: o.id,
      at: now,
      byName: "Stripe",
      what: `Refunded ${money(r.amountPence)} in Stripe — a goodwill refund; the order's money is unchanged`,
    });
    added++;
  }
  // A Stripe payment with no order (§9.9): its flag clears itself once it is refunded in full.
  if (!o) {
    const back = list
      .filter((r) => statusOf(r) === "succeeded")
      .reduce((n, r) => n + r.amountPence, 0);
    const alerts = await db
      .select()
      .from(paymentAlerts)
      .where(
        and(
          eq(paymentAlerts.paymentIntentId, pi),
          eq(paymentAlerts.kind, "no-order"),
          isNull(paymentAlerts.dismissedAt),
        ),
      );
    for (const a of alerts)
      if (a.amountPence !== null && back >= a.amountPence)
        await db
          .update(paymentAlerts)
          .set({ dismissedAt: now, dismissedBy: "Stripe: refunded in full" })
          .where(eq(paymentAlerts.id, a.id));
  }
  return { updated, added };
}

const CLOSED = new Set(["won", "lost", "warning_closed"]);

/**
 * A dispute (chargeback): Linda gets the alert and Money flags it until it closes; a lost one is recorded as a
 * `dispute` refund line (money returned, never counted towards net paid). The order's status never changes.
 */
export async function syncDispute(
  db: Db,
  gw: Pick<Gateway, "retrieveDispute">,
  disputeId: string,
  now = new Date(),
): Promise<"opened" | "closed" | "unchanged"> {
  const d = await gw.retrieveDispute(disputeId);
  const o = d.paymentIntentId
    ? await orderOfIntent(db, d.paymentIntentId)
    : null;
  const closed = CLOSED.has(d.status);
  const to = (await readSettings(db)).email;
  const number = o?.number ?? "no order";
  const [row] = await db
    .insert(disputes)
    .values({
      stripeDisputeId: d.id,
      paymentIntentId: d.paymentIntentId,
      orderId: o?.id ?? null,
      amountPence: d.amountPence,
      status: d.status,
      respondBy: d.respondBy,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning();
  let result: "opened" | "closed" | "unchanged" = "unchanged";
  if (row) {
    result = "opened";
    if (o)
      await db.insert(orderHistory).values({
        orderId: o.id,
        at: now,
        byName: "Stripe",
        what: `Payment disputed — ${money(d.amountPence)}${d.respondBy ? ` · respond in Stripe by ${d.respondBy}` : ""}`,
      });
    if (d.respondBy && !closed)
      await queueMail(
        db,
        {
          key: `alert:dispute-opened:${d.id}`,
          template: "alert",
          data: {
            kind: "dispute-opened",
            view: { number, respondBy: d.respondBy, today: londonDate(now) },
          },
          to,
        },
        now,
      );
  } else
    await db
      .update(disputes)
      .set({
        status: d.status,
        respondBy: d.respondBy,
        amountPence: d.amountPence,
      })
      .where(eq(disputes.stripeDisputeId, d.id));

  if (closed) {
    const [done] = await db
      .update(disputes)
      .set({ closedAt: now, status: d.status })
      .where(and(eq(disputes.stripeDisputeId, d.id), isNull(disputes.closedAt)))
      .returning();
    if (done) {
      result = "closed";
      const outcome = d.status === "lost" ? "lost" : "won";
      if (o && outcome === "lost") {
        await db.insert(refunds).values({
          orderId: o.id,
          kind: "dispute",
          amountPence: d.amountPence,
          paymentIntentId: d.paymentIntentId,
          status: "succeeded",
          createdAt: now,
        });
      }
      if (o)
        await db.insert(orderHistory).values({
          orderId: o.id,
          at: now,
          byName: "Stripe",
          what:
            outcome === "lost"
              ? `Dispute lost — the bank returned ${money(d.amountPence)} to the customer`
              : "Dispute closed — the money stays with you",
        });
      await queueMail(
        db,
        {
          key: `alert:dispute-closed:${d.id}`,
          template: "alert",
          data: { kind: "dispute-closed", view: { number, outcome } },
          to,
        },
        now,
      );
    }
  }
  return result;
}
