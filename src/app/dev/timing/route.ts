// Developer page (removed in 10.2): where the server and the database are, and how long the admin's reads take.
// Shows only the region part of the database host, never the address or a password.
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { connect, databaseUrl } from "@/db/client";
import { orderDetail } from "@/db/order-detail-repo";
import { listOrders, ordersYear } from "@/db/orders-list-repo";
import { todayBoard, todayNumbers } from "@/db/today-repo";
import { londonDate } from "@/lib/london-time";

export async function GET() {
  await connection();
  const url = databaseUrl();
  if (!url) return Response.json({ error: "no database" });
  const host = new URL(url).hostname;
  const region = host.split(".").slice(1).join(".");
  const { db } = connect();
  const time = async (name: string, run: () => Promise<unknown>) => {
    const t = performance.now();
    await run();
    return [name, Math.round(performance.now() - t)] as const;
  };
  const today = londonDate(new Date());
  const out: (readonly [string, number])[] = [];
  out.push(await time("first select 1", () => db.execute(sql`select 1`)));
  for (let i = 0; i < 3; i++) out.push(await time("select 1", () => db.execute(sql`select 1`)));
  out.push(await time("todayBoard", () => todayBoard(db, today)));
  const rows = await todayBoard(db, today);
  out.push(await time("todayNumbers", () => todayNumbers(db, today, rows)));
  out.push(await time("listOrders", () => listOrders(db, { filter: "all", shown: 20, today })));
  out.push(await time("ordersYear", () => ordersYear(db, today)));
  const [first] = (await listOrders(db, { filter: "all", shown: 1, today })).rows;
  if (first) out.push(await time("orderDetail", () => orderDetail(db, first.number)));
  return Response.json({
    serverRegion: process.env.VERCEL_REGION ?? "local",
    databaseRegion: region,
    ms: Object.fromEntries(out.map(([k, v], i) => [`${i} ${k}`, v])),
  });
}
