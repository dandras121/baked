import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import styles from "@/components/checkout/checkout.module.css";
import { Confirming } from "@/components/checkout/confirming";
import { OrderConfirmed } from "@/components/checkout/order-confirmed";
import { ButtonLink } from "@/components/ui/button";
import { connect, databaseUrl } from "@/db/client";
import { confirmationState } from "@/db/confirm-repo";
import { DRAFT_COOKIE } from "@/db/draft-repo";
import { orderForDraft } from "@/db/order-repo";
import { drafts } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { gateway } from "@/lib/payments";

// After Pay (§5.5 Success, §5.6). Only Stripe confirms (the webhook or the reconciliation job, §10.6); until then the
// page waits and asks again, then shows the order (number, what happens next, the mascot, ANIM-25).
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
  let order: Awaited<ReturnType<typeof orderForDraft>> = null;
  let draftName = "";
  try {
    state = await confirmationState(db, id, gateway());
    if (state === "confirmed") {
      order = await orderForDraft(db, id!);
      if (!order) {
        const [d] = await db
          .select({ name: drafts.customerName })
          .from(drafts)
          .where(eq(drafts.id, id!));
        draftName = (d?.name ?? "").trim().split(/\s+/)[0] ?? "";
      }
    }
  } finally {
    await close();
  }
  if (state === "none") redirect("/cakes");
  if (state === "failed") redirect("/order/pay");
  if (order) {
    const s = await getSiteSettings();
    return (
      <OrderConfirmed
        order={order}
        phone={s?.phone ?? ""}
        collectionAddress={[s?.addressLine, s?.town].filter(Boolean).join(", ")}
      />
    );
  }
  return (
    <div className={styles.page}>
      <section className={styles.empty} aria-live="polite">
        {state === "confirmed" ? (
          // Confirmed before orders existed (slice 4.6a): the plain thank-you.
          <>
            <h1 className={styles.emptyTitle} tabIndex={-1}>
              Thank you{draftName ? `, ${draftName}` : ""}.
            </h1>
            <p className={styles.emptyText}>Your order is confirmed.</p>
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
