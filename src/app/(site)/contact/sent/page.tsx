import type { Metadata } from "next";
import { ContactSent } from "@/components/contact/contact-sent";
import { getSiteSettings } from "@/db/site-settings";

export const metadata: Metadata = {
  title: "Message sent",
  robots: { index: false, follow: false },
};

// Message sent (§7.4). Opened without sending, the proxy sends the visitor to /contact.
export default async function Page() {
  const settings = await getSiteSettings();
  return <ContactSent phone={settings?.phone ?? null} />;
}
