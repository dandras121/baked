import type { Metadata } from "next";
import { connection } from "next/server";
import styles from "@/components/admin/admin-pages.module.css";
import { requireMember } from "@/lib/admin/session";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  return { title: (await params).number };
}

// Order detail (§9.5) is built in slice 8.4; a Today row already opens here.
export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await connection();
  await requireMember();
  const { number } = await params;
  return (
    <>
      <h1 className={styles.title}>{decodeURIComponent(number)}</h1>
      <p className={styles.soon}>Order detail is built in slice 8.4.</p>
    </>
  );
}
