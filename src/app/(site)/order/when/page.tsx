import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

// Temporary stand-in so “Continue to date and delivery →” can be followed (3.6b); the real step 2 is slice 4.2.
// Opened without a draft it goes to /cakes (src/proxy.ts, §10.2 Opening a step directly).
export const metadata: Metadata = {
  title: "When & where",
  robots: { index: false },
};

export default function Page() {
  return <BuildStub title="When & where" slice="4.2" />;
}
