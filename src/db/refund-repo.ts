// Refunds (§10.6): money back to the card, recorded per Stripe refund. A failed call keeps its row as `failed`,
// raises “Refund failed — try again” for Linda (§8.3), and changes nothing else: the change or cancellation stays.
import { and, eq, gt, inArray, ne, sum } from "drizzle-orm";
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { orderChanges, orders, paymentLinks, refunds } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

/** What can still go back on each of the order's card payments, newest first. */
async function refundable(db: Db, o: typeof orders.$inferSelect) {
  const paid: { paymentIntentId: string; amount: number; at: number }[] = [];
  if (o.paymentIntentId)
    paid.push({
      paymentIntentId: o.paymentIntentId,
      amount: o.amountReceivedPence,
      at: o.confirmedAt.getTime(),
    });
  const changes = await db
    .select({
      pi: orderChanges.paymentIntentId,
      paid: orderChanges.paidPence,
      at: orderChanges.createdAt,
    })
    .from(orderChanges)
    .where(
      and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "saved")),
    )
    .orderBy(orderChanges.id);
  for (const c of changes)
    if (c.pi && c.paid > 0)
      paid.push({ paymentIntentId: c.pi, amount: c.paid, at: c.at.getTime() });
  // Paid payment links (§6.9) are card payments of the order too.
  const links = await db
    .select({
      pi: paymentLinks.paymentIntentId,
      paid: paymentLinks.paidPence,
      at: paymentLinks.paidAt,
    })
    .from(paymentLinks)
    .where(
      // Whatever Stripe took through a link counts, also through a withdrawn one (its refund nets it out).
      and(eq(paymentLinks.orderId, o.id), gt(paymentLinks.paidPence, 0)),
    );
  for (const l of links)
    if (l.pi && l.paid > 0)
      paid.push({
        paymentIntentId: l.pi,
        amount: l.paid,
        at: l.at?.getTime() ?? 0,
      });
  paid.sort((a, b) => a.at - b.at);
  const out: { paymentIntentId: string; left: number }[] = [];
  // Newest charge first (§6.6, §9.7): each refunded at most up to what is left of it.
  for (const p of paid.reverse()) {
    const [r] = await db
      .select({ n: sum(refunds.amountPence) })
      .from(refunds)
      .where(
        and(
          eq(refunds.paymentIntentId, p.paymentIntentId),
          inArray(refunds.status, ["pending", "succeeded"]),
        ),
      );
    out.push({
      paymentIntentId: p.paymentIntentId,
      left: p.amount - Number(r?.n ?? 0),
    });
  }
  return out;
}

/**
 * Net paid (§10.6): what the order received, its paid changes and paid payment links, less every refund that has not
 * failed (fees aside).
 */
export async function netPaid(db: Db, o: typeof orders.$inferSelect) {
  const [c] = await db
    .select({ n: sum(orderChanges.paidPence) })
    .from(orderChanges)
    .where(
      and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "saved")),
    );
  const [r] = await db
    .select({ n: sum(refunds.amountPence) })
    .from(refunds)
    .where(
      and(
        eq(refunds.orderId, o.id),
        inArray(refunds.status, ["pending", "succeeded"]),
        // A redelivery fee and its refund never count (§10.6).
        ne(refunds.kind, "fee"),
      ),
    );
  const [l] = await db
    .select({ n: sum(paymentLinks.paidPence) })
    .from(paymentLinks)
    .where(
      // Whatever Stripe took through a link counts, also through a withdrawn one (its refund nets it out).
      and(eq(paymentLinks.orderId, o.id), gt(paymentLinks.paidPence, 0)),
    );
  return (
    o.amountReceivedPence +
    Number(c?.n ?? 0) +
    Number(l?.n ?? 0) -
    Number(r?.n ?? 0)
  );
}

/**
 * Refunds `amountPence` on the order's payments. Each Stripe refund is recorded first (so a crash halfway is visible),
 * then its outcome. Returns whether all of it went through.
 */
export async function refundOrder(
  db: Db,
  gw: Pick<Gateway, "refund">,
  input: {
    orderId: number;
    amountPence: number;
    kind: "change" | "cancel" | "excess" | "goodwill";
    changeId?: number | null;
  },
  now = new Date(),
): Promise<{ ok: boolean }> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o || input.amountPence <= 0) return { ok: true };
  let left = input.amountPence;
  let ok = true;
  const payments = await refundable(db, o);
  for (const p of payments) {
    if (left <= 0) break;
    const take = Math.min(left, p.left);
    if (take <= 0) continue;
    const [row] = await db
      .insert(refunds)
      .values({
        orderId: o.id,
        changeId: input.changeId ?? null,
        kind: input.kind,
        amountPence: take,
        paymentIntentId: p.paymentIntentId,
        createdAt: now,
      })
      .returning({ id: refunds.id });
    const r = await gw.refund(p.paymentIntentId, take, `${o.id}-${row.id}`);
    if (r.ok) {
      await db
        .update(refunds)
        .set({ stripeRefundId: r.id, status: r.status })
        .where(eq(refunds.id, row.id));
      left -= take;
    } else {
      ok = false;
      await db
        .update(refunds)
        .set({ status: "failed", error: r.error })
        .where(eq(refunds.id, row.id));
      await refundFailedAlert(db, o.number, r.error, row.id, now);
    }
  }
  if (left > 0 && ok) {
    // Nothing left to refund on any payment (e.g. an order with no card payment): Linda sorts it by hand.
    ok = false;
    const [row] = await db
      .insert(refunds)
      .values({
        orderId: o.id,
        changeId: input.changeId ?? null,
        kind: input.kind,
        amountPence: left,
        paymentIntentId: o.paymentIntentId ?? "none",
        status: "failed",
        error: "No card payment left to refund",
        createdAt: now,
      })
      .returning({ id: refunds.id });
    await refundFailedAlert(
      db,
      o.number,
      "no card payment left to refund",
      row.id,
      now,
    );
  }
  return { ok };
}

async function refundFailedAlert(
  db: Db,
  number: string,
  reason: string,
  refundId: number,
  now: Date,
) {
  await queueMail(
    db,
    {
      key: `alert:refund-failed:${refundId}`,
      template: "alert",
      data: { kind: "refund-failed", view: { number, reason } },
      to: (await readSettings(db)).email,
    },
    now,
  );
}

/** Every refund line of an order, for the status page's money part (§6.3: “Refunded £… on {date}”). */
export const orderRefunds = (db: Db, orderId: number) =>
  db
    .select()
    .from(refunds)
    .where(eq(refunds.orderId, orderId))
    .orderBy(refunds.id);
