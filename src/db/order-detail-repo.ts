// Order detail (§9.5): everything the screen shows, in one read — the order, its cakes, delivery attempts, payments,
// refunds, open links, messages, complaints and HISTORY.
import { and, asc, eq, isNull } from "drizzle-orm";
import { memberChange } from "@/lib/admin/versions";
import type { connect } from "./client";
import { moneyByOrder } from "./money-repo";
import {
  complaints,
  deliveryAttempts,
  handPayments,
  orderChanges,
  orderHistory,
  orderLines,
  orderMessages,
  orders,
  paymentLinks,
  refunds,
} from "./schema";

type Db = ReturnType<typeof connect>["db"];

export async function orderDetail(db: Db, number: string) {
  const [o] = await db.select().from(orders).where(eq(orders.number, number));
  if (!o) return null;
  const [
    lines,
    attempts,
    changes,
    links,
    back,
    messages,
    notes,
    history,
    money,
    hand,
  ] = await Promise.all([
    db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(asc(orderLines.position)),
    db
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.orderId, o.id))
      .orderBy(asc(deliveryAttempts.attempt)),
    db
      .select()
      .from(orderChanges)
      .where(
        and(eq(orderChanges.orderId, o.id), eq(orderChanges.status, "saved")),
      )
      .orderBy(asc(orderChanges.id)),
    db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.orderId, o.id))
      .orderBy(asc(paymentLinks.id)),
    db
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, o.id))
      .orderBy(asc(refunds.id)),
    db
      .select()
      .from(orderMessages)
      .where(eq(orderMessages.orderId, o.id))
      .orderBy(asc(orderMessages.createdAt)),
    db
      .select()
      .from(complaints)
      .where(eq(complaints.orderId, o.id))
      .orderBy(asc(complaints.createdAt)),
    db
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, o.id))
      .orderBy(asc(orderHistory.at), asc(orderHistory.id)),
    moneyByOrder(db, [o.id]),
    db
      .select()
      .from(handPayments)
      .where(
        and(eq(handPayments.orderId, o.id), isNull(handPayments.removedAt)),
      )
      .orderBy(asc(handPayments.paidOn), asc(handPayments.id)),
  ]);
  const m = money.get(o.id);
  // Removed between the reads (e.g. deleted at the same moment): as if it never existed.
  if (!m) return null;
  return {
    order: o,
    lines,
    attempts,
    changes,
    links,
    refunds: back,
    messages,
    complaints: notes,
    history,
    money: m,
    hand,
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof orderDetail>>>;

/** Collection time (§9.5, Decided D9): free text up to 40, saved on blur; last save wins; empty = “Agreed with Linda”. */
export async function saveCollectionTime(
  db: Db,
  orderId: number,
  raw: string,
  by: string,
  now = new Date(),
) {
  const time = raw.trim().replace(/\s+/g, " ").slice(0, 40) || null;
  const [o] = await db
    .select({ time: orders.collectionTime, handover: orders.handover })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!o || o.handover !== "collection")
    return { kind: "not-collection" } as const;
  if ((o.time ?? null) === time) return { kind: "same", time } as const;
  await db
    .update(orders)
    .set({ collectionTime: time, changedBy: memberChange(by), changedAt: now })
    .where(eq(orders.id, orderId));
  await db.insert(orderHistory).values({
    orderId,
    at: now,
    byName: by,
    what: time ? `Collection time set to “${time}”` : "Collection time cleared",
  });
  return { kind: "saved", time } as const;
}
