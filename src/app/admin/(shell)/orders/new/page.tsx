import type { Metadata } from "next";
import { connection } from "next/server";
import { AddOrderForm } from "@/components/admin/add-order/add-order-form";
import { connect, databaseUrl } from "@/db/client";
import { readSettings } from "@/db/settings-repo";
import { requireMember } from "@/lib/admin/session";
import { londonDate } from "@/lib/london-time";

export const metadata: Metadata = { title: "Add an order" };
export const instant = false;

// Add an order (§9.6; 1607:10612, phone 1607:10782): Owner only.
export default async function Page() {
  await connection();
  await requireMember("owner");
  if (!databaseUrl()) return null;
  const { db, close } = connect();
  try {
    const s = await readSettings(db);
    return (
      <AddOrderForm
        today={londonDate(new Date())}
        districts={s.postcodeDistricts}
      />
    );
  } finally {
    await close();
  }
}
