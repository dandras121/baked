import type { Metadata } from "next";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Baked by Linda admin" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BbL admin", statusBarStyle: "black" },
  icons: { apple: "/brand/admin-icon-192.png" },
};

// The admin (§9): its own layout, no public header or footer, and no motion beyond focus and hover (§9.1, D10).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={styles.admin} data-no-motion>
      {children}
    </div>
  );
}
