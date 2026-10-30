import type { MetadataRoute } from "next";
import { SITE_URL } from "./layout";

// robots.txt (§10.12): everything public may be crawled except the admin and the private pages;
// those also send noindex (next.config.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dev",
        "/order/",
        "/my-order/",
        "/pay/",
        "/delivery/",
        "/unsubscribe/",
        "/my-enquiry/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
