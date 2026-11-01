import type { Metadata } from "next";
import { CheckoutStep } from "@/components/checkout/checkout-step";

// Checkout step (§5). It reads the visitor's draft, so it is rendered for each visit.
export const instant = false;

export const metadata: Metadata = {
  title: "When & where",
  robots: { index: false },
};

export default function Page() {
  return <CheckoutStep step="when" />;
}
