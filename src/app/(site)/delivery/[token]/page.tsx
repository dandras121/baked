import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DeliveryPage } from "@/components/order-status/delivery-page";
import { connect, databaseUrl } from "@/db/client";
import { attemptByToken, finishRedelivery } from "@/db/delivery-repo";
import { netPaid } from "@/db/refund-repo";
import { deliveryAttempts, orderLines } from "@/db/schema";
import { getSiteSettings } from "@/db/site-settings";
import {
  collectingCopy,
  deliveryPhase,
  nobodyCopy,
  redeliveryCopy,
} from "@/lib/delivery";
import { addDays, formatLongDate, londonDate } from "@/lib/london-time";
import { gateway, PUBLISHABLE_KEY } from "@/lib/payments";
import {
  collectAction,
  finishRedeliveryAction,
  redeliverAction,
} from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Your delivery",
  robots: { index: false, follow: false },
};

/**
 * /delivery/[token] (§6.8): opening it records nothing. The two ways forward, the Collect confirmation, G after the
 * choice, or the closed line after 23:59 on the day Nobody was in was recorded. Only the heading, What now and the
 * buttons — no address, allergy note or e-mail. An unknown token is a 404 (§10.5).
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ choice?: string; paid?: string }>;
}) {
  await connection();
  const { token } = await params;
  if (!databaseUrl()) notFound();
  const s = await getSiteSettings();
  const now = new Date();
  const today = londonDate(now);
  const { db, close } = connect();
  try {
    const query = await searchParams;
    let found = await attemptByToken(db, token);
    if (!found || found.attempt.outcome !== "nobody-in") notFound();
    // Back from the bank's check (3-D Secure): the fee may have just gone through.
    const gw = gateway();
    if (
      query.paid &&
      gw &&
      found.attempt.paymentIntentId &&
      found.attempt.choice === "none"
    ) {
      await finishRedelivery(db, gw, token, now);
      found = (await attemptByToken(db, token))!;
    }
    const { attempt: a, order: o, offerRedelivery } = found;
    const recordedOn = String(a.recordedOn);
    const collectAt = [s?.addressLine, s?.town]
      .filter(Boolean)
      .filter((x, i, arr) => i === 0 || !arr[0]!.includes(x!))
      .join(", ");
    const phase = deliveryPhase(
      {
        ...a,
        recordedOn,
        collectDay: a.collectDay && String(a.collectDay),
      },
      now,
    );
    const lines = await db
      .select({ name: orderLines.name, sizeLine: orderLines.sizeLine })
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const due = o.totalPence - (await netPaid(db, o));
    const choice = query.choice;
    // H: the next attempt that the redelivery booked.
    const [next] =
      a.choice === "redeliver"
        ? await db
            .select()
            .from(deliveryAttempts)
            .where(
              and(
                eq(deliveryAttempts.orderId, o.id),
                eq(deliveryAttempts.attempt, a.attempt + 1),
              ),
            )
        : [];
    const nextDay = addDays(recordedOn, 1);
    return (
      <DeliveryPage
        token={token}
        number={o.number}
        phase={phase}
        choice={choice === "collect" || choice === "redeliver" ? choice : null}
        phone={s?.phone ?? ""}
        nobody={nobodyCopy({
          day: String(a.day),
          today,
          recordedOn,
          now,
          town: s?.town ?? "",
          collectAt,
          feePence: s?.secondAttemptFeePence ?? 0,
          offerRedelivery,
          phone: s?.phone ?? "",
        })}
        collecting={
          a.collectDay
            ? collectingCopy({
                collectDay: String(a.collectDay),
                recordedOn,
                today,
                collectAt,
              })
            : null
        }
        cakes={lines.map((l) => `${l.name} · ${l.sizeLine}`)}
        collectAt={collectAt}
        paidInFull={due <= 0}
        collect={collectAction.bind(null, token)}
        redelivery={
          next
            ? redeliveryCopy({
                day: String(next.day),
                today,
                window: next.deliveryWindow,
                feePaidPence: a.feePaidPence,
                cakes: lines.map((l) => l.name).join(" and "),
              })
            : null
        }
        redeliver={{
          dayLong: formatLongDate(nextDay, today),
          feePence: s?.secondAttemptFeePence ?? 0,
          publishableKey: PUBLISHABLE_KEY(),
          action: redeliverAction.bind(null, token),
          finish: finishRedeliveryAction.bind(null, token),
        }}
      />
    );
  } finally {
    await close();
  }
}
