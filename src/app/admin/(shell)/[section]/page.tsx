import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import styles from "@/components/admin/admin-pages.module.css";
import { NAV } from "@/lib/admin/nav";
import { requireMember } from "@/lib/admin/session";

/** Which slice brings each screen (BUILD-PLAN). */
const COMING: Record<string, string> = {
  orders: "8.4",
  enquiries: "9.8",
  cakes: "9.1",
  availability: "9.x",
  content: "9.x",
  gallery: "9.x",
  testimonials: "9.x",
  emails: "9.x",
  settings: "9.x",
  team: "9.x",
};

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: NAV.find((n) => n.href === `/admin/${section}`)?.label };
}

// A place in the menu whose screen comes in a later slice: its title and when it arrives; owner-only places stay
// the Owner's (§9.15).
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await connection();
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/admin/${section}`);
  if (!item || !COMING[section]) notFound();
  await requireMember(item.owner ? "owner" : "any");
  return (
    <>
      <h1 className={styles.title}>{item.label}</h1>
      <p className={styles.soon}>
        This screen is built in slice {COMING[section]}.
      </p>
    </>
  );
}
