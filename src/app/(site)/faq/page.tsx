import type { Metadata } from "next";
import { FaqPage } from "@/components/faq/faq-page";
import { getFaq } from "@/db/faq-repo";
import { getSiteSettings } from "@/db/site-settings";
import { groupFaq } from "@/lib/faq";
import { placeholderValues } from "@/lib/placeholders";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about ordering, paying, allergens, delivery and collection, and looking after your cake.",
};

// FAQ (§4.4): the questions from the database, their answers filled from Settings (§11.8).
export default async function Page() {
  const [rows, settings] = await Promise.all([getFaq(), getSiteSettings()]);
  const groups = settings ? groupFaq(rows, placeholderValues(settings)) : [];
  return <FaqPage groups={groups} email={settings?.email ?? null} />;
}
