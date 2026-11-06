import { NextResponse } from "next/server";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";

/**
 * GET /api/jobs/mail (§12 Continuously: the mail retry queue): sends what is due. The scheduler calls it with
 * `Authorization: Bearer {CRON_SECRET}`; anyone else gets 401.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!databaseUrl()) return NextResponse.json({ skipped: "no database" });
  const { db, close } = connect();
  try {
    return NextResponse.json(await processMail(db, mailTransport(), SITE_URL));
  } finally {
    await close();
  }
}
