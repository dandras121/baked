import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { LinkExpired } from "@/components/order-status/link-expired";
import {
  StatusPage,
  type StatusView,
} from "@/components/order-status/status-page";
import { OpenOrder } from "@/components/order-status/open-order";
import styles from "@/components/order-status/state.module.css";
import { connect, databaseUrl } from "@/db/client";
import { recentChange } from "@/db/change-repo";
import { readMailSettings, reviewLink } from "@/db/mail-settings-repo";
import { orderForToken } from "@/db/order-link-repo";
import { cakes, orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { londonDate } from "@/lib/london-time";
import { checkKind, UNLOCK_COOKIE, unlockValid } from "@/lib/order-link";
import { statusState } from "@/lib/order-status";
import { openOrder, resendLink } from "./actions";

// The status link (§6.1, §10.5): read on every visit, never prerendered; noindex and no-referrer (next.config).
export const instant = false;

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await connection();
  const { token } = await params;
  const settings = await getSiteSettings();
  const phone = settings?.phone ?? "";
  let found: Awaited<ReturnType<typeof orderForToken>> = null;
  let view: StatusView | null = null;
  let banner: { title: string; text: string } | null = null;
  const unlocked = unlockValid(
    token,
    (await cookies()).get(UNLOCK_COOKIE)?.value,
  );
  if (databaseUrl()) {
    const { db, close } = connect();
    try {
      found = await orderForToken(db, token);
      if (found?.valid && unlocked) {
        view = await statusView(db, found.order);
        const saved = Number((await searchParams).saved);
        if (saved && (await recentChange(db, found.order.id, saved)))
          banner = {
            title: "Your change is saved.",
            text: "The details are in your inbox.",
          };
      }
    } finally {
      await close();
    }
  }
  // Expired, unknown or tampered: D — it reveals nothing about whether an order exists.
  if (!found || !found.valid)
    return (
      <div className={styles.page}>
        <LinkExpired action={resendLink} phone={phone} />
      </div>
    );
  if (!unlocked || !view)
    return (
      <div className={styles.page}>
        <OpenOrder
          action={openOrder.bind(null, token, "")}
          kind={checkKind(found.order.handover)}
          phone={phone}
        />
      </div>
    );
  return <StatusPage v={view} banner={banner} />;
}

type Db = ReturnType<typeof connect>["db"];
type Order = NonNullable<Awaited<ReturnType<typeof orderForToken>>>["order"];

/** Everything the status page shows, read now (§6.2: the state is worked out on every visit). */
async function statusView(db: Db, o: Order): Promise<StatusView> {
  const today = londonDate(new Date());
  const [lines, mail, s] = await Promise.all([
    db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position),
    readMailSettings(db),
    getSiteSettings(),
  ]);
  const slugs = lines.map((l) => l.slug).filter(Boolean);
  const visible = new Set(
    slugs.length
      ? (
          await db
            .select({ slug: cakes.slug })
            .from(cakes)
            .where(
              and(
                inArray(cakes.slug, slugs),
                eq(cakes.visible, true),
                isNull(cakes.deletedAt),
              ),
            )
        ).map((c) => c.slug)
      : [],
  );
  return {
    token: o.token,
    number: o.number,
    state: statusState({ status: o.status, date: String(o.date) }, today),
    date: String(o.date),
    today,
    handover: o.handover === "delivery" ? "delivery" : "collection",
    window: o.deliveryWindow,
    address: o.address,
    postcode: o.postcode,
    allergyNote: o.allergyNote,
    manual: o.kind === "manual",
    completed: o.status === "completed",
    email: o.email,
    totalPence: o.totalPence,
    paidPence: o.amountReceivedPence,
    collectAt: [s?.addressLine, s?.town]
      .filter(Boolean)
      .filter((x, i, a) => i === 0 || !a[0]!.includes(x!))
      .join(", "),
    reviewHref: reviewLink(mail.googlePlaceId),
    lines: lines.map((l) => ({
      name: l.name,
      flavour: l.flavour,
      sizeLine: l.sizeLine,
      options: l.options,
      message: l.message,
      allergenText: l.allergenText,
      againHref: visible.has(l.slug) ? `/cakes/${l.slug}` : null,
    })),
  };
}
