import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";
import { getSiteSettings } from "@/db/site-settings";

// Home: the default title “Baked by Linda — Celebration cakes in West Lothian”; the description is
// the footer tagline (§10.12), with the delivery area from Settings.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return s
    ? {
        description: `Bespoke celebration cakes, made by hand in West Lothian and delivered across ${s.deliveryArea}.`,
      }
    : {};
}

// Temporary build placeholder. The real Home page is slice 2.1.
export default function Home() {
  return <BuildStub title="Home" slice="2.1" />;
}
