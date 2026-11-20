"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeKey, activeTab, navFor, TABS } from "@/lib/admin/nav";
import styles from "./admin-shell.module.css";

/** The sidebar list (930:8062): the active item is the screen or its parent (§9.1). */
export function SidebarNav({ role }: { role: string }) {
  const active = activeKey(usePathname());
  return (
    <ul className={styles.navList}>
      {navFor(role).map((n) => (
        <li key={n.key}>
          <Link
            href={n.href}
            className={styles.navItem}
            aria-current={n.key === active ? "page" : undefined}
          >
            {n.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The phone tab bar (946:8789): Today · Orders · Cakes · More; a Helper has no Cakes. */
export function TabBar({ role }: { role: string }) {
  const active = activeTab(usePathname());
  const items = navFor(role).filter((n) =>
    (TABS as readonly string[]).includes(n.key),
  );
  return (
    <nav className={styles.tabBar} aria-label="Admin">
      {[...items, { key: "more", label: "More", href: "/admin/more" }].map(
        (t) => (
          <Link
            key={t.key}
            href={t.href}
            className={styles.tab}
            aria-current={t.key === active ? "page" : undefined}
          >
            <span className={styles.tabDot} aria-hidden />
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
