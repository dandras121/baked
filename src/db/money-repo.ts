// Money taken and still to pay (§10.6, §13): shared by Today's tiles (8.3) and the Money screen (8.8).
import { and, gt, gte, inArray, lt, ne, sql, sum } from "drizzle-orm";
import { londonInstant, type CalendarDate } from "@/lib/london-time";
import type { connect } from "./client";
import { netPaid } from "./refund-repo";
import { orderChanges, orders, paymentLinks, refunds } from "./schema";

type Db = ReturnType<typeof connect>["db"];

/**
 * Money taken between two London days (from inclusive, to exclusive): payments by their date (the checkout payment at
 * confirmation, paid changes, paid links) less refunds by theirs; a redelivery fee and its refund never count (§10.6).
 */
export async function moneyTaken(db: Db, from: CalendarDate, to: CalendarDate) {
  const a = londonInstant(from, 0);
  const b = londonInstant(to, 0);
  const [o] = await db
    .select({ n: sum(orders.amountReceivedPence) })
    .from(orders)
    .where(and(gte(orders.confirmedAt, a), lt(orders.confirmedAt, b)));
  const [c] = await db
    .select({ n: sum(orderChanges.paidPence) })
    .from(orderChanges)
    .where(
      and(
        sql`${orderChanges.status} = 'saved'`,
        gte(orderChanges.createdAt, a),
        lt(orderChanges.createdAt, b),
      ),
    );
  const [l] = await db
    .select({ n: sum(paymentLinks.paidPence) })
    .from(paymentLinks)
    .where(
      and(
        gt(paymentLinks.paidPence, 0),
        gte(paymentLinks.paidAt, a),
        lt(paymentLinks.paidAt, b),
      ),
    );
  const [r] = await db
    .select({ n: sum(refunds.amountPence) })
    .from(refunds)
    .where(
      and(
        inArray(refunds.status, ["pending", "succeeded"]),
        ne(refunds.kind, "fee"),
        gte(refunds.createdAt, a),
        lt(refunds.createdAt, b),
      ),
    );
  return (
    Number(o?.n ?? 0) +
    Number(c?.n ?? 0) +
    Number(l?.n ?? 0) -
    Number(r?.n ?? 0)
  );
}

/**
 * Still to pay of many orders at once (§10.6): the same sums as netPaid — paid changes, paid links, refunds that have
 * not failed (fees aside) — in four grouped queries, so a list never asks the database once per order.
 */
export async function stillToPayByOrder(
  db: Db,
  only: number[] | null = null,
): Promise<Map<number, number>> {
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
  const [changes, links, back] = await Promise.all([
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
      .select({ id: refunds.orderId, n: sum(refunds.amountPence) })
      .from(refunds)
      .where(
        and(
          inArray(refunds.orderId, ids),
          inArray(refunds.status, ["pending", "succeeded"]),
          ne(refunds.kind, "fee"),
        ),
      )
      .groupBy(refunds.orderId),
  ]);
  const by = (rows: { id: number | null; n: string | null }[]) =>
    new Map(rows.map((r) => [r.id ?? 0, Number(r.n ?? 0)]));
  const c = by(changes);
  const l = by(links);
  const r = by(back);
  return new Map(
    live.map((o) => [
      o.id,
      Math.max(
        0,
        o.total -
          (o.received +
            (c.get(o.id) ?? 0) +
            (l.get(o.id) ?? 0) -
            (r.get(o.id) ?? 0)),
      ),
    ]),
  );
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
