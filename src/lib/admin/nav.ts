// The admin's places (§9.1): the sidebar on desktop, the tab bar and More on the phone. A Helper sees only Today and
// Orders (§9.15, Decided D9); everything else is the Owner's.
export type NavItem = {
  key: string;
  label: string;
  href: string;
  owner: boolean;
};

export const NAV: NavItem[] = [
  { key: "today", label: "Today", href: "/admin/today", owner: false },
  { key: "orders", label: "Orders", href: "/admin/orders", owner: false },
  { key: "money", label: "Money", href: "/admin/money", owner: true },
  {
    key: "enquiries",
    label: "Enquiries",
    href: "/admin/enquiries",
    owner: true,
  },
  { key: "cakes", label: "Cakes", href: "/admin/cakes", owner: true },
  {
    key: "availability",
    label: "Availability",
    href: "/admin/availability",
    owner: true,
  },
  { key: "content", label: "Content", href: "/admin/content", owner: true },
  { key: "gallery", label: "Gallery", href: "/admin/gallery", owner: true },
  {
    key: "reviews",
    label: "Google reviews",
    href: "/admin/testimonials",
    owner: true,
  },
  { key: "emails", label: "Emails", href: "/admin/emails", owner: true },
  { key: "settings", label: "Settings", href: "/admin/settings", owner: true },
  { key: "team", label: "Team", href: "/admin/team", owner: true },
];

/** The phone's tab bar: Today · Orders · Cakes · More (a Helper: Today · Orders · More). */
export const TABS = ["today", "orders", "cakes"] as const;

export const navFor = (role: string) =>
  NAV.filter((n) => role === "owner" || !n.owner);

/** The sidebar item of a screen: itself or its parent (Order detail → Orders, The hero → Content, complaints and
 *  website messages → Enquiries). */
export function activeKey(pathname: string): string | null {
  const seg = pathname.split("/")[2] ?? "";
  if (seg === "complaints" || seg === "messages") return "enquiries";
  if (seg === "testimonials") return "reviews";
  return NAV.find((n) => n.href === `/admin/${seg}`)?.key ?? null;
}

/** The phone tab of a screen: a tab root or its child, else More (everything opened from More). */
export function activeTab(pathname: string): string {
  const key = activeKey(pathname);
  return key && (TABS as readonly string[]).includes(key) ? key : "more";
}
