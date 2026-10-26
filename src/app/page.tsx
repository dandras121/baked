import Link from "next/link";

// Temporary build placeholder. The real Home page is slice 2.1.
export default function Home() {
  return (
    <main className="dev-page">
      <h1>Baked by Linda</h1>
      <p>The new site is being built. Nothing here is live yet.</p>
      <p>
        <Link href="/dev">Developer pages</Link>
      </p>
    </main>
  );
}
