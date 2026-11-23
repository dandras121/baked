import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { AddOrderForm } from "@/components/admin/add-order/add-order-form";
import { ChangeOrderForm } from "@/components/admin/change-order/change-order-form";
import { connect, databaseUrl } from "@/db/client";
import { editableOptions, lineCakes, sizeChoices } from "@/db/change-repo";
import { addableCakes, waitingChange } from "@/db/admin-change-repo";
import { netPaid } from "@/db/refund-repo";
import { orderLines, orders } from "@/db/schema";
import type { Answers } from "@/lib/cake-config";
import { readSettings } from "@/db/settings-repo";
import { formFromManual } from "@/lib/admin/add-order";
import { formFromOrder } from "@/lib/admin/change-order";
import { requireMember } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";
import { blobMode } from "@/lib/storage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  // The tab title follows the screen: a manual order is edited, not changed.
  const number = decodeURIComponent((await params).number);
  if (!databaseUrl()) return { title: "Change the order" };
  const { db, close } = connect();
  try {
    const [o] = await db
      .select({ kind: orders.kind })
      .from(orders)
      .where(eq(orders.number, number));
    return {
      title: o?.kind === "manual" ? "Edit the order" : "Change the order",
    };
  } finally {
    await close();
  }
}
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
    if (o.status !== "confirmed") redirect(`/admin/orders/${o.number}`);
    if (o.kind === "manual")
      return await editPage(db, o, member.role === "owner");
    // One waiting change at a time (§9.7): Change the order waits until it is paid or cancelled.
    if (await waitingChange(db, o.id)) redirect(`/admin/orders/${o.number}`);
    const lines = await db
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, o.id))
      .orderBy(orderLines.position);
    const owner = member.role === "owner";
    const [s, paid, sizes, cakesNow, designs] = await Promise.all([
      readSettings(db),
      netPaid(db, o),
      sizeChoices(db, lines),
      lineCakes(db, lines),
      owner ? addableCakes(db) : Promise.resolve([]),
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
      pricePence: l.pricePence,
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
        designs={designs}
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

type Db = ReturnType<typeof connect>["db"];

/** Edit the order (§9.7, manual orders): the Add an order form, filled in; Paid so far is not editable. */
async function editPage(db: Db, o: typeof orders.$inferSelect, owner: boolean) {
  const [line] = await db
    .select()
    .from(orderLines)
    .where(eq(orderLines.orderId, o.id))
    .orderBy(orderLines.position);
  const [s, paid] = await Promise.all([readSettings(db), netPaid(db, o)]);
  const snap = (o.snapshot ?? {}) as { alsoContains?: string };
  return (
    <AddOrderForm
      key={`${o.version}-${Date.now()}`}
      today={londonDate(new Date())}
      districts={s.postcodeDistricts}
      direct={blobMode()}
      edit={{
        orderId: o.id,
        number: o.number,
        version: o.version,
        initial: formFromManual(
          { ...o, date: String(o.date) },
          line,
          snap.alsoContains ?? "",
        ),
        paidPence: paid,
        owner,
      }}
    />
  );
}
