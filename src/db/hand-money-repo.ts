// Money by hand on Order detail (§9.5, Owner): Record a payment, Remove a by-hand payment line, Record a refund given
// back. No e-mail goes for any of them (§8.6). HISTORY keeps every line, also a removed one.
import { and, eq, isNull, sum } from "drizzle-orm";
import { METHOD, type HandValue } from "@/lib/admin/hand-money";
import { dayMonth } from "@/lib/admin/order-detail";
import { formatAdminMoney } from "@/lib/money";
import type { Gateway } from "@/lib/payments";
import { withdrawLinksAbove } from "./admin-pay-link-repo";
import { settleCancellation } from "./cancel-repo";
import type { connect } from "./client";
import { moneyByOrder } from "./money-repo";
import { netPaid } from "./refund-repo";
import { handPayments, orderHistory, orders } from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;
const money = (p: number) => formatAdminMoney(p, "breakdown");
const ended = (o: Order) => o.status === "cancelled" || o.status === "refunded";

/**
 * The by-hand part still to give back (§9.5): a cancellation's by-hand part less what was recorded, or — on a live
 * order whose total was lowered below what was paid (§9.7) — what was paid above the total.
 */
export async function handToGiveBack(db: Db, o: Order): Promise<number> {
  if (ended(o)) {
    const part =
      (o.cancellation as { handPence?: number } | null)?.handPence ?? 0;
    const [g] = await db
      .select({ n: sum(handPayments.amountPence) })
      .from(handPayments)
      .where(
        and(
          eq(handPayments.orderId, o.id),
          eq(handPayments.kind, "refund"),
          isNull(handPayments.removedAt),
        ),
      );
    return Math.max(0, part - Number(g?.n ?? 0));
  }
  return Math.max(0, (await netPaid(db, o)) - o.totalPence);
}

export type HandResult =
  | { kind: "saved" }
  | { kind: "too-much"; maxPence: number }
  | { kind: "closed" };

/** Record a payment (while still to pay > 0): a payment line; open links above the new still to pay are withdrawn. */
export async function recordHandPayment(
  db: Db,
  gw: Pick<Gateway, "cancel"> | null,
  input: { orderId: number; value: HandValue; by: string },
  now = new Date(),
): Promise<HandResult> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o || ended(o)) return { kind: "closed" };
  const due = (await moneyByOrder(db, [o.id])).get(o.id)?.stillToPayPence ?? 0;
  if (input.value.pence > due)
    return due > 0 ? { kind: "too-much", maxPence: due } : { kind: "closed" };
  await db.insert(handPayments).values({
    orderId: o.id,
    kind: "payment",
    method: input.value.method,
    amountPence: input.value.pence,
    paidOn: input.value.date,
    byName: input.by,
    createdAt: now,
  });
  await db.insert(orderHistory).values({
    orderId: o.id,
    at: now,
    byName: input.by,
    what: `Recorded a payment · ${METHOD[input.value.method]} ${money(input.value.pence)} · ${dayMonth(input.value.date)}`,
  });
  await withdrawLinksAbove(db, gw, o.id);
  return { kind: "saved" };
}

/** Remove (a mistake): the line stops counting and still to pay goes back up; it stays in HISTORY. */
export async function removeHandPayment(
  db: Db,
  input: { lineId: number; by: string },
  now = new Date(),
): Promise<{ kind: "saved" | "closed" }> {
  const [l] = await db
    .select()
    .from(handPayments)
    .where(eq(handPayments.id, input.lineId));
  if (!l || l.kind !== "payment" || l.removedAt) return { kind: "closed" };
  const [o] = await db.select().from(orders).where(eq(orders.id, l.orderId));
  if (!o || ended(o)) return { kind: "closed" };
  const [gone] = await db
    .update(handPayments)
    .set({ removedAt: now })
    .where(and(eq(handPayments.id, l.id), isNull(handPayments.removedAt)))
    .returning();
  if (!gone) return { kind: "closed" };
  await db.insert(orderHistory).values({
    orderId: o.id,
    at: now,
    byName: input.by,
    what: `Removed the ${money(l.amountPence)} ${l.method === "cash" ? "cash" : "bank transfer"} payment of ${dayMonth(String(l.paidOn))}`,
  });
  return { kind: "saved" };
}

/** Record a refund given back: a negative line of the same kind; on a cancelled order it counts toward `refunded`. */
export async function recordHandRefund(
  db: Db,
  input: { orderId: number; value: HandValue; by: string },
  now = new Date(),
): Promise<HandResult> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o) return { kind: "closed" };
  const open = await handToGiveBack(db, o);
  if (open <= 0) return { kind: "closed" };
  if (input.value.pence > open) return { kind: "too-much", maxPence: open };
  await db.insert(handPayments).values({
    orderId: o.id,
    kind: "refund",
    method: input.value.method,
    amountPence: input.value.pence,
    paidOn: input.value.date,
    byName: input.by,
    createdAt: now,
  });
  await db.insert(orderHistory).values({
    orderId: o.id,
    at: now,
    byName: input.by,
    what: `Recorded a refund given back · ${METHOD[input.value.method]} ${money(input.value.pence)} · ${dayMonth(input.value.date)}`,
  });
  if (o.status === "cancelled") await settleCancellation(db, o.id);
  return { kind: "saved" };
}
