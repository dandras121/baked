import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { orders } from "@/db/schema";
import { checkKind, statusLinkValid } from "@/lib/order-link";
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
          a delivery and a collection in ten days, and one whose link has
          expired
        </span>
      </form>
      <ol className={styles.sample}>
        {rows.map((o) => (
          <li key={o.id} className={styles.meta}>
            <Link href={`/my-order/${o.token}`}>{o.number}</Link> ·{" "}
            {String(o.date)} · {o.handover} · {o.status} · answer:{" "}
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
