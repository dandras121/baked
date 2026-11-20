import type { Metadata } from "next";
import { connection } from "next/server";
import { OrdersScreen } from "@/components/admin/orders/orders-screen";
import { connect, databaseUrl } from "@/db/client";
import { listOrders, ordersYear } from "@/db/orders-list-repo";
import { ordersSubtitle, readFilter, readShown } from "@/lib/admin/orders";
import { requireMember } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";

export const metadata: Metadata = { title: "Orders" };
export const instant = false;

// Orders (§9.4; 934:8201, phone 948:8869). Filter, search and how many are shown live in the URL (§9.1 Lists).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; shown?: string }>;
}) {
  await connection();
  const { member } = await requireMember();
  const owner = member.role === "owner";
  const sp = await searchParams;
  const filter = readFilter(sp.filter, owner);
  const shown = readShown(sp.shown);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const today = londonDate(new Date());
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const [list, year] = await Promise.all([
      listOrders(db, { filter, q, shown, today }),
      owner ? ordersYear(db, today) : Promise.resolve(null),
    ]);
    return (
      <OrdersScreen
        owner={owner}
        subtitle={year && ordersSubtitle(year.count, year.taken, year.still)}
        filter={filter}
        q={q.length >= 2 ? q : ""}
        shown={shown}
        rows={list.rows}
        total={list.total}
        today={today}
      />
    );
  } finally {
    await close();
  }
}
