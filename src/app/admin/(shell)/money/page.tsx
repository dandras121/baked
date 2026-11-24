import type { Metadata } from "next";
import { connection } from "next/server";
import { MoneyScreen } from "@/components/admin/money/money-screen";
import { connect, databaseUrl } from "@/db/client";
import { moneyFlags } from "@/db/money-flags-repo";
import { moneyScreen } from "@/db/money-screen-repo";
import { requireMember } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";

export const metadata: Metadata = { title: "Money" };
export const instant = false;

// Money (§9.9; 934:8321, phone 1251:9519): Owner only.
export default async function Page() {
  await connection();
  await requireMember("owner");
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const now = new Date();
    const [d, flags] = await Promise.all([
      moneyScreen(db, now),
      moneyFlags(db, now),
    ]);
    return (
      <MoneyScreen
        d={d}
        flags={flags}
        today={londonDate(now)}
        stripeLive={(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live")}
      />
    );
  } finally {
    await close();
  }
}
