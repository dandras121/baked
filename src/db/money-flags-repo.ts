// Money flags (§9.9): what needs Linda — a Stripe payment with no order, a refund that failed, a booking that landed
// after its hold ran out, a £15 redelivery to refund, money to give back by hand. Each clears by its own action (or by
// itself, e.g. once the by-hand part is recorded). Disputes come with the Stripe dispute events (8.8c).
import { and, desc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";
import { formatAdminMoney } from "@/lib/money";
import { londonDate, type CalendarDate } from "@/lib/london-time";
import type { Gateway } from "@/lib/payments";
import { settleCancellation } from "./cancel-repo";
import type { connect } from "./client";
import { refundFee } from "./delivery-repo";
import { handToGiveBack } from "./hand-money-repo";
import { moneyByOrder } from "./money-repo";
import {
  deliveryAttempts,
  disputes,
  orderHistory,
  orders,
  paymentAlerts,
  refunds,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];
const money = (p: number) => formatAdminMoney(p, "breakdown");

export type MoneyFlags = {
  noOrder: {
    id: number;
    paymentIntentId: string;
    pence: number | null;
    on: CalendarDate;
  }[];
  refundFailed: {
    id: number;
    number: string;
    name: string;
    pence: number;
    error: string | null;
    on: CalendarDate;
  }[];
  checkDay: {
    orderId: number;
    number: string;
    name: string;
    date: CalendarDate;
  }[];
  feeToRefund: {
    attemptId: number;
    number: string;
    name: string;
    pence: number;
  }[];
  handBack: { orderId: number; number: string; name: string; pence: number }[];
  /** Open disputes (§10.6): until Stripe closes them. */
  disputed: {
    id: string;
    number: string | null;
    name: string | null;
    pence: number;
    respondBy: CalendarDate | null;
  }[];
};

/** Older alerts kept the amount only in their words (“Stripe payment of 6400p has no order”). */
const penceOf = (a: { amountPence: number | null; detail: string }) =>
  a.amountPence ?? (Number(/of (\d+)p/.exec(a.detail)?.[1]) || null);

export async function moneyFlags(
  db: Db,
  now = new Date(),
): Promise<MoneyFlags> {
  const today = londonDate(now);
  const [alerts, failed, check, fees, ended, live, open] = await Promise.all([
    db
      .select()
      .from(paymentAlerts)
      .where(
        and(
          eq(paymentAlerts.kind, "no-order"),
          isNull(paymentAlerts.dismissedAt),
        ),
      )
      .orderBy(desc(paymentAlerts.createdAt)),
    db
      .select({ r: refunds, number: orders.number, name: orders.customerName })
      .from(refunds)
      .innerJoin(orders, eq(orders.id, refunds.orderId))
      .where(eq(refunds.status, "failed"))
      .orderBy(desc(refunds.createdAt)),
    db
      .select({
        id: orders.id,
        number: orders.number,
        name: orders.customerName,
        date: orders.date,
      })
      .from(orders)
      .where(
        and(
          eq(orders.checkDay, true),
          gte(orders.date, today),
          inArray(orders.status, ["confirmed", "completed"]),
        ),
      )
      .orderBy(orders.date),
    db
      .select({
        a: deliveryAttempts,
        number: orders.number,
        name: orders.customerName,
      })
      .from(deliveryAttempts)
      .innerJoin(orders, eq(orders.id, deliveryAttempts.orderId))
      .where(
        and(
          eq(deliveryAttempts.feeRefundDue, true),
          gt(deliveryAttempts.feePaidPence, 0),
        ),
      ),
    // A cancellation with a by-hand part (§9.5).
    db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.status, ["cancelled", "refunded"]),
          sql`coalesce((${orders.cancellation} ->> 'handPence')::int, 0) > 0`,
        ),
      ),
    moneyByOrder(db),
    db
      .select({ d: disputes, number: orders.number, name: orders.customerName })
      .from(disputes)
      .leftJoin(orders, eq(orders.id, disputes.orderId))
      .where(isNull(disputes.closedAt))
      .orderBy(disputes.respondBy),
  ]);

  // A live order paid above its total (a lowered manual total, §9.7).
  const over = [...live]
    .filter(([, m]) => m.netPaidPence > m.totalPence)
    .map(([id]) => id);
  const overOrders = over.length
    ? await db.select().from(orders).where(inArray(orders.id, over))
    : [];
  const handBack: MoneyFlags["handBack"] = [];
  for (const o of [...ended, ...overOrders]) {
    const pence = await handToGiveBack(db, o);
    if (pence > 0)
      handBack.push({
        orderId: o.id,
        number: o.number,
        name: o.customerName,
        pence,
      });
  }

  return {
    noOrder: alerts.map((a) => ({
      id: a.id,
      paymentIntentId: a.paymentIntentId,
      pence: penceOf(a),
      on: londonDate(a.createdAt),
    })),
    refundFailed: failed.map(({ r, number, name }) => ({
      id: r.id,
      number,
      name,
      pence: r.amountPence,
      error: r.error,
      on: londonDate(r.createdAt),
    })),
    checkDay: check.map((o) => ({
      orderId: o.id,
      number: o.number,
      name: o.name,
      date: String(o.date),
    })),
    feeToRefund: fees.map(({ a, number, name }) => ({
      attemptId: a.id,
      number,
      name,
      pence: a.feePaidPence,
    })),
    handBack: handBack.sort((a, b) => a.number.localeCompare(b.number)),
    disputed: open.map(({ d, number, name }) => ({
      id: d.stripeDisputeId,
      number,
      name,
      pence: d.amountPence,
      respondBy: d.respondBy === null ? null : String(d.respondBy),
    })),
  };
}

