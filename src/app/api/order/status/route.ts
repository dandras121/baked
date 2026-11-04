import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { confirmationState } from "@/db/confirm-repo";
import { DRAFT_COOKIE } from "@/db/draft-repo";
import { gateway } from "@/lib/payments";

/** GET /api/order/status: what `/order/confirmed` polls while the confirmation is on its way (§5.5 Success). */
export async function GET() {
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!databaseUrl())
    return NextResponse.json({ state: "none" }, { headers: NO_STORE });
  const { db, close } = connect();
  try {
    const state = await confirmationState(db, id, gateway());
    return NextResponse.json({ state }, { headers: NO_STORE });
  } finally {
    await close();
  }
}

const NO_STORE = { "Cache-Control": "private, no-store" };
