import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "Gallery" };

// Temporary stand-in; the real page is slice 2.8.
export default function Page() {
  return <BuildStub title="Gallery" slice="2.8" />;
}
