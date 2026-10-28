// The seven navigation items (ANIMATIONS §3.2) and the active item of each page (§3.3).

export type NavItem = {
  label: string;
  href: string;
  /** Rendered width of the word in px; each item box keeps this width (STYLE-01, A§8). */
  width: number;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/", width: 40 },
  { label: "Cakes", href: "/cakes", width: 40 },
  { label: "Bespoke", href: "/bespoke", width: 57 },
  { label: "Gallery", href: "/gallery", width: 48 },
  { label: "About Linda", href: "/about", width: 81 },
  { label: "FAQ", href: "/faq", width: 28 },
  { label: "Contact", href: "/contact", width: 53 },
];

/** Gap between items in the desktop navigation (A§8): the group is 539 px wide. */
export const NAV_GAP = 32;

/** Left edge of each item inside the navigation group, in px. */
export const NAV_LEFTS: readonly number[] = NAV_ITEMS.map((_, i) =>
  NAV_ITEMS.slice(0, i).reduce((x, item) => x + item.width + NAV_GAP, 0),
);

const startsWith = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);

/** Index of the active item for a path, or -1 for pages with no active item (A§3.3). */
export function activeIndexFor(pathname: string): number {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (path === "/") return 0;
  // Cakes: the full range, the cake page and the order steps 2–4 and Order confirmed.
  if (startsWith(path, "/cakes") || startsWith(path, "/order")) return 1;
  // Bespoke: the enquiry, Enquiry sent and Your enquiry (read-only).
  if (startsWith(path, "/bespoke") || startsWith(path, "/my-enquiry")) return 2;
  if (startsWith(path, "/gallery")) return 3;
  if (path === "/about") return 4;
  if (path === "/faq") return 5;
  // Contact and Message sent.
  if (startsWith(path, "/contact")) return 6;
  return -1;
}
