import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { ChangeOrderForm } from "@/components/admin/change-order/change-order-form";
import { connect, databaseUrl } from "@/db/client";
import { editableOptions, lineCakes, sizeChoices } from "@/db/change-repo";
import { waitingChange } from "@/db/admin-change-repo";
import { netPaid } from "@/db/refund-repo";
import { orderLines, orders } from "@/db/schema";
import type { Answers } from "@/lib/cake-config";
import { readSettings } from "@/db/settings-repo";
import { formFromOrder } from "@/lib/admin/change-order";
import { requireMember } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";

export const metadata: Metadata = { title: "Change the order" };
export const instant = false;

// Change the order (§9.7; 1250:9221, phone 1251:9261): both roles; a manual order gets Edit the order (8.6d).
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await connection();
  const { member } = await requireMember();
  const number = decodeURIComponent((await params).number);
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const [o] = await db.select().from(orders).where(eq(orders.number, number));
    if (!o) notFound();
    if (o.status !== "confirmed" || o.kind === "manual")
      redirect(`/admin/orders/${o.number}`);
    // One waiting change at a time (§9.7): Change the order waits until it is paid or cancelled.
    if (await waitingChange(db, o.id)) redirect(`/admin/orders/${o.number}`);
    const lines = await db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const [s, paid, sizes, cakesNow] = await Promise.all([
      readSettings(db),
      netPaid(db, o),
      sizeChoices(db, lines),
      lineCakes(db, lines),
    ]);
    const cakes = lines.map((l) => ({
      id: l.id,
      name: l.name,
      sizeLine: l.sizeLine,
      message: l.message,
      sizes: sizes[l.id] ?? [],
      optionViews: cakesNow[l.id]?.options ?? [],
      answers: editableOptions(l)
        ? ((l.answers as Answers | null) ?? { picks: {}, texts: {} })
        : null,
      optionsPaidPence: l.pricePence - (l.sizePricePence ?? l.pricePence),
    }));
    return (
      // A fresh form on every visit: the site keeps an earlier visit's screen, and its unsaved edits must not return.
      <ChangeOrderForm
        key={`${o.version}-${Date.now()}`}
        orderId={o.id}
        number={o.number}
        version={o.version}
        initial={formFromOrder({
          ...o,
          date: String(o.date),
          earliestDate: String(o.earliestDate),
        })}
        owner={member.role === "owner"}
        today={londonDate(new Date())}
        districts={s.postcodeDistricts}
        cakes={cakes}
        money={{
          totalPence: o.totalPence,
          chargePence: o.deliveryChargePence,
          chargeNowPence: s.deliveryChargePence,
          paidPence: paid,
          handover: o.handover,
        }}
      />
    );
  } finally {
    await close();
  }
}
