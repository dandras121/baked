import type { Metadata } from "next";
import { BuildStub } from "@/components/stub/build-stub";

export const metadata: Metadata = { title: "Terms and conditions" };

// Temporary stand-in; the real page is slice 2.6.
export default function Page() {
  return <BuildStub title="Terms and conditions" slice="2.6" />;
}
