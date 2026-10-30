import type { Metadata } from "next";
import { notFound } from "next/navigation";

// The 404's title and noindex (§10.12); not-found.tsx alone does not set them.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

// Any unknown address inside the site shows the 404 page with the header and footer (§4.6).
export default function Missing() {
  notFound();
}
