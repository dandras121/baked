// The index of developer pages. Each slice of phase 0 adds its page here.
const devPages: { href: string; title: string; slice: string }[] = [];

export default function DevIndex() {
  return (
    <main className="dev-page">
      <h1>Developer pages</h1>
      <p>Pages for checking the building blocks of the site, slice by slice.</p>
      {devPages.length === 0 ? (
        <p>
          No developer pages yet. The first one, /dev/tokens, arrives in slice
          0.2.
        </p>
      ) : (
        <ul>
          {devPages.map((page) => (
            <li key={page.href}>
              <a href={page.href}>{page.title}</a> (slice {page.slice})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
