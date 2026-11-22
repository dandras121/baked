import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { ChangeOrderForm } from "@/components/admin/change-order/change-order-form";
import { connect, databaseUrl } from "@/db/client";
import { netPaid } from "@/db/refund-repo";
import { orders } from "@/db/schema";
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
    const [s, paid] = await Promise.all([readSettings(db), netPaid(db, o)]);
    return (
      <ChangeOrderForm
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
