import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { DRAFT_COOKIE, draftLineViews, liveDraft } from "@/db/draft-repo";
import { EMPTY_ORDER, myOrder } from "@/lib/my-order";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } };

/**
 * GET /api/order (slice 4.2c): this visitor's cakes for the “My order” button, or none. Reads the httpOnly draft
 * cookie, so the pages themselves stay static; without a cookie it answers at once, without the database.
 */
export async function GET() {
  const id = (await cookies()).get(DRAFT_COOKIE)?.value;
  if (!id || !databaseUrl()) return NextResponse.json(EMPTY_ORDER, NO_STORE);
  const { db, close } = connect();
  try {
    const draft = await liveDraft(db, id);
    if (!draft) return NextResponse.json(EMPTY_ORDER, NO_STORE);
    return NextResponse.json(
      myOrder(await draftLineViews(db, draft.id)),
      NO_STORE,
    );
  } finally {
    await close();
  }
}
