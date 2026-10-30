import type { Metadata } from "next";
import { ErrorPage } from "@/components/error-page/error-page";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { PageShell } from "@/components/page-shell/page-shell";
import { getSiteSettings } from "@/db/site-settings";

export const metadata: Metadata = { title: "500 preview" };

// A preview of the 500 page as a visitor sees it when a page fails (§4.7). A real failure shows the
// same content through src/app/(site)/error.tsx (or global-error.tsx) with HTTP 500.
export default async function ErrorPreview() {
  const s = await getSiteSettings();
  return (
    <PageShell header={<SiteHeader />} footer={<SiteFooter />}>
      <ErrorPage kind={500} facts={{ email: s?.email, phone: s?.phone }} />
    </PageShell>
  );
}
