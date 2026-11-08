import { and, desc, eq, ne, sum } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { orders } from "@/db/schema";
import { londonDate } from "@/lib/london-time";
import { checkKind, statusLinkValid } from "@/lib/order-link";
import { statusState } from "@/lib/order-status";
import styles from "../mail/mail.module.css";
import {
  makeSamples,
  nobodyWasIn,
  resetChecks,
  sendPayLink,
  toggleRedeliveryFee,
  toggleTomorrowClosed,
  withdrawLink,
} from "./actions";
import { closedDays } from "@/db/schema";
import { readSettings } from "@/db/settings-repo";
import { addDays } from "@/lib/london-time";
import {
  deliveryAttempts,
  orderChanges,
  paymentLinks,
  refunds,
} from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { inArray } from "drizzle-orm";

export const instant = false;
export const metadata: Metadata = { title: "Orders — Baked by Linda" };

/** The newest orders with their status link and the answer that opens it (phase 6; development and previews). */
export default async function Page() {
  await connection();
  if (!databaseUrl()) return <p>No database.</p>;
  const { db, close } = connect();
  const today = londonDate(new Date());
  let rows: (typeof orders.$inferSelect)[] = [];
  let attempts: (typeof deliveryAttempts.$inferSelect)[] = [];
  let links: (typeof paymentLinks.$inferSelect)[] = [];
  const due = new Map<number, number>();
  let feePence = 0;
  let tomorrowClosed = false;
  try {
    rows = await db.select().from(orders).orderBy(desc(orders.id)).limit(60);
    attempts = rows.length
      ? await db
          .select()
          .from(deliveryAttempts)
          .where(
            inArray(
              deliveryAttempts.orderId,
              rows.map((o) => o.id),
            ),
          )
      : [];
    links = rows.length
      ? await db
          .select()
          .from(paymentLinks)
          .where(
            inArray(
              paymentLinks.orderId,
              rows.map((o) => o.id),
            ),
          )
      : [];
    // Still to pay in three grouped queries (one by one it was ~100 round trips and every button here was slow).
    // The same sums as netPaid (§10.6): received + paid changes + link money − refunds that did not fail, fees aside.
    const ids = rows.map((o) => o.id);
    const byOrder = (r: { id: number; n: string | null }[]) =>
      new Map(r.map((x) => [x.id, Number(x.n ?? 0)]));
    const [changed, linked, refunded] = ids.length
      ? await Promise.all([
          db
            .select({
              id: orderChanges.orderId,
              n: sum(orderChanges.paidPence),
            })
            .from(orderChanges)
            .where(
              and(
                inArray(orderChanges.orderId, ids),
                eq(orderChanges.status, "saved"),
              ),
            )
            .groupBy(orderChanges.orderId)
            .then(byOrder),
          db
            .select({
              id: paymentLinks.orderId,
              n: sum(paymentLinks.paidPence),
            })
            .from(paymentLinks)
            .where(inArray(paymentLinks.orderId, ids))
            .groupBy(paymentLinks.orderId)
            .then(byOrder),
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
            .groupBy(refunds.orderId)
            .then(byOrder),
        ])
      : [
          new Map<number, number>(),
          new Map<number, number>(),
          new Map<number, number>(),
        ];
    for (const o of rows) {
      const net =
        o.amountReceivedPence +
        (changed.get(o.id) ?? 0) +
        (linked.get(o.id) ?? 0) -
        (refunded.get(o.id) ?? 0);
      due.set(o.id, Math.max(0, o.totalPence - net));
    }
    feePence = (await readSettings(db)).secondAttemptFeePence;
    tomorrowClosed =
      (
        await db
          .select()
          .from(closedDays)
          .where(eq(closedDays.day, addDays(today, 1)))
      ).length > 0;
  } finally {
    await close();
  }
  // The latest attempt of each order; Nobody was in is offered on its day or after, while nothing is recorded on it.
  const latest = (id: number) =>
    attempts
      .filter((a) => a.orderId === id)
      .sort((a, b) => b.attempt - a.attempt)[0];
  const canMiss = (o: (typeof rows)[number]) => {
    const a = latest(o.id);
    return (
      o.handover === "delivery" &&
      o.status === "confirmed" &&
      (a
        ? a.outcome === "none" && String(a.day) <= today
        : String(o.date) <= today)
    );
  };
  return (
    <main className={styles.page}>
      <h1>Orders</h1>
      <p className={styles.lead}>
        Each order&rsquo;s status link and the answer that opens it.
        Linda&rsquo;s own buttons (Nobody was in, payment links) are added here
        in later slices until the admin exists.
      </p>
      <form action={resetChecks} className={styles.sample}>
        <button type="submit" className={styles.button}>
          Reset the check orders
        </button>{" "}
        <span className={styles.meta}>
          the BBL-CHK orders of the phase 6 document: always the same links,
          dates counted from today — press it before you start, or to do a step
          again
        </span>
      </form>
      <form action={makeSamples} className={styles.sample}>
        <button type="submit" className={styles.button}>
          Make sample orders
        </button>{" "}
        <span className={styles.meta}>
          one for each state of the order page (A, B, B2, C; delivery,
          collection, a manual order), two inside seven days for cancelling (one
          moved later), one for today (Nobody was in), a bespoke one with £380
          to pay (payment links) and one whose link has expired
        </span>
      </form>
      <div className={styles.sample}>
        Redelivery fee:{" "}
        <strong>{feePence ? formatPrice(feePence) : "free"}</strong>{" "}
        <form action={toggleRedeliveryFee} className={styles.inline}>
          <button type="submit" className={styles.button}>
            {feePence ? "Make it free" : "Set it to £15"}
          </button>
        </form>{" "}
        · tomorrow is <strong>{tomorrowClosed ? "closed" : "open"}</strong>{" "}
        <form action={toggleTomorrowClosed} className={styles.inline}>
          <button type="submit" className={styles.button}>
            {tomorrowClosed ? "Open tomorrow" : "Close tomorrow"}
          </button>
        </form>
      </div>
      <ol className={styles.sample}>
        {rows.map((o) => (
          <li key={o.id} className={styles.meta}>
            <Link href={`/my-order/${o.token}`}>{o.number}</Link> ·{" "}
            {o.customerName} · {String(o.date)}
            {String(o.earliestDate) !== String(o.date)
              ? ` (moved; earliest ${String(o.earliestDate)})`
              : ""}{" "}
            · {o.handover} · {o.kind} · state{" "}
            {statusState(
              { status: o.status, date: String(o.date) },
              today,
              latest(o.id)
                ? {
                    outcome: latest(o.id)!.outcome,
                    choice: latest(o.id)!.choice,
                    collectDay:
                      latest(o.id)!.collectDay &&
                      String(latest(o.id)!.collectDay),
                    attempt: latest(o.id)!.attempt,
                    day: String(latest(o.id)!.day),
                  }
                : null,
            )}{" "}
            · answer:{" "}
            <strong>
              {checkKind(o.handover) === "postcode"
                ? (o.postcode ?? "—")
                : o.phone.replace(/\D/g, "").slice(-4)}
            </strong>
            {statusLinkValid(String(o.date)) ? "" : " · link expired"}
            {latest(o.id)?.token && (
              <>
                {" "}
                ·{" "}
                <Link href={`/delivery/${latest(o.id)!.token}`}>
                  delivery link
                </Link>
                {latest(o.id)!.choice !== "none"
                  ? ` (chose ${latest(o.id)!.choice})`
                  : ""}
              </>
            )}{" "}
            · still to pay {formatPrice(due.get(o.id) ?? 0)}
            {links
              .filter((l) => l.orderId === o.id)
              .map((l) => (
                <span key={l.id}>
                  {" "}
                  ·{" "}
                  <Link href={`/pay/${l.token}`}>
                    pay link {formatPrice(l.amountPence)}
                  </Link>{" "}
                  ({l.purpose}, {l.status})
                  {l.status === "open" && (
                    <form
                      action={withdrawLink.bind(null, l.id)}
                      className={styles.inline}
                    >
                      <button type="submit" className={styles.button}>
                        Withdraw
                      </button>
                    </form>
                  )}
                </span>
              ))}
            {o.status !== "cancelled" &&
              o.status !== "refunded" &&
              (due.get(o.id) ?? 0) >= 30 && (
                <form
                  action={sendPayLink.bind(null, o.id)}
                  className={styles.inline}
                >
                  <select
                    name="purpose"
                    defaultValue="deposit"
                    aria-label="What the link is for"
                  >
                    <option value="deposit">Deposit</option>
                    <option value="rest">The rest</option>
                    <option value="difference">A difference</option>
                  </select>{" "}
                  £
                  <input
                    name="amount"
                    aria-label="Amount in pounds"
                    defaultValue={((due.get(o.id) ?? 0) / 100).toFixed(2)}
                    size={7}
                  />{" "}
                  <button type="submit" className={styles.button}>
                    Send a payment link
                  </button>
                </form>
              )}
            {canMiss(o) && (
              <form
                action={nobodyWasIn.bind(null, o.id)}
                className={styles.inline}
              >
                <button type="submit" className={styles.button}>
                  Nobody was in
                </button>
              </form>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
