import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page is per-user and live, so nothing is prerendered or cached.
  cacheComponents: false,
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
