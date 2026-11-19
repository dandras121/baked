import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EnquirySent } from "@/components/bespoke/enquiry-pages";
import { getSiteSettings } from "@/db/site-settings";
import { sentTokenValid } from "@/lib/sent-token";

export const metadata: Metadata = {
  title: "Enquiry sent",
  robots: { index: false, follow: false },
};

export const instant = false;

/**
 * Enquiry sent (§7.2; 654:3805, phone 839:6936, tablet 1558:11653). Shown only straight after a send: a signed link
 * that keeps the reference for 10 minutes (a refresh still works); opened any other way it goes back to /bespoke.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; t?: string }>;
}) {
  await connection();
  const { ref = "", t = null } = await searchParams;
  if (!/^BBL-\d{4}-E-\d{4,}$/.test(ref) || !sentTokenValid(`bespoke:${ref}`, t))
    redirect("/bespoke");
  const settings = await getSiteSettings();
  return <EnquirySent reference={ref} phone={settings?.phone ?? null} />;
}
