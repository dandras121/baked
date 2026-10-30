import type { Metadata } from "next";
import { ErrorPage } from "@/components/error-page/error-page";
import { getSiteSettings } from "@/db/site-settings";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** 404 (SITE-FLOWS §4.6): HTTP 404, never a 200; noindex. */
export default async function NotFound() {
  const s = await getSiteSettings();
  return <ErrorPage kind={404} facts={{ email: s?.email }} />;
}
