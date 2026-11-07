// Refunds (§10.6): money back to the card, recorded per Stripe refund. A failed call keeps its row as `failed`,
// raises “Refund failed — try again” for Linda (§8.3), and changes nothing else: the change or cancellation stays.
import { and, eq, inArray, sum } from "drizzle-orm";
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { orders, refunds } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];

/** What can still go back on each of the order's payments (the checkout payment; change payments come in 6.2c). */
async function refundable(db: Db, o: typeof orders.$inferSelect) {
  if (!o.paymentIntentId) return [];
  const [r] = await db
    .select({ n: sum(refunds.amountPence) })
    .from(refunds)
    .where(
      and(
        eq(refunds.paymentIntentId, o.paymentIntentId),
        inArray(refunds.status, ["pending", "succeeded"]),
      ),
    );
  return [
    {
      paymentIntentId: o.paymentIntentId,
      left: o.amountReceivedPence - Number(r?.n ?? 0),
    },
  ];
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
