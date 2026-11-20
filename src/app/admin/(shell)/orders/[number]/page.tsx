import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OrderDetailScreen } from "@/components/admin/order/order-detail-screen";
import { connect, databaseUrl } from "@/db/client";
import { isClosed } from "@/db/delivery-repo";
import { orderDetail } from "@/db/order-detail-repo";
import { readSettings } from "@/db/settings-repo";
import { requireMember } from "@/lib/admin/session";
import { addDays, londonDate } from "@/lib/london-time";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  return { title: decodeURIComponent((await params).number) };
}

// Order detail (§9.5; 936:8285, phone 948:8816). “‹ Back to …” names the screen it was opened from (§9.1).
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await connection();
  const { member } = await requireMember();
  const number = decodeURIComponent((await params).number);
  const { from } = await searchParams;
  if (!databaseUrl()) return null;
  const today = londonDate(new Date());
  const { db, close } = connect();
  try {
    const [d, settings, closedTomorrow] = await Promise.all([
      orderDetail(db, number),
      readSettings(db),
      isClosed(db, addDays(today, 1)),
    ]);
    if (!d) notFound();
    return (
      <OrderDetailScreen
        d={d}
        owner={member.role === "owner"}
        today={today}
        back={
          from === "today"
            ? { href: "/admin/today", label: "Back to today" }
            : { href: "/admin/orders", label: "Back to orders" }
        }
        feePence={settings.secondAttemptFeePence}
        closedTomorrow={closedTomorrow}
        stripeLive={(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live")}
        kitchen={settings.addressLine}
      />
    );
  } finally {
    await close();
  }
}
