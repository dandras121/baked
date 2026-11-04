import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { reconcile } from "@/db/confirm-repo";
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
    return NextResponse.json(await reconcile(db, gw));
  } finally {
    await close();
  }
}
