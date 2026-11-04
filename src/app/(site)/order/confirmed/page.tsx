import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import styles from "@/components/checkout/checkout.module.css";
import { Confirming } from "@/components/checkout/confirming";
import { ButtonLink } from "@/components/ui/button";
import { connect, databaseUrl } from "@/db/client";
import { confirmationState } from "@/db/confirm-repo";
import { DRAFT_COOKIE } from "@/db/draft-repo";
import { drafts } from "@/db/schema";
import { gateway } from "@/lib/payments";

// After Pay (§5.5 Success, §5.6). Only Stripe confirms (the webhook or the reconciliation job, §10.6); until then the
// page waits and asks again. The confirmation's own design (order number, what happens next, the mascot) is 4.6.
export const instant = false;

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default async function Page() {
  await connection();
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!databaseUrl()) redirect("/cakes");
  const { db, close } = connect();
  let state: Awaited<ReturnType<typeof confirmationState>>;
  let name = "";
  try {
    state = await confirmationState(db, id, gateway());
    if (state === "confirmed") {
      const [d] = await db
        .select({ name: drafts.customerName })
        .from(drafts)
        .where(eq(drafts.id, id!));
      name = (d?.name ?? "").trim().split(/\s+/)[0] ?? "";
    }
  } finally {
    await close();
  }
  if (state === "none") redirect("/cakes");
  if (state === "failed") redirect("/order/pay");
  return (
    <div className={styles.page}>
      <section className={styles.empty} aria-live="polite">
        {state === "confirmed" ? (
          <>
            <h1 className={styles.emptyTitle} tabIndex={-1}>
              Thank you{name ? `, ${name}` : ""}.
            </h1>
            <p className={styles.emptyText}>Your order is confirmed.</p>
            <p className={styles.stub}>
              The order number, what happens next and the mascot arrive in slice
              4.6.
            </p>
            <div className={styles.emptyActions}>
              <ButtonLink href="/">Back to the home page</ButtonLink>
            </div>
          </>
        ) : (
          <Confirming />
        )}
      </section>
    </div>
  );
}
