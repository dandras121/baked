import { PageShell } from "@/components/page-shell/page-shell";
import { CookieConsent } from "@/components/cookies/cookie-consent";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";

// Every public page: the shell with the sticky header (§3.1), the footer (§3.2) and the cookie bar (§3.3).
// The header lives in this layout, so it persists across client-side navigation (ANIM-03 / ANIM-08 path A).
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PageShell header={<SiteHeader />} footer={<SiteFooter />}>
        {children}
      </PageShell>
      <CookieConsent />
    </>
  );
}
