import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "Contact" };

// Temporary stand-in; the real page is slice 2.7.
export default function Page() {
  return <BuildStub title="Contact" slice="2.7" />;
}
