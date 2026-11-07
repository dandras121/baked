import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { SITE_URL } from "@/app/layout";
import { reconcile } from "@/db/confirm-repo";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";
import { gateway } from "@/lib/payments";

/**
 * GET /api/jobs/reconcile (§12, every 10 minutes): the scheduler calls it with `Authorization: Bearer {CRON_SECRET}`
 * (Vercel Cron sends exactly this). Anyone else gets 401.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const gw = gateway();
  if (!gw || !databaseUrl())
    return NextResponse.json({ skipped: "payments are off" });
  const { db, close } = connect();
  try {
    const seen = await reconcile(db, gw);
    if (seen.confirmed) await processMail(db, mailTransport(), SITE_URL);
    return NextResponse.json(seen);
  } finally {
    await close();
  }
}
