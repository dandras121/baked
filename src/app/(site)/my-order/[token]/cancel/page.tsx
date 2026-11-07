import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CancelPage } from "@/components/order-status/cancel-page";
import { ChangeClosed } from "@/components/order-status/change-closed";
import { LinkExpired } from "@/components/order-status/link-expired";
import { OpenOrder } from "@/components/order-status/open-order";
import styles from "@/components/order-status/state.module.css";
import { cancelQuote, type CancelQuote } from "@/db/cancel-repo";
import { connect, databaseUrl } from "@/db/client";
import { orderForToken } from "@/db/order-link-repo";
import { orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { WINDOWS } from "@/lib/handover";
import { formatLongDate, londonDate } from "@/lib/london-time";
import { checkKind, UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { lastChangeDay, panelDate, statusState } from "@/lib/order-status";
import { openOrder, resendLink } from "../actions";
import { cancelAction } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Cancel your order",
  robots: { index: false, follow: false },
};

/**
 * /my-order/[token]/cancel (§6.6): the check first when the link is not open yet, then the cancel page while the
 * change window is open (A), A2 once it has closed; cancelled and manual orders go back to the status page.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const phone = (await getSiteSettings())?.phone ?? "";
  if (!databaseUrl()) redirect(`/my-order/${token}`);
  const unlocked = unlockValid(
    token,
    (await cookies()).get(UNLOCK_COOKIE)?.value,
  );
  const today = londonDate(new Date());
  const { db, close } = connect();
  let found: Awaited<ReturnType<typeof orderForToken>> = null;
  let lines: (typeof orderLines.$inferSelect)[] = [];
  let quote: CancelQuote | null = null;
  try {
    found = await orderForToken(db, token);
    if (found?.valid && unlocked) {
      lines = await db
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, found.order.id))
        .orderBy(orderLines.position);
      quote = await cancelQuote(db, found.order, today);
    }
  } finally {
    await close();
  }
  if (!found || !found.valid)
    return (
      <div className={styles.page}>
        <LinkExpired action={resendLink} phone={phone} />
      </div>
    );
  if (!unlocked || !quote)
    return (
      <div className={styles.page}>
        <OpenOrder
          action={openOrder.bind(null, token, "/cancel")}
          kind={checkKind(found.order.handover)}
          phone={phone}
        />
      </div>
    );
  const o = found.order;
  const state = statusState({ status: o.status, date: String(o.date) }, today);
  if (o.kind !== "catalogue" || state === "E") redirect(`/my-order/${token}`);
  if (state !== "A") {
    const times = WINDOWS.find((w) => w.key === o.deliveryWindow)?.times;
    return (
      <ChangeClosed
        token={token}
        number={o.number}
        closedOn={formatLongDate(lastChangeDay(String(o.date)), today)}
        date={formatLongDate(String(o.date), today)}
        phone={phone}
        dateRow={
          o.handover === "delivery"
            ? {
                label: "Date and window",
                value: `${panelDate(String(o.date), today)}${times ? ` · ${times}` : ""}`,
              }
            : { label: "Date", value: panelDate(String(o.date), today) }
        }
        lines={lines.map((l) => ({
          id: l.id,
          name: l.name,
          sizeLine: l.sizeLine,
          options: l.options,
          message: l.message,
          sizes: [],
          optionViews: [],
          answers: null,
          optionsPaidPence: 0,
          cakeAllergens: null,
        }))}
      />
    );
  }
  return (
    <CancelPage
      token={token}
      number={o.number}
      today={today}
      quote={quote}
      action={cancelAction.bind(null, token)}
    />
  );
}
