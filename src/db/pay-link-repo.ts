// Payment links (§6.9, §9.8, §10.5): Linda sends one (e-mail 15), the customer pays it at `/pay/[token]`. Paid is
// recorded only when Stripe says so (the page, the webhook or the reconciliation job). Money above the total goes
// back at once; other open links worth more than what is still to pay are withdrawn.
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { addDays, londonDate, type CalendarDate } from "@/lib/london-time";
import type { PayView } from "@/lib/mail/after-emails";
import type { Gateway, Intent } from "@/lib/payments";
import type { connect } from "./client";
import { queueMail } from "./mail-repo";
import { netPaid, refundOrder } from "./refund-repo";
import { orderLines, orders, paymentLinks, refunds } from "./schema";
import { readSettings } from "./settings-repo";

type Db = ReturnType<typeof connect>["db"];
type Order = typeof orders.$inferSelect;
type Link = typeof paymentLinks.$inferSelect;

export const PAY_PURPOSES = ["deposit", "rest", "difference"] as const;
export type PayPurpose = (typeof PAY_PURPOSES)[number];

/** Valid until 23:59 on the 30th day after the order's date or after the day it was sent, whichever is later. */
export const payLinkValidUntil = (date: CalendarDate, sentOn: CalendarDate) => {
  const a = addDays(date, 30);
  const b = addDays(sentOn, 30);
  return a > b ? a : b;
};

/** Checked in this order (§6.9): paid first, then withdrawn, the order cancelled, or expired. */
export function payLinkState(
  l: Pick<Link, "status" | "sentOn">,
  o: Pick<Order, "status" | "date">,
  today: CalendarDate,
): "paid" | "gone" | "open" {
  if (l.status === "paid") return "paid";
  if (l.status === "withdrawn") return "gone";
  if (o.status === "cancelled" || o.status === "refunded") return "gone";
  if (today > payLinkValidUntil(String(o.date), String(l.sentOn)))
    return "gone";
  return "open";
}

export async function payLinkByToken(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [r] = await db
    .select({ link: paymentLinks, order: orders })
    .from(paymentLinks)
    .innerJoin(orders, eq(orders.id, paymentLinks.orderId))
    .where(eq(paymentLinks.token, token));
  return r ?? null;
}

const cakesOf = async (db: Db, orderId: number) =>
  (
    await db
      .select({ name: orderLines.name })
      .from(orderLines)
      .where(eq(orderLines.orderId, orderId))
      .orderBy(orderLines.position)
  )
    .map((l) => l.name)
    .join(", ");

/** Send a payment link (§9.8; played from /dev/orders until the admin): the link and e-mail 15. */
export async function createPayLink(
  db: Db,
  input: { orderId: number; purpose: PayPurpose; amountPence: number },
  now = new Date(),
): Promise<{ kind: "sent"; token: string } | { kind: "invalid" }> {
  const [o] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId));
  if (
    !o ||
    !PAY_PURPOSES.includes(input.purpose) ||
    !Number.isInteger(input.amountPence) ||
    input.amountPence < 30 ||
    o.status === "cancelled" ||
    o.status === "refunded"
  )
    return { kind: "invalid" };
  const today = londonDate(now);
  const token = randomBytes(24).toString("base64url");
  const [l] = await db
    .insert(paymentLinks)
    .values({
      orderId: o.id,
      token,
      purpose: input.purpose,
      amountPence: input.amountPence,
      sentOn: today,
      createdAt: now,
    })
    .returning();
  const view: PayView = {
    kind: input.purpose,
    number: o.number,
    linkToken: token,
    date: String(o.date),
    today,
    whatItIs: await cakesOf(db, o.id),
    totalPence: o.totalPence,
    paidPence: await netPaid(db, o),
    toPayPence: input.amountPence,
    confirmationFollows: true,
  };
  // E-mail 15 goes also with customer e-mails off (§8.2).
  await queueMail(
    db,
    {
      key: `pay:${l.id}`,
      template: "pay-link",
      data: { view },
      to: o.email,
    },
    now,
  );
  return { kind: "sent", token };
}

/** Pay £… (§6.9): one PaymentIntent per link, reused on every press. */
export async function preparePayLink(
  db: Db,
  gw: Pick<Gateway, "createForPayLink">,
  token: string,
  now = new Date(),
): Promise<
  | { kind: "pay"; clientSecret: string; amountPence: number; linkId: number }
  | { kind: "paid" }
  | { kind: "gone" }
> {
  const found = await payLinkByToken(db, token);
  if (!found) return { kind: "gone" };
  const state = payLinkState(found.link, found.order, londonDate(now));
  if (state !== "open") return { kind: state };
  const intent = await gw.createForPayLink(
    found.link.id,
    found.order.number,
    found.link.amountPence,
  );
  if (found.link.paymentIntentId !== intent.id)
    await db
      .update(paymentLinks)
      .set({ paymentIntentId: intent.id })
      .where(eq(paymentLinks.id, found.link.id));
  return {
    kind: "pay",
    clientSecret: intent.clientSecret,
    amountPence: found.link.amountPence,
    linkId: found.link.id,
  };
}

