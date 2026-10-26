import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "@/styles/fonts.css";
import "@/styles/tokens.css";
import "@/styles/typography.css";
import "@/styles/base.css";
import "@/styles/responsive.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baked by Linda",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// The two faces almost every page shows first; the rest load when used.
const PRELOAD_FONTS = [
  "/fonts/quicksand-latin-wght-normal.woff2",
  "/fonts/fraunces-latin-full-normal.woff2",
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  for (const href of PRELOAD_FONTS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
