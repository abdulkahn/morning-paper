import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Headless Chromium for PDF rendering must not be bundled.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    // Tracing misses runtime data files (e.g. playwright-core/browsers.json).
    "/api/pdf/[editionId]": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/playwright-core/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