/** Withdraw a link (Linda's Cancel this link, §9.5): it stops working and its payment cannot go through. */
export async function withdrawPayLink(
  db: Db,
  gw: Pick<Gateway, "cancel"> | null,
  linkId: number,
) {
  const [l] = await db
    .update(paymentLinks)
    .set({ status: "withdrawn" })
    .where(and(eq(paymentLinks.id, linkId), eq(paymentLinks.status, "open")))
    .returning();
  if (l?.paymentIntentId && gw) await gw.cancel(l.paymentIntentId);
  return !!l;
}

/**
 * A payment link Stripe says succeeded (§6.9): recorded once; Linda is told. A payment through a withdrawn link or on a
 * cancelled order goes back in full; above the total, the excess goes back (§10.6 Stray payments). Then every other
 * open link worth more than what is still to pay is withdrawn (§9.8).
 */
export async function applyPayLink(
  db: Db,
  gw: Pick<Gateway, "refund" | "cancel">,
  intent: Intent,
  now = new Date(),
): Promise<"paid" | "already" | "refunded" | "nothing"> {
  if (intent.kind !== "payment_link" || intent.status !== "succeeded")
    return "nothing";
  const [l] = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.paymentIntentId, intent.id));
  if (!l) return "nothing";
  if (l.status === "paid") return "already";
  const [o] = await db.select().from(orders).where(eq(orders.id, l.orderId));
  const s = await readSettings(db);
  if (
    l.status === "withdrawn" ||
    o.status === "cancelled" ||
    o.status === "refunded"
  ) {
    const [done] = await db
      .select({ id: refunds.id })
      .from(refunds)
      .where(eq(refunds.paymentIntentId, intent.id));
    if (done) return "already";
    // What Stripe took is recorded on the link, so the payment and its refund net out (§10.6).
    await db
      .update(paymentLinks)
      .set({ paidPence: intent.amountReceivedPence, paidAt: now })
      .where(eq(paymentLinks.id, l.id));
    const [row] = await db
      .insert(refunds)
      .values({
        orderId: o.id,
        kind: "excess",
        amountPence: intent.amountReceivedPence,
        paymentIntentId: intent.id,
        createdAt: now,
      })
      .returning({ id: refunds.id });
    const r = await gw.refund(
      intent.id,
      intent.amountReceivedPence,
      `link-${row.id}`,
    );
    await db
      .update(refunds)
      .set(
        r.ok
          ? { stripeRefundId: r.id, status: r.status }
          : { status: "failed", error: r.error },
      )
      .where(eq(refunds.id, row.id));
    await queueMail(
      db,
      {
        key: `alert:check-payment:${intent.id}`,
        template: "alert",
        data: {
          kind: "check-payment",
          view: {
            amountPence: intent.amountReceivedPence,
            why: `${o.number} was paid through a link that was no longer needed, so the payment went back.`,
          },
        },
        to: s.email,
      },
      now,
    );
    return "refunded";
  }
  const [marked] = await db
    .update(paymentLinks)
    .set({ status: "paid", paidPence: intent.amountReceivedPence, paidAt: now })
    .where(and(eq(paymentLinks.id, l.id), eq(paymentLinks.status, "open")))
    .returning({ id: paymentLinks.id });
  if (!marked) return "already";
  const net = await netPaid(db, o);
  if (net > o.totalPence)
    await refundOrder(
      db,
      gw,
      { orderId: o.id, amountPence: net - o.totalPence, kind: "excess" },
      now,
    );
  const due = Math.max(0, o.totalPence - (await netPaid(db, o)));
  const others = await db
    .select()
    .from(paymentLinks)
    .where(
      and(eq(paymentLinks.orderId, o.id), eq(paymentLinks.status, "open")),
    );
  for (const other of others)
    if (other.amountPence > due) await withdrawPayLink(db, gw, other.id);
  await queueMail(
    db,
    {
      key: `alert:paid:${l.id}`,
      template: "alert",
      data: {
        kind: "paid",
        view: { number: o.number, pence: intent.amountReceivedPence },
      },
      to: s.email,
      replyTo: o.email || null,
    },
    now,
  );
  return "paid";
}

/** After Stripe answered on the page: paid, still processing, or not taken. */
export async function finishPayLink(
  db: Db,
  gw: Pick<Gateway, "retrieve" | "refund" | "cancel">,
  token: string,
  now = new Date(),
): Promise<"paid" | "processing" | "failed"> {
  const found = await payLinkByToken(db, token);
  if (!found) return "failed";
  if (found.link.status === "paid") return "paid";
  if (!found.link.paymentIntentId) return "failed";
  const intent = await gw.retrieve(found.link.paymentIntentId);
  if (intent.status === "processing") return "processing";
  if (intent.status !== "succeeded") return "failed";
  const r = await applyPayLink(db, gw, intent, now);
  return r === "paid" || r === "already" ? "paid" : "failed";
}

/** The order's open links, for the status page's “Pay £… →” rows (§6.3 Money). */
export async function openPayLinks(db: Db, o: Order, today: CalendarDate) {
  const rows = await db
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.orderId, o.id), eq(paymentLinks.status, "open")))
    .orderBy(paymentLinks.id);
  return rows.filter((l) => payLinkState(l, o, today) === "open");
}
