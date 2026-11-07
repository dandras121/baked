"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/app/layout";
import { cancelOrder } from "@/db/cancel-repo";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { orderForToken } from "@/db/order-link-repo";
import type { CancelQuote } from "@/lib/cancel-copy";
import { mailTransport } from "@/lib/mail/transport";
import { UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { gateway } from "@/lib/payments";

/** Without Stripe keys a refund cannot go: it is recorded as failed and Linda is told (§6.6 Stripe refund call fails). */
const PAYMENTS_OFF = {
  refund: async () => ({
    ok: false as const,
    error: "Payments are not switched on",
  }),
};

export type CancelState = {
  outcome: null | "changed" | "locked" | "failed";
  /** The new refund when it changed between showing and pressing (§6.6). */
  quote?: CancelQuote;
};

/**
 * Cancel the order (§6.6): only with this link's unlock cookie. The window and the refund are checked again on the
 * server; cancelled → the status page in state E, e-mail 8 and Linda's alert.
 */
export async function cancelAction(
  token: string,
  shownPence: number,
): Promise<CancelState> {
  const page = `/my-order/${token}`;
  if (!unlockValid(token, (await cookies()).get(UNLOCK_COOKIE)?.value))
    redirect(`${page}/cancel`);
  if (!databaseUrl()) return { outcome: "failed" };
  const { db, close } = connect();
  let to = "";
  try {
    const found = await orderForToken(db, token);
    if (!found?.valid) redirect(page);
    const r = await cancelOrder(db, gateway() ?? PAYMENTS_OFF, {
      orderId: found.order.id,
      shownPence,
    });
    if (r.kind === "changed") return { outcome: "changed", quote: r.quote };
    if (r.kind === "locked") return { outcome: "locked" };
    // Closed: the page shows A2; already cancelled: the status page shows E.
    to = r.kind === "closed" ? `${page}/cancel` : page;
    if (r.kind === "cancelled")
      await processMail(db, mailTransport(), SITE_URL).catch((e) =>
        console.error("cancel mail", e),
      );
  } finally {
    await close();
  }
  redirect(to);
}
