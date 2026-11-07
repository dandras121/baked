// Checkout steps (§10.2) open only with a live draft; without one they go to /cakes.
// Message sent (§7.4) is shown only after a send (a signed link valid 10 minutes); opened directly it goes to the form.
// Cake addresses (§11.3): only a visible, not deleted cake has a page; any other /cakes/{slug} is a real 404 (status 404, not the 404 page sent with 200). The list is read from the database and kept for a
// minute, so showing or hiding a cake in the admin takes effect without a deploy.
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { connect, databaseUrl } from "@/db/client";
import { DRAFT_COOKIE, draftStatus } from "@/db/draft-repo";
import { cakes, deliveryAttempts } from "@/db/schema";
import { sentTokenValid } from "@/lib/sent-token";

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

/** What the bbl_session cookie points at: a live draft, one cleared after a day without changes, or none (§10.2). */
async function draftOf(request: NextRequest) {
  const id = request.cookies.get(DRAFT_COOKIE)?.value;
  if (!id || !databaseUrl()) return "none" as const;
  const { db, close } = connect();
  try {
    return await draftStatus(db, id);
  } finally {
    await close();
  }
}

/** A delivery link (§6.8) exists once Nobody was in gave the attempt its token; anything else is a real 404 (§10.5). */
async function deliveryKnown(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token) || !databaseUrl()) return false;
  const { db, close } = connect();
  try {
    const rows = await db
      .select({ id: deliveryAttempts.id })
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.token, token));
    return rows.length > 0;
  } finally {
    await close();
  }
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/delivery/")) {
    const token = request.nextUrl.pathname.split("/")[2] ?? "";
    if (await deliveryKnown(token)) return NextResponse.next();
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  // §6.10: a POST to the unsubscribe link (its button, or the mail app's RFC 8058 one-click) is handled by the API
  // route of the same token; opening the link (GET) shows the page and changes nothing.
  if (request.nextUrl.pathname.startsWith("/unsubscribe/")) {
    if (request.method !== "POST") return NextResponse.next();
    const to = request.nextUrl.clone();
    to.pathname = `/api${request.nextUrl.pathname}`;
    return NextResponse.rewrite(to);
  }
  // /order/confirmed shows a draft that is being paid or paid; the page reads the cookie itself (§5.6).
  if (request.nextUrl.pathname === "/order/confirmed")
    return NextResponse.next();
  // A checkout step opened without a draft goes to the range (§10.2 Opening a step directly).
  if (request.nextUrl.pathname.startsWith("/order/")) {
    const status = await draftOf(request);
    if (status === "live") return NextResponse.next();
    // Back to a step after paying: the confirmation (§5.6).
    if (status === "paid")
      return NextResponse.redirect(new URL("/order/confirmed", request.url));
    // A cleared draft: /cakes says so (“Your order was cleared after a day without changes.”).
    const to = new URL("/cakes", request.url);
    if (status === "cleared") to.searchParams.set("cleared", "1");
    return NextResponse.redirect(to);
  }
  if (request.nextUrl.pathname === "/contact/sent") {
    if (sentTokenValid("contact", request.nextUrl.searchParams.get("t")))
      return NextResponse.next();
    const back = NextResponse.redirect(new URL("/contact", request.url));
    // The page is private (§2): its redirect says so too, as next.config's header does for the page.
    back.headers.set("X-Robots-Tag", "noindex, nofollow");
    return back;
  }
  const slug = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  if ((await visibleSlugs()).has(slug)) return NextResponse.next();
  // Any address the site does not know renders the 404 page with status 404 (the catch-all route).
  return NextResponse.rewrite(new URL("/__not-found", request.url));
}

export const config = {
  matcher: [
    "/cakes/:slug",
    "/contact/sent",
    "/delivery/:token",
    "/order/:path*",
    "/unsubscribe/:token",
  ],
};
