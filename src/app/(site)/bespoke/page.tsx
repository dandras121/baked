import type { Metadata } from "next";
import { connection } from "next/server";
import { BespokePage } from "@/components/bespoke/bespoke-page";
import { connect, databaseUrl } from "@/db/client";
import { inspiredPhoto } from "@/db/enquiry-repo";
import { blobConnected } from "@/lib/storage";
import { getSiteSettings } from "@/db/site-settings";
import { londonDate } from "@/lib/london-time";
import { sendEnquiry } from "./actions";

export const metadata: Metadata = {
  title: "Bespoke enquiry",
  description:
    "Tell Linda about the cake you have in mind — most of it is tap-and-go, and she replies within 24 hours.",
};

// The bespoke enquiry (§7.1): read on every visit, as today's date and the gallery photo it came from change it.
export const instant = false;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ inspired?: string }>;
}) {
  await connection();
  const settings = await getSiteSettings();
  const id = Number((await searchParams).inspired);
  let inspired = null;
  if (id && databaseUrl()) {
    const { db, close } = connect();
    try {
      const p = await inspiredPhoto(db, id);
      if (p) inspired = { id: p.id, caption: p.caption, src: p.imagePath };
    } finally {
      await close();
    }
  }
  return (
    <BespokePage
      settings={settings}
      today={londonDate(new Date())}
      inspired={inspired}
      direct={blobConnected()}
      action={sendEnquiry}
    />
  );
}
