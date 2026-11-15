import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and live, so nothing is prerendered or cached.
  cacheComponents: false,
  // Lets a second dev server (sample-data mode) run beside the main one.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["@electric-sql/pglite"],
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
