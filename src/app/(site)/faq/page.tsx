import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "FAQ" };

// Temporary stand-in; the real page is slice 2.5.
export default function Page() {
  return <BuildStub title="FAQ" slice="2.5" />;
}
