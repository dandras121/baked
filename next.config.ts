import type { NextConfig } from "next";
import { NOINDEX_PATHS, TOKEN_PATHS } from "./src/lib/seo";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
