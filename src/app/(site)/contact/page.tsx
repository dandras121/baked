import type { Metadata } from "next";
import { ContactPage } from "@/components/contact/contact-page";
import { getSiteSettings } from "@/db/site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Write to Linda about a cake — a firm order or a half-formed idea. Every message is answered within 24 hours.",
};

// Contact (§7.4): the form, and the details from Settings (§11.1).
export default async function Page() {
  return <ContactPage settings={await getSiteSettings()} />;
}
