import type { Metadata } from "next";
import { PageShell, PageWidth } from "@/components/page-shell/page-shell";
import { ComponentsGallery } from "./gallery";

export const metadata: Metadata = { title: "Base components — Baked by Linda" };

export default function ComponentsPage() {
  return (
    <PageShell>
      <PageWidth>
        <ComponentsGallery />
      </PageWidth>
    </PageShell>
  );
}
