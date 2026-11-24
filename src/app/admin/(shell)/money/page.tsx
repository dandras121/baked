import type { Metadata } from "next";
import { connection } from "next/server";
import { MoneyScreen } from "@/components/admin/money/money-screen";
import { connect, databaseUrl } from "@/db/client";
import { moneyScreen } from "@/db/money-screen-repo";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Money" };
export const instant = false;

// Money (§9.9; 934:8321, phone 1251:9519): Owner only.
export default async function Page() {
  await connection();
  await requireMember("owner");
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    return <MoneyScreen d={await moneyScreen(db)} />;
  } finally {
    await close();
  }
}
