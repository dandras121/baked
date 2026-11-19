import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { YourEnquiry } from "@/components/bespoke/enquiry-pages";
import { connect, databaseUrl } from "@/db/client";
import { enquiryByToken } from "@/db/enquiry-repo";
import { getSiteSettings } from "@/db/site-settings";
import { enquiryPageRows, type EnquiryAnswers } from "@/lib/bespoke";
import { formatLongDate, londonDate } from "@/lib/london-time";
import { phoneForPeople } from "@/lib/phone";

export const metadata: Metadata = {
  title: "Your enquiry",
  robots: { index: false, follow: false },
};

export const instant = false;

/**
 * Your enquiry (§7.2; 1609:10885, tablet 1609:11227, phone 1609:11066), from e-mail 6. Read-only, no second check (the
 * link went only to the address that sent it); 12 months from sending; expired, unknown or possible spam → 404.
 * noindex and no-referrer (next.config, §10.5).
 */
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  if (!databaseUrl()) notFound();
  const { db, close } = connect();
  let found: Awaited<ReturnType<typeof enquiryByToken>> = null;
  try {
    found = await enquiryByToken(db, token);
  } finally {
    await close();
  }
  if (!found) notFound();
  const settings = await getSiteSettings();
  const today = londonDate(new Date());
  return (
    <YourEnquiry
      v={{
        reference: found.reference,
        sent: formatLongDate(londonDate(found.createdAt), today),
        rows: enquiryPageRows(
          found.answers as EnquiryAnswers,
          {
            email: found.email,
            phone: found.phone ? phoneForPeople(found.phone) : null,
          },
          today,
          found.pictures,
        ),
        inspired: found.inspired,
        email: settings?.email ?? "",
      }}
    />
  );
}
