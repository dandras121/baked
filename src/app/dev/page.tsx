import Link from "next/link";

// The index of developer pages. Each slice of phase 0 adds its page here.
const devPages: {
  href: "/dev/tokens" | "/dev/layout" | "/dev/motion";
  title: string;
  slice: string;
}[] = [
  {
    href: "/dev/tokens",
    title: "Design tokens — colours, type, radii, shadows, spacing, motion",
    slice: "0.2",
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
