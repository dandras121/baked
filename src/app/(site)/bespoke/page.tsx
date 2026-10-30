import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "Bespoke enquiry" };

// Temporary stand-in; the real page is slice 7.1.
export default function Page() {
  return <BuildStub title="Bespoke enquiry" slice="7.1" />;
}
