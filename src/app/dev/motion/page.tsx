import type { Metadata } from "next";
import { PageShell, PageWidth } from "@/components/page-shell/page-shell";
import { MotionDemo } from "./motion-demo";

export const metadata: Metadata = {
  title: "Interaction and motion — Baked by Linda",
};

export default function MotionPage() {
  return (
    <PageShell>
      <PageWidth>
        <MotionDemo />
      </PageWidth>
    </PageShell>
  );
}
