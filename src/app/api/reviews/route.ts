import { NextResponse, type NextRequest } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { countReviewCards, readReviewCards } from "@/db/reviews-repo";
import { parseAfter, parseLimit } from "@/lib/reviews";

/**
 * GET /api/reviews?after={cursor}&limit=6 (§4.1, Decided 2026-10-22): the next cards, text only
 * (id, stars, name, month, text), newest first. `after` = how many cards the page already has.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const after = parseAfter(params.get("after"));
  const limit = parseLimit(params.get("limit"));
  if (!databaseUrl())
    return NextResponse.json({ reviews: [], next: null, total: 0 });
  const { db, close } = connect();
  try {
    const [reviews, total] = await Promise.all([
      readReviewCards(db, after, limit),
      countReviewCards(db),
    ]);
    const end = after + reviews.length;
    return NextResponse.json(
      { reviews, next: end < total ? String(end) : null, total },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } finally {
    await close();
  }
}
