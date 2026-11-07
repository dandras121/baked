import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { orders } from "@/db/schema";
import { londonDate } from "@/lib/london-time";
import { checkKind, statusLinkValid } from "@/lib/order-link";
import { statusState } from "@/lib/order-status";
import styles from "../mail/mail.module.css";
import { makeSamples } from "./actions";

export const instant = false;
export const metadata: Metadata = { title: "Orders — Baked by Linda" };

/** The newest orders with their status link and the answer that opens it (phase 6; development and previews). */
export default async function Page() {
  await connection();
  if (!databaseUrl()) return <p>No database.</p>;
  const { db, close } = connect();
  const rows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.id))
    .limit(30)
    .finally(close);
  return (
    <main className={styles.page}>
      <h1>Orders</h1>
      <p className={styles.lead}>
        Each order&rsquo;s status link and the answer that opens it.
        Linda&rsquo;s own buttons (Nobody was in, payment links) are added here
        in later slices until the admin exists.
      </p>
      <form action={makeSamples} className={styles.sample}>
        <button type="submit" className={styles.button}>
          Make sample orders
        </button>{" "}
        <span className={styles.meta}>
          one for each state of the order page (A, B, B2, C; delivery,
          collection, a manual order), two inside seven days for cancelling (one
          moved later) and one whose link has expired
        </span>
      </form>
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
              londonDate(new Date()),
            )}{" "}
            · answer:{" "}
            <strong>
              {checkKind(o.handover) === "postcode"
                ? (o.postcode ?? "—")
                : o.phone.replace(/\D/g, "").slice(-4)}
            </strong>
            {statusLinkValid(String(o.date)) ? "" : " · link expired"}
          </li>
        ))}
      </ol>
    </main>
  );
}
