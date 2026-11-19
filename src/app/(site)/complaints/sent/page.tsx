import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ComplaintSent } from "@/components/complaints/complaint-sent";
import { connect, databaseUrl } from "@/db/client";
import { complaintByReference } from "@/db/complaint-repo";
import { complaintSummary } from "@/lib/complaint";
import { sentTokenValid } from "@/lib/sent-token";

export const metadata: Metadata = {
  title: "Complaint sent",
  robots: { index: false, follow: false },
};

export const instant = false;

/**
 * Complaint sent (§7.5; L 1253:9529, phone 1253:9542): the reference with the matched order and the start of what's
 * wrong, and the five-working-day promise. Only straight after a send (a signed link, 10 minutes); otherwise
 * /complaints.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; t?: string }>;
}) {
  await connection();
  const { ref = "", t = null } = await searchParams;
  if (
    !/^BBL-\d{4}-C-\d{4,}$/.test(ref) ||
    !sentTokenValid(`complaint:${ref}`, t) ||
    !databaseUrl()
  )
    redirect("/complaints");
  const { db, close } = connect();
  let row: Awaited<ReturnType<typeof complaintByReference>> | null = null;
  try {
    row = await complaintByReference(db, ref);
  } finally {
    await close();
  }
  if (!row) redirect("/complaints");
  return (
    <ComplaintSent reference={row.reference} summary={complaintSummary(row)} />
  );
}
