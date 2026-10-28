import { PageShell } from "@/components/page-shell/page-shell";
import { SiteHeader } from "@/components/header/site-header";

// Every public page: the shell with the sticky header (§3.1). The footer comes in slice 1.4.
// The header lives in this layout, so it persists across client-side navigation (ANIM-03 / ANIM-08 path A).
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <PageShell header={<SiteHeader />}>{children}</PageShell>;
}
