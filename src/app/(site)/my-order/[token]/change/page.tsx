import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChangeClosed } from "@/components/order-status/change-closed";
import { ChangePage } from "@/components/order-status/change-page";
import { LinkExpired } from "@/components/order-status/link-expired";
import { OpenOrder } from "@/components/order-status/open-order";
import styles from "@/components/order-status/state.module.css";
import {
  editableOptions,
  lineCakes,
  paymentInProgress,
  sizeChoices,
} from "@/db/change-repo";
import type { Answers } from "@/lib/cake-config";
import { PUBLISHABLE_KEY } from "@/lib/payments";
import { connect, databaseUrl } from "@/db/client";
import { orderForToken } from "@/db/order-link-repo";
import { orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { WINDOWS } from "@/lib/handover";
import { formatLongDate, londonDate } from "@/lib/london-time";
import { checkKind, UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { lastChangeDay, panelDate, statusState } from "@/lib/order-status";
import { openOrder, resendLink } from "../actions";
import { finishChange, prepareChange, saveChange } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Change your order",
  robots: { index: false, follow: false },
};

/**
 * /my-order/[token]/change (§6.4): the check first when the link is not open yet, then the change page while the
 * window is open (A), A2 once it has closed; cancelled and manual orders go back to the status page.
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
  const phone = (await getSiteSettings())?.phone ?? "";
  if (!databaseUrl()) redirect(`/my-order/${token}`);
  const unlocked = unlockValid(
    token,
    (await cookies()).get(UNLOCK_COOKIE)?.value,
  );
  const { db, close } = connect();
  let found: Awaited<ReturnType<typeof orderForToken>> = null;
  let lines: (typeof orderLines.$inferSelect)[] = [];
  let sizes: Awaited<ReturnType<typeof sizeChoices>> = {};
  let cakesNow: Awaited<ReturnType<typeof lineCakes>> = {};
  try {
    found = await orderForToken(db, token);
    if (found?.valid && unlocked)
      lines = await db
        .select()
        .from(orderLines)
        .where(eq(orderLines.orderId, found.order.id))
        .orderBy(orderLines.position);
    if (lines.length) {
      sizes = await sizeChoices(db, lines);
      cakesNow = await lineCakes(db, lines);
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
  if (!unlocked)
    return (
      <div className={styles.page}>
        <OpenOrder
          action={openOrder.bind(null, token, "/change")}
          kind={checkKind(found.order.handover)}
          phone={phone}
        />
      </div>
    );
  const o = found.order;
  const today = londonDate(new Date());
  const state = statusState({ status: o.status, date: String(o.date) }, today);
  if (o.kind !== "catalogue" || state === "E") redirect(`/my-order/${token}`);
  const times = WINDOWS.find((w) => w.key === o.deliveryWindow)?.times;
  const dateRow =
    o.handover === "delivery"
      ? {
          label: "Date and window",
          value: `${panelDate(String(o.date), today)}${times ? ` · ${times}` : ""}`,
        }
      : { label: "Date", value: panelDate(String(o.date), today) };
  const view = lines.map((l) => ({
    id: l.id,
    name: l.name,
    sizeLine: l.sizeLine,
    options: l.options,
    message: l.message,
    sizes: sizes[l.id] ?? [],
    optionViews: cakesNow[l.id]?.options ?? [],
    answers: editableOptions(l)
      ? ((l.answers as Answers | null) ?? { picks: {}, texts: {} })
      : null,
    optionsPaidPence: l.pricePence - (l.sizePricePence ?? l.pricePence),
    cakeAllergens: cakesNow[l.id]?.allergens ?? null,
  }));
  const deadline = formatLongDate(lastChangeDay(String(o.date)), today);
  if (state !== "A")
    return (
      <ChangeClosed
        token={token}
        number={o.number}
        closedOn={deadline}
        date={formatLongDate(String(o.date), today)}
        phone={phone}
        dateRow={dateRow}
        lines={view}
      />
    );
  const paid = Number((await searchParams).paid) || null;
  return (
    <ChangePage
      action={saveChange.bind(null, token, o.version)}
      prepare={prepareChange.bind(null, token, o.version)}
      finish={finishChange.bind(null, token)}
      publishableKey={PUBLISHABLE_KEY()}
      paying={paymentInProgress(o, new Date())}
      paidChangeId={paid}
      token={token}
      number={o.number}
      until={deadline}
      dateRow={dateRow}
      lines={view}
    />
  );
}
