import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import styles from "@/components/admin/admin-pages.module.css";
import { moreCounts } from "@/db/admin-counts-repo";
import { connect, databaseUrl } from "@/db/client";
import { navFor, TABS } from "@/lib/admin/nav";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "More" };
export const instant = false;

// More (phone, 950:8939): the places that are not tabs, each with its number, and Sign out. A Helper: Sign out only.
export default async function Page() {
  await connection();
  const { member } = await requireMember();
  const items = navFor(member.role).filter(
    (n) => !(TABS as readonly string[]).includes(n.key),
  );
  let counts: Record<string, string> = {};
  if (items.length && databaseUrl()) {
    const { db, close } = connect();
    try {
      counts = await moreCounts(db);
    } finally {
      await close();
    }
  }
  return (
    <>
      <h1 className={styles.title}>More</h1>
      <ul className={styles.moreList}>
        {items.map((n) => (
          <li key={n.key}>
            <Link href={n.href} className={styles.moreRow}>
              <span className={styles.moreLabel}>{n.label}</span>
              {counts[n.key] && (
                <span className={styles.moreCount}>{counts[n.key]}</span>
              )}
              <span className={styles.chevron} aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
        <li>
          <form action="/admin/sign-out" method="post">
            <button type="submit" className={styles.moreRow}>
              <span className={styles.moreLabel}>Sign out</span>
              <span className={styles.chevron} aria-hidden>
                ›
              </span>
            </button>
          </form>
        </li>
      </ul>
    </>
  );
}
