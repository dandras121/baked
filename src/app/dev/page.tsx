import Link from "next/link";

// The index of developer pages. Each slice of phase 0 adds its page here.
const devPages: {
  href:
    | "/dev/tokens"
    | "/dev/layout"
    | "/dev/motion"
    | "/dev/components"
    | "/dev/error-500";
  title: string;
  slice: string;
}[] = [
  {
    href: "/dev/tokens",
    title: "Design tokens — colours, type, radii, shadows, spacing, motion",
    slice: "0.2",
  },
  { href: "/dev/layout", title: "Layout and breakpoints", slice: "0.3" },
  { href: "/dev/motion", title: "Interaction and motion", slice: "0.4" },
  { href: "/dev/components", title: "Base components", slice: "0.5" },
  {
    href: "/dev/error-500",
    title: "500 page preview (Something went wrong)",
    slice: "1.6",
  },
];

export default function DevIndex() {
  return (
    <main className="dev-page">
      <h1 className="type-wordmark">Developer pages</h1>
      <p>Pages for checking the building blocks of the site, slice by slice.</p>
      <ul>
        {devPages.map((page) => (
          <li key={page.href}>
            <Link href={page.href}>{page.title}</Link> (slice {page.slice})
          </li>
        ))}
      </ul>
    </main>
  );
}
