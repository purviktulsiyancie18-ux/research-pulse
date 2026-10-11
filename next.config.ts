import type { NextConfig } from "next";

// Every page reads live data from Neon, so we use plain dynamic rendering
// (`export const dynamic = "force-dynamic"`) instead of Cache Components.
const nextConfig: NextConfig = {
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
