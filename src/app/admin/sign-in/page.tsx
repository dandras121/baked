import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignInForm } from "@/components/admin/sign-in-form";
import styles from "@/components/admin/sign-in.module.css";
import { currentMember } from "@/lib/admin/session";
import { askCode, signIn } from "./actions";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

// Sign in (§9.2; 932:8144, 1801:13621, phone 1801:13646, 950:9002).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ again?: string; renew?: string }>;
}) {
  await connection();
  const { again, renew } = await searchParams;
  // “Sign in again” in the last 24 hours opens the form while the old session still works (§9.2).
  if ((await currentMember()).signedIn && renew !== "1")
    redirect("/admin/today");
  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.svg" alt="" className={styles.topMark} />
        <span className={styles.topName}>Baked by Linda</span>
        <span className={styles.topAdmin}>Admin</span>
      </header>
      <main className={styles.main}>
        <SignInForm askCode={askCode} signIn={signIn} again={again === "1"} />
      </main>
    </div>
  );
}
