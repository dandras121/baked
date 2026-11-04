import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { MotionRoot } from "@/motion/motion-root";
import "@/styles/fonts.css";
import "@/styles/tokens.css";
import "@/styles/typography.css";
import "@/styles/base.css";
import "@/styles/responsive.css";
import "@/styles/interaction.css";
import "@/styles/mascot.css";
import "./globals.css";

/** The address of the live site; previews and development fall back to their own host (§10.12). */
export const SITE_URL =
  process.env.SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

// Titles “{Page} — Baked by Linda” (§10.12); Home sets its own.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s — Baked by Linda",
    default: "Baked by Linda — Celebration cakes in West Lothian",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Before the first paint: html.js marks that scripts run (ANIM-06 hides the footer mascot only then).
// ANIM-04 first-load logic (A§7A): once per tab session the header mascot slides
// in. The class is removed when the slide ends, so a header mounted later in the visit does not replay it.
const MASCOT_INTRO = `document.documentElement.classList.add("js");try{if(!sessionStorage.getItem("bbl:mascot-seen")){sessionStorage.setItem("bbl:mascot-seen","1");var d=document.documentElement;d.classList.add("mascot-intro");document.addEventListener("animationend",function e(v){if(v.animationName.indexOf("bbl-mascot-in")===0){d.classList.remove("mascot-intro");document.removeEventListener("animationend",e)}})}}catch(e){}`;

// iOS zooms the page in when a field under 16 px gets focus and leaves it zoomed, so the page looks cut off.
// On iOS only, maximum-scale=1 stops that focus zoom; iOS still lets the visitor pinch-zoom (it ignores the limit
// for pinching), so nothing is lost. Elsewhere the limit would block zooming (§10.13), so it is never set there. Next adds its own viewport tag again on the client, so every one is kept in step.
const IOS_FOCUS_ZOOM = `try{var n=navigator;if(/iPad|iPhone|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1)){var f=function(){document.querySelectorAll('meta[name="viewport"]').forEach(function(m){if(m.content.indexOf("maximum-scale")<0)m.content+=", maximum-scale=1"})};f();new MutationObserver(f).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["content"]})}}catch(e){}`;

// The two faces almost every page shows first; the rest load when used.
const PRELOAD_FONTS = [
  "/fonts/quicksand-latin-wght-normal.woff2",
  "/fonts/fraunces-latin-normal.woff2",
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  for (const href of PRELOAD_FONTS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    // The inline script may add a class to <html> before React hydrates it.
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MASCOT_INTRO }} />
        <script dangerouslySetInnerHTML={{ __html: IOS_FOCUS_ZOOM }} />
      </head>
      <body>
        {children}
        <MotionRoot />
      </body>
    </html>
  );
}
