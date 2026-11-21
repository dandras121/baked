// Money taken and still to pay (§10.6, §13): shared by Today's tiles (8.3) and the Money screen (8.8).
import {
  and,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import { londonInstant, type CalendarDate } from "@/lib/london-time";
import type { connect } from "./client";
import { netPaid } from "./refund-repo";
import {
  handPayments,
  orderChanges,
  orders,
  paymentLinks,
  refunds,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];

/**
 * Money taken between two London days (from inclusive, to exclusive): payments by their date (the checkout payment at
 * confirmation, paid changes, paid links) less refunds by theirs; a redelivery fee and its refund never count (§10.6).
 */
export async function moneyTaken(db: Db, from: CalendarDate, to: CalendarDate) {
  const a = londonInstant(from, 0);
  const b = londonInstant(to, 0);
  const [[o], [c], [l], [r], hand] = await Promise.all([
    db
      .select({ n: sum(orders.amountReceivedPence) })
      .from(orders)
      .where(and(gte(orders.confirmedAt, a), lt(orders.confirmedAt, b))),
    db
      .select({ n: sum(orderChanges.paidPence) })
      .from(orderChanges)
      .where(
        and(
          sql`${orderChanges.status} = 'saved'`,
          gte(orderChanges.createdAt, a),
          lt(orderChanges.createdAt, b),
        ),
      ),
    db
      .select({ n: sum(paymentLinks.paidPence) })
      .from(paymentLinks)
      .where(
        and(
          gt(paymentLinks.paidPence, 0),
          gte(paymentLinks.paidAt, a),
          lt(paymentLinks.paidAt, b),
        ),
      ),
    db
      .select({ n: sum(refunds.amountPence) })
      .from(refunds)
      .where(
        and(
          inArray(refunds.status, ["pending", "succeeded"]),
          ne(refunds.kind, "fee"),
          gte(refunds.createdAt, a),
          lt(refunds.createdAt, b),
        ),
      ),
    // Money by hand counts on the day it was paid or given back (§10.6).
    db
      .select({ kind: handPayments.kind, n: sum(handPayments.amountPence) })
      .from(handPayments)
      .where(
        and(
          isNull(handPayments.removedAt),
          gte(handPayments.paidOn, from),
          lt(handPayments.paidOn, to),
        ),
      )
      .groupBy(handPayments.kind),
  ]);
  const byHand = hand.reduce(
    (t, h) => t + (h.kind === "refund" ? -1 : 1) * Number(h.n ?? 0),
    0,
  );
  return (
    Number(o?.n ?? 0) +
    Number(c?.n ?? 0) +
    Number(l?.n ?? 0) -
    Number(r?.n ?? 0) +
    byHand
  );
}

export type OrderMoney = {
  totalPence: number;
  /** What has come in, less refunds that have not failed (fees aside) — the same sum as netPaid. */
  netPaidPence: number;
  /** Refunds that went through (fees aside). */
  refundedPence: number;
  /** A refund Stripe has not confirmed yet. */
  refundPending: boolean;
  stillToPayPence: number;
};

/**
 * The money of many orders at once (§10.6): paid changes, paid links, refunds that have not failed (fees aside) — in
 * four grouped queries, so a list never asks the database once per order. `only` null = confirmed and completed.
 */
export async function moneyByOrder(
  db: Db,
  only: number[] | null = null,
): Promise<Map<number, OrderMoney>> {
  if (only && only.length === 0) return new Map();
  const live = await db
    .select({
      id: orders.id,
      total: orders.totalPence,
      received: orders.amountReceivedPence,
    })
    .from(orders)
    .where(
      only
        ? inArray(orders.id, only)
        : inArray(orders.status, ["confirmed", "completed"]),
    );
  const ids = live.map((o) => o.id);
  if (!ids.length) return new Map();
  const [changes, links, back, hand] = await Promise.all([
    db
      .select({ id: orderChanges.orderId, n: sum(orderChanges.paidPence) })
      .from(orderChanges)
      .where(
        and(
          inArray(orderChanges.orderId, ids),
          sql`${orderChanges.status} = 'saved'`,
        ),
      )
      .groupBy(orderChanges.orderId),
    db
      .select({ id: paymentLinks.orderId, n: sum(paymentLinks.paidPence) })
      .from(paymentLinks)
      .where(
        and(inArray(paymentLinks.orderId, ids), gt(paymentLinks.paidPence, 0)),
      )
      .groupBy(paymentLinks.orderId),
    db
      .select({
        id: refunds.orderId,
        status: refunds.status,
        n: sum(refunds.amountPence),
      })
      .from(refunds)
      .where(
        and(
          inArray(refunds.orderId, ids),
          inArray(refunds.status, ["pending", "succeeded"]),
          ne(refunds.kind, "fee"),
        ),
      )
      .groupBy(refunds.orderId, refunds.status),
    db
      .select({
        id: handPayments.orderId,
        kind: handPayments.kind,
        n: sum(handPayments.amountPence),
      })
      .from(handPayments)
      .where(
        and(inArray(handPayments.orderId, ids), isNull(handPayments.removedAt)),
      )
      .groupBy(handPayments.orderId, handPayments.kind),
  ]);
  const byHand = new Map<number, number>();
  for (const h of hand)
    byHand.set(
      h.id,
      (byHand.get(h.id) ?? 0) +
        (h.kind === "refund" ? -1 : 1) * Number(h.n ?? 0),
    );
  const by = (rows: { id: number | null; n: string | null }[]) => {
    const m = new Map<number, number>();
    for (const r of rows)
      m.set(r.id ?? 0, (m.get(r.id ?? 0) ?? 0) + Number(r.n ?? 0));
    return m;
  };
  const c = by(changes);
  const l = by(links);
  const r = by(back);
  const done = by(back.filter((x) => x.status === "succeeded"));
  const pending = new Set(
    back.filter((x) => x.status === "pending").map((x) => x.id),
  );
  return new Map(
    live.map((o) => {
      const net =
        o.received +
        (c.get(o.id) ?? 0) +
        (l.get(o.id) ?? 0) -
        (r.get(o.id) ?? 0) +
        (byHand.get(o.id) ?? 0);
      return [
        o.id,
        {
          totalPence: o.total,
          netPaidPence: net,
          refundedPence: done.get(o.id) ?? 0,
          refundPending: pending.has(o.id),
          stillToPayPence: Math.max(0, o.total - net),
        },
      ];
    }),
  );
}

/** Still to pay of many orders at once (§10.6): never below 0. */
export async function stillToPayByOrder(
  db: Db,
  only: number[] | null = null,
): Promise<Map<number, number>> {
  const m = await moneyByOrder(db, only);
  return new Map([...m].map(([id, v]) => [id, v.stillToPayPence]));
}

/** Still to pay of one order (§10.6): never below 0. */
export async function stillToPay(db: Db, o: typeof orders.$inferSelect) {
  return Math.max(0, o.totalPence - (await netPaid(db, o)));
}

/** Σ still to pay over confirmed and completed orders (§13). */
export async function stillToPayAll(db: Db) {
  let n = 0;
  for (const v of (await stillToPayByOrder(db)).values()) n += v;
  return n;
}
