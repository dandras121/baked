import type { Metadata } from "next";

// Developer pages are never indexed. They are removed from the live site in slice 10.2.
export const metadata: Metadata = {
  title: "Developer pages — Baked by Linda",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  return children;
}
