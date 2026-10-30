// Cake addresses (§11.3): only a visible, not deleted cake has a page; any other /cakes/{slug} is a real
// 404 (status 404, not the 404 page sent with 200). The list is read from the database and kept for a
// minute, so showing or hiding a cake in the admin takes effect without a deploy.
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { cakes } from "@/db/schema";

const TTL_MS = 60_000;
let known: { slugs: Set<string>; at: number } | null = null;

async function visibleSlugs(): Promise<Set<string>> {
  if (known && Date.now() - known.at < TTL_MS) return known.slugs;
  if (!databaseUrl()) return new Set();
  const { db, close } = connect();
  try {
    const rows = await db
      .select({ slug: cakes.slug })
      .from(cakes)
      .where(and(eq(cakes.visible, true), isNull(cakes.deletedAt)));
    known = { slugs: new Set(rows.map((r) => r.slug)), at: Date.now() };
    return known.slugs;
  } finally {
    await close();
  }
}

export async function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  if ((await visibleSlugs()).has(slug)) return NextResponse.next();
  // Any address the site does not know renders the 404 page with status 404 (the catch-all route).
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = { matcher: "/cakes/:slug" };
