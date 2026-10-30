import type { MetadataRoute } from "next";
import { INDEXED_PAGES } from "@/lib/seo";
import { SITE_URL } from "./layout";

// The sitemap skeleton (§10.12): the public pages with Index = yes; visible cakes join in slice 3.x.
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_PAGES.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));
}
