import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "About Linda" };

// Temporary stand-in; the real page is slice 2.4.
export default function Page() {
  return <BuildStub title="About Linda" slice="2.4" />;
}
