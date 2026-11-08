import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import contact from "@/components/contact/contact.module.css";
import { sentTokenValid } from "@/lib/sent-token";

export const metadata: Metadata = {
  title: "Enquiry sent",
  robots: { index: false, follow: false },
};

export const instant = false;

/**
 * Enquiry sent (§7.2) — for now only the reference; the drawn page (654:3805, phone 839:6936, tablet 1558:11653) with
 * the phone line and the two buttons is slice 7.2. Shown only straight after a send (a signed link, 10 minutes).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; t?: string }>;
}) {
  await connection();
  const { ref = "", t = null } = await searchParams;
  if (!/^BBL-\d{4}-E-\d{4,}$/.test(ref) || !sentTokenValid(`bespoke:${ref}`, t))
    redirect("/bespoke");
  return (
    <div className={contact.page}>
      <h1 className={contact.title}>Enquiry sent.</h1>
      <div className={contact.body}>
        <p className={contact.intro}>
          Your reference is <strong>{ref}</strong>.
        </p>
      </div>
    </div>
  );
}
