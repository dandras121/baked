import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PayPage } from "@/components/order-status/pay-page";
import { connect, databaseUrl } from "@/db/client";
import {
  finishPayLink,
  payLinkByToken,
  payLinkState,
} from "@/db/pay-link-repo";
import { netPaid } from "@/db/refund-repo";
import { orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { eq } from "drizzle-orm";
import { formatLongDate, londonDate } from "@/lib/london-time";
import { formatPrice } from "@/lib/money";
import { gateway, PUBLISHABLE_KEY } from "@/lib/payments";
import { finishPayLinkAction, payLinkAction } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Pay for your cake",
  robots: { index: false, follow: false },
};

/**
 * /pay/[token] (§6.9; M 1598:10573, phone 1598:10598): no second check — the link only takes money. Paid first
 * (“Already paid”), then no longer needed, else the rows by purpose and Pay £…. Unknown tokens are a 404 (proxy).
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  await connection();
  const { token } = await params;
  if (!databaseUrl()) notFound();
  const query = await searchParams;
  const s = await getSiteSettings();
  const now = new Date();
  const today = londonDate(now);
  const { db, close } = connect();
  try {
    let found = await payLinkByToken(db, token);
    if (!found) notFound();
    // Back from the bank's check (3-D Secure): the payment may have just gone through.
    const gw = gateway();
    if (
      query.paid &&
      gw &&
      found.link.status === "open" &&
      found.link.paymentIntentId
    ) {
      await finishPayLink(db, gw, token, now);
      found = (await payLinkByToken(db, token))!;
    }
    const { link, order: o } = found;
    const state = payLinkState(link, o, today);
    const names = (
      await db
        .select({ name: orderLines.name })
        .from(orderLines)
        .where(eq(orderLines.orderId, o.id))
        .orderBy(orderLines.position)
    )
      .map((l) => l.name)
      .join(", ");
    const paid = await netPaid(db, o);
    const date = formatLongDate(String(o.date), today);
    const pay = formatPrice(link.amountPence);
    const rows: [string, string][] =
      link.purpose === "deposit"
        ? [
            ["What it is for", "Deposit"],
            ["Your cake", `${names}, ${date}`],
            [
              "To pay now",
              `${pay} · total ${formatPrice(o.totalPence)}, paid so far ${formatPrice(paid)}`,
            ],
          ]
        : [
            ["Order", `Your cake, ${date}`],
            ["To pay now", `${pay} · this settles your cake`],
          ];
    return (
      <PayPage
        token={token}
        number={o.number}
        statusHref={`/my-order/${o.token}`}
        state={state}
        justPaid={!!query.paid}
        paidText={`${formatPrice(link.paidPence || link.amountPence)} has been paid for order ${o.number}. A receipt is on its way to ${o.email}.`}
        rows={rows}
        amountPence={link.amountPence}
        what={`for order ${o.number}`}
        phone={s?.phone ?? ""}
        publishableKey={PUBLISHABLE_KEY()}
        pay={payLinkAction.bind(null, token)}
        finish={finishPayLinkAction.bind(null, token)}
      />
    );
  } finally {
    await close();
  }
}
