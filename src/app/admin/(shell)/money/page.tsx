import type { Metadata } from "next";
import { connection } from "next/server";
import styles from "@/components/admin/admin-pages.module.css";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Money" };
export const instant = false;

// Money (§9.9, Owner only) is built in slice 8.8; the role check is already here.
export default async function Page() {
  await connection();
  await requireMember("owner");
  return (
    <>
      <h1 className={styles.title}>Money</h1>
      <p className={styles.soon}>This screen is built in slice 8.8.</p>
    </>
  );
}
