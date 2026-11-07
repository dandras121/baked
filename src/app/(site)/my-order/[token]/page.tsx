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
import { recentMessage } from "@/db/message-repo";
import { attemptByToken, latestAttempt } from "@/db/delivery-repo";
import { collectingCopy, deliveryPhase, nobodyCopy } from "@/lib/delivery";
import { readMailSettings, reviewLink } from "@/db/mail-settings-repo";
import { orderForToken } from "@/db/order-link-repo";
import { cakes, orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import { formatLongDate, londonDate } from "@/lib/london-time";
import { formatPrice } from "@/lib/money";
import { cancelledCopy } from "@/lib/cancel-copy";
import type { CancelledView } from "@/lib/mail/after-emails";
import { netPaid, orderRefunds } from "@/db/refund-repo";
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
  searchParams: Promise<{ saved?: string; message?: string }>;
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
        const query = await searchParams;
        const saved = Number(query.saved);
        const sentId = Number(query.message);
        const change = saved
          ? await recentChange(db, found.order.id, saved)
          : null;
        if (change)
          banner = {
            title: "Your change is saved.",
            text:
              change.moneyKind === "down"
                ? `The details are in your inbox. ${formatPrice(change.moneyPence)} back to your card within 5–10 working days.`
                : change.moneyKind === "up"
                  ? `The details are in your inbox. ${formatPrice(change.moneyPence)} paid today.`
                  : "The details are in your inbox.",
          };
        // “Message sent.” (§6.5), right after sending only.
        if (sentId && (await recentMessage(db, found.order.id, sentId)))
          banner = {
            title: "Message sent.",
            text: `I’ll reply to ${found.order.email} within 24 hours. If it is urgent, call ${phone}.`,
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
  const now = new Date();
  const today = londonDate(now);
  const [lines, mail, s, refundRows] = await Promise.all([
    db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position),
    readMailSettings(db),
    getSiteSettings(),
    orderRefunds(db, o.id),
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
  // E: the cancellation as decided, and how its refunds are getting on (§6.3 E, §10.6).
  const kept = o.cancellation as CancelledView | null;
  const cancelRows = refundRows.filter((r) => r.kind === "cancel");
  const progress = !kept
    ? "none"
    : kept.cardPence + kept.handPence === 0
      ? "none"
      : o.status === "refunded"
        ? "done"
        : cancelRows.some((r) => r.status === "failed")
          ? "failed"
          : "pending";
  const lastCancelRefund = cancelRows.at(-1);
  // Nobody was in and its choice (§6.2 rows 2–3, §6.8).
  const latest = await latestAttempt(db, o.id);
  const attempt = latest && {
    attempt: latest.attempt,
    outcome: latest.outcome,
    choice: latest.choice,
    recordedOn: latest.recordedOn && String(latest.recordedOn),
    collectDay: latest.collectDay && String(latest.collectDay),
  };
  const collectAt = [s?.addressLine, s?.town]
    .filter(Boolean)
    .filter((x, i, a) => i === 0 || !a[0]!.includes(x!))
    .join(", ");
  const offer =
    latest?.token && latest.outcome === "nobody-in"
      ? ((await attemptByToken(db, latest.token))?.offerRedelivery ?? false)
      : false;
  const state = statusState(
    { status: o.status, date: String(o.date) },
    today,
    attempt,
  );
  return {
    token: o.token,
    nobody:
      state === "NOBODY" && attempt?.recordedOn
        ? nobodyCopy({
            day: String(latest!.day),
            today,
            recordedOn: attempt.recordedOn,
            now,
            town: s?.town ?? "",
            collectAt,
            feePence: s?.secondAttemptFeePence ?? 0,
            offerRedelivery: offer,
            phone: s?.phone ?? "",
          })
        : null,
    nobodyOpen: !!attempt && deliveryPhase(attempt, now) === "choose",
    deliveryHref: latest?.token ? `/delivery/${latest.token}` : null,
    collecting:
      state === "MISSED" && attempt?.collectDay && attempt.recordedOn
        ? collectingCopy({
            collectDay: attempt.collectDay,
            recordedOn: attempt.recordedOn,
            today,
            collectAt,
          })
        : null,
    cancelled: kept
      ? cancelledCopy(
          kept,
          progress,
          lastCancelRefund ? londonDate(lastCancelRefund.createdAt) : null,
          today,
        )
      : null,
    cancelRefundPence: kept ? kept.cardPence + kept.handPence : 0,
    number: o.number,
    state,
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
    // Net paid (§10.6): the checkout payment and paid changes, less what went back.
    paidPence: await netPaid(db, o),
    collectAt,
    reviewHref: reviewLink(mail.googlePlaceId),
    // The cancellation's own refund is the E state's box and panel row, not a refund line.
    refunds: refundRows
      .filter((r) => r.status !== "failed" && r.kind !== "cancel")
      .map(
        (r) =>
          `Refunded ${formatPrice(r.amountPence)} on ${formatLongDate(londonDate(r.createdAt), today).replace(/^\w+ /, "")}`,
      ),
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