/** Dismiss (Stripe payment has no order): the flag goes; nothing is refunded. */
export async function dismissNoOrder(
  db: Db,
  alertId: number,
  by: string,
  now = new Date(),
) {
  const [a] = await db
    .update(paymentAlerts)
    .set({ dismissedAt: now, dismissedBy: by })
    .where(
      and(eq(paymentAlerts.id, alertId), isNull(paymentAlerts.dismissedAt)),
    )
    .returning({ id: paymentAlerts.id });
  return !!a;
}

/** Try again (Refund failed): the same refund with the same idempotency key; it clears when Stripe takes it. */
export async function retryRefund(
  db: Db,
  gw: Pick<Gateway, "refund">,
  refundId: number,
  by: string,
  now = new Date(),
): Promise<"refunded" | "failed" | "gone"> {
  const [r] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!r || r.status !== "failed") return "gone";
  const key =
    r.idempotencyKey ??
    (r.kind === "fee" ? `fee-${r.id}` : `${r.orderId}-${r.id}`);
  const res = await gw.refund(r.paymentIntentId, r.amountPence, key);
  await db
    .update(refunds)
    .set(
      res.ok
        ? {
            stripeRefundId: res.id,
            status: res.status,
            error: null,
            idempotencyKey: key,
          }
        : { error: res.error, idempotencyKey: key },
    )
    .where(eq(refunds.id, r.id));
  await db.insert(orderHistory).values({
    orderId: r.orderId,
    at: now,
    byName: by,
    what: `Tried the ${money(r.amountPence)} refund again — ${res.ok ? "it went through" : "it failed again"}`,
  });
  if (res.ok && r.kind === "cancel") await settleCancellation(db, r.orderId);
  return res.ok ? "refunded" : "failed";
}

/** Refund £15 (a Helper's Delivered after all on a paid redelivery, §9.5): a `fee` refund; the flag clears. */
export async function refundDueFee(
  db: Db,
  gw: Pick<Gateway, "refund">,
  attemptId: number,
  by: string,
  now = new Date(),
): Promise<"refunded" | "failed" | "gone"> {
  const [a] = await db
    .select()
    .from(deliveryAttempts)
    .where(eq(deliveryAttempts.id, attemptId));
  if (!a || !a.feeRefundDue || a.feePaidPence <= 0 || !a.paymentIntentId)
    return "gone";
  const r = await refundFee(
    db,
    gw,
    a.orderId,
    a.paymentIntentId,
    a.feePaidPence,
    now,
  );
  // A failed refund now shows as “Refund failed — try again”; this flag has done its part.
  await db
    .update(deliveryAttempts)
    .set({ feeRefundDue: false })
    .where(eq(deliveryAttempts.id, a.id));
  await db.insert(orderHistory).values({
    orderId: a.orderId,
    at: now,
    byName: by,
    what: `Refunded the ${money(a.feePaidPence)} redelivery fee${r === "failed" ? " — it failed, try again on Money" : ""}`,
  });
  return r === "failed" ? "failed" : "refunded";
}

/** Dismiss (£15 redelivery to refund): “Keep the £15? Nothing is refunded.” */
export async function keepDueFee(
  db: Db,
  attemptId: number,
  by: string,
  now = new Date(),
) {
  const [a] = await db
    .update(deliveryAttempts)
    .set({ feeRefundDue: false })
    .where(
      and(
        eq(deliveryAttempts.id, attemptId),
        eq(deliveryAttempts.feeRefundDue, true),
      ),
    )
    .returning();
  if (!a) return false;
  await db.insert(orderHistory).values({
    orderId: a.orderId,
    at: now,
    byName: by,
    what: `Kept the ${money(a.feePaidPence)} redelivery fee — nothing refunded`,
  });
  return true;
}
