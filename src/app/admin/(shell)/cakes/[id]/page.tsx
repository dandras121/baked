import type { Metadata } from "next";
import { connection } from "next/server";
import styles from "@/components/admin/admin-pages.module.css";
import { requireMember } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Add or edit a cake" };
export const instant = false;

// Add or edit a cake (§9.13; 940:8507) is built in slice 9.1b; the role check is already here.
export default async function Page() {
  await connection();
  await requireMember("owner");
  return (
    <>
      <h1 className={styles.title}>Add or edit a cake</h1>
      <p className={styles.soon}>This screen is built in slice 9.1b.</p>
    </>
  );
}
