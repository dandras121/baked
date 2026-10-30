// Which addresses search engines may index (SITE-FLOWS §2 “Index” column, §10.5, §10.12).

/** Public pages with Index = yes (§2). Cake pages join when the catalogue exists (slice 3.x). */
export const INDEXED_PAGES = [
  "/",
  "/cakes",
  "/bespoke",
  "/gallery",
  "/about",
  "/faq",
  "/contact",
  "/find-my-order",
  "/complaints",
  "/terms",
  "/privacy",
  "/cookies",
  "/delivery-and-collection",
  "/cancellations",
  "/accessibility",
  "/allergens",
] as const;

/** Index = no (§2): never indexed, never in the sitemap. */
export const NOINDEX_PATHS = [
  "/order/:path*",
  "/bespoke/sent",
  "/contact/sent",
  "/complaints/sent",
  "/my-order/:path*",
  "/pay/:path*",
  "/delivery/:path*",
  "/unsubscribe/:path*",
  "/my-enquiry/:path*",
  "/admin/:path*",
  "/admin",
  "/dev/:path*",
  "/dev",
] as const;

/** Token pages: noindex and no referrer (§10.5, CLAUDE.md rule 10). */
export const TOKEN_PATHS = [
  "/my-order/:path*",
  "/pay/:path*",
  "/delivery/:path*",
  "/unsubscribe/:path*",
  "/my-enquiry/:path*",
] as const;
