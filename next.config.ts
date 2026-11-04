import type { NextConfig } from "next";
import { NOINDEX_PATHS, TOKEN_PATHS } from "./src/lib/seo";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Each Vercel deployment names itself, so a page from an older deployment does a full load on navigation
  // instead of mixing old and new parts (pages that stop reacting; Bohoka 2026-11-04).
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  partialPrefetching: true,
  // §2 Index = no → noindex; token pages also send no referrer (§10.5, CLAUDE.md rule 10).
  async headers() {
    return [
      ...NOINDEX_PATHS.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      ...TOKEN_PATHS.map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
};

export default nextConfig;
