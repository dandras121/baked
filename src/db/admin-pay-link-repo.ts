// Send a payment link and Cancel this link from Order detail (§9.5, §9.8; Owner): HISTORY lines on top of the link itself.
import { and, eq, isNull, ne } from "drizzle-orm";
import {
  checkLinkAmount,
  sentLine,
  type LinkPurpose,
} from "@/lib/admin/pay-link";
import { formatAdminMoney } from "@/lib/money";
import type { Gateway } from "@/lib/payments";
import type { connect } from "./client";
import { missedAttempt } from "./missed-admin-repo";
import { moneyByOrder } from "./money-repo";
import { readSettings } from "./settings-repo";
import { createPayLink, withdrawPayLink } from "./pay-link-repo";
import { orderHistory, orders, paymentLinks } from "./schema";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;

export type SendResult =
  | { kind: "sent"; line: string }
  | { kind: "invalid"; error: string }
  | { kind: "closed" };

/**
 * The Redelivery link Record their choice offers (§9.5, §9.8): the latest missed delivery has a redelivery booked by
 * Linda, its fee is not paid and no Redelivery link is open yet. The fee is `ops/second-attempt-fee`.
 */
export async function redeliveryLinkDue(db: Db, o: Order) {
  if (o.status !== "confirmed") return null;
  const m = await missedAttempt(db, o.id);
  if (
    !m ||
    m.target.choice !== "redeliver" ||
    m.target.feePaidPence > 0 ||
    !m.next
  )
    return null;
  const [open] = await db
    .select({ id: paymentLinks.id })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.orderId, o.id),
        eq(paymentLinks.purpose, "redelivery"),
        eq(paymentLinks.status, "open"),
      ),
    );
  if (open) return null;
  return {
    attemptId: m.target.id,
    feePence: (await readSettings(db)).secondAttemptFeePence,
  };
}

export async function sendPayLink(
  db: Db,
  input: {
    orderId: number;
    purpose: LinkPurpose | "redelivery";
    amount: string;
    by: string;
  },
  now = new Date(),
): Promise<SendResult> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (!o || (o.status !== "confirmed" && o.status !== "completed"))
    return { kind: "closed" };
  // Redelivery: a fixed fee, not limited by still to pay (§9.8).
  if (input.purpose === "redelivery") {
    const r = await redeliveryLinkDue(db, o);
    if (!r) return { kind: "closed" };
    const sent = await createPayLink(
      db,
      {
        orderId: o.id,
        purpose: "redelivery",
        amountPence: r.feePence,
        attemptId: r.attemptId,
      },
      now,
    );
    if (sent.kind !== "sent") return { kind: "closed" };
    const line = sentLine(r.feePence, "redelivery");
    await db
      .insert(orderHistory)
      .values({ orderId: o.id, at: now, byName: input.by, what: line });
    return { kind: "sent", line };
  }
  const m = (await moneyByOrder(db, [o.id])).get(o.id);
  const due = m?.stillToPayPence ?? 0;
  if (due <= 0) return { kind: "closed" };
  const c = checkLinkAmount(input.amount, due);
  if (c.error !== null) return { kind: "invalid", error: c.error };
  const r = await createPayLink(
    db,
    { orderId: o.id, purpose: input.purpose, amountPence: c.pence },
    now,
  );
  if (r.kind !== "sent") return { kind: "closed" };
  const line = sentLine(c.pence, input.purpose);
  await db
    .insert(orderHistory)
    .values({ orderId: o.id, at: now, byName: input.by, what: line });
  return { kind: "sent", line };
}

/** Cancel this link (§9.5): it stops working at once; no e-mail. A waiting change's link goes with Cancel this change. */
export async function cancelPayLink(
  db: Db,
  gw: Pick<Gateway, "cancel"> | null,
  input: { linkId: number; by: string },
  now = new Date(),
): Promise<boolean> {
  const [l] = await db
    .select()
    .from(paymentLinks)
    .where(
      and(eq(paymentLinks.id, input.linkId), isNull(paymentLinks.changeId)),
    );
  if (!l || !(await withdrawPayLink(db, gw, l.id))) return false;
  await db.insert(orderHistory).values({
    orderId: l.orderId,
    at: now,
    byName: input.by,
    what: `Cancelled the payment link · ${formatAdminMoney(l.amountPence, "breakdown")}`,
  });
  return true;
}

/**
 * Still to pay fell (§9.8: Record a payment, a lowered manual total): every other open link worth more than what is
 * still to pay is withdrawn. A waiting change's link is the change's own and stays.
 */
export async function withdrawLinksAbove(
  db: Db,
  gw: Pick<Gateway, "cancel"> | null,
  orderId: number,
) {
  const m = (await moneyByOrder(db, [orderId])).get(orderId);
  const due = m?.stillToPayPence ?? 0;
  const open = await db
    .select()
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.orderId, orderId),
        eq(paymentLinks.status, "open"),
        isNull(paymentLinks.changeId),
        // A Redelivery link is the fee's own and stays (§10.6).
        ne(paymentLinks.purpose, "redelivery"),
      ),
    );
  let n = 0;
  for (const l of open)
    if (l.amountPence > due && (await withdrawPayLink(db, gw, l.id))) n++;
  return n;
}
