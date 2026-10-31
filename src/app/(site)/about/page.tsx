import type { Metadata } from "next";
import { AboutPage, aboutFirstSentence } from "@/components/about/about-page";
import { getSiteSettings } from "@/db/site-settings";

// About Linda (§4.3). Its description is its first sentence (§10.12); the trading name comes from Settings.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: "About Linda",
    ...(s ? { description: aboutFirstSentence(s.tradingName) } : {}),
  };
}

export default async function Page() {
  const s = await getSiteSettings();
  return <AboutPage tradingName={s?.tradingName ?? null} />;
}
