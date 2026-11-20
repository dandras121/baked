import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarNav, TabBar } from "./admin-nav";
import { HomeScreenPrompt } from "./home-screen-prompt";
import { OfflineLine } from "./offline-line";
import styles from "./admin-shell.module.css";

/**
 * The admin frame (§9.1): from 1024 px the dark sidebar (930:8062, 220 wide, fixed; its footer with the name and
 * sign out), below it the dark top bar (946:8775, scrolls away) and the white tab bar fixed to the bottom
 * (946:8789). Content: 40 padding, at most 1180 wide; on the phone centred, at most 640.
 */
export function AdminShell({
  member,
  children,
}: {
  member: { name: string; role: string };
  children: ReactNode;
}) {
  const role = member.role === "owner" ? "Owner" : "Helper";
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Admin">
        <Link
          href="/admin/today"
          className={styles.logo}
          aria-label="Baked by Linda admin — Today"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" className={styles.mark} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark.svg" alt="" className={styles.wordmark} />
          <span className={styles.tag}>Admin</span>
        </Link>
        <nav aria-label="Admin sections" className={styles.navScroll}>
          <SidebarNav role={member.role} />
        </nav>
        <form action="/admin/sign-out" method="post" className={styles.footer}>
          <span className={styles.footerName}>{member.name}</span>
          <span className={styles.footerRole}>
            {role} ·{" "}
            <button type="submit" className={styles.footerSignOut}>
              sign out
            </button>
          </span>
        </form>
      </aside>
      <header className={styles.topBar}>
        <Link
          href="/admin/today"
          className={styles.topLogo}
          aria-label="Baked by Linda admin — Today"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.svg" alt="" className={styles.topMark} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wordmark.svg"
            alt=""
            className={styles.topWordmark}
          />
        </Link>
        <span className={styles.topTag}>Admin</span>
      </header>
      <div className={styles.content}>
        <OfflineLine />
        {children}
      </div>
      <TabBar role={member.role} />
      <HomeScreenPrompt />
    </div>
  );
}
