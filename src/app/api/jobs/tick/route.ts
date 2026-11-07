import { NextResponse } from "next/server";
import { SITE_URL } from "@/app/layout";
import { connect, databaseUrl } from "@/db/client";
import { runDueJobs } from "@/db/jobs-repo";
import { processMail } from "@/db/mail-repo";
import { mailTransport } from "@/lib/mail/transport";

/**
 * GET /api/jobs/tick (§12): every 15 minutes the scheduler runs the daily jobs that are due today (London time) and
 * not yet done, then sends the mail queue. `Authorization: Bearer {CRON_SECRET}`; anyone else gets 401.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!databaseUrl()) return NextResponse.json({ skipped: "no database" });
  const { db, close } = connect();
  try {
    const jobs = await runDueJobs(db);
    const mail = await processMail(db, mailTransport(), SITE_URL);
    return NextResponse.json({ jobs, mail });
  } finally {
    await close();
  }
}
