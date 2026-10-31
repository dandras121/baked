import type { Metadata } from "next";
import { CataloguePage } from "@/components/catalogue/catalogue-page";
import { getCatalogue } from "@/db/home-repo";
import { getSiteSettings } from "@/db/site-settings";

export const metadata: Metadata = {
  title: "The full range",
  description:
    "Linda's ready-made celebration cakes, baked to order — pick a design, a size and a date.",
  // `/cakes?…` is canonical to `/cakes` (§4.2 URL state).
  alternates: { canonical: "/cakes" },
};

// The full range (§4.2): every visible design; the browser filters and pages them.
export default async function Page() {
  const [cakes, settings] = await Promise.all([
    getCatalogue(),
    getSiteSettings(),
  ]);
  return <CataloguePage cakes={cakes} phone={settings?.phone ?? null} />;
}
