import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button";
import { connect, databaseUrl } from "@/db/client";
import { DRAFT_COOKIE } from "@/db/draft-repo";
import { drafts } from "@/db/schema";
import { eq } from "drizzle-orm";
import styles from "@/components/checkout/checkout.module.css";

// After Pay (§5.5 Success). For now only the “payment received” state: the confirmation itself (the webhook, §10.6)
// arrives in slice 4.5b and this page's design in slice 4.6.
export const instant = false;

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default async function Page() {
  await connection();
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id || !databaseUrl()) redirect("/cakes");
  const { db, close } = connect();
  let paying = false;
  try {
    const [d] = await db
      .select({ status: drafts.status })
      .from(drafts)
      .where(eq(drafts.id, id));
    paying = !!d && (d.status === "pending" || d.status === "confirmed");
  } catch {
    paying = false;
  } finally {
    await close();
  }
  if (!paying) redirect("/order/pay");
  return (
    <div className={styles.page}>
      <section className={styles.empty} aria-labelledby="confirmed-heading">
        <h1 id="confirmed-heading" className={styles.emptyTitle} tabIndex={-1}>
          Payment received — confirming your order
        </h1>
        <p className={styles.emptyText}>
          Your payment has gone through, but the confirmation has not reached me
          yet. There is nothing you need to do, and you will not be charged
          twice.
        </p>
        <p className={styles.stub}>
          The confirmation itself and this page&apos;s design arrive in slices
          4.5b and 4.6.
        </p>
        <div className={styles.emptyActions}>
          <ButtonLink href="/">Back to the home page</ButtonLink>
        </div>
      </section>
    </div>
  );
}
