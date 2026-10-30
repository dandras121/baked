import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "The full range" };

// Temporary stand-in; the real page is slice 3.2.
export default function Page() {
  return <BuildStub title="The full range" slice="3.2" />;
}
