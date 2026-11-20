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

/** Still to pay of one order (§10.6): never below 0. */
export async function stillToPay(db: Db, o: typeof orders.$inferSelect) {
  return Math.max(0, o.totalPence - (await netPaid(db, o)));
}

/** Σ still to pay over confirmed and completed orders (§13). */
export async function stillToPayAll(db: Db) {
  const live = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, ["confirmed", "completed"]));
  let n = 0;
  for (const o of live) n += await stillToPay(db, o);
  return n;
}
