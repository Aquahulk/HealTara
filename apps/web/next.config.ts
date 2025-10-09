import type { NextConfig } from "next";

// Enable ignoring TypeScript and ESLint errors during development only
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  typescript: {
    // In dev, do not block on type errors
    ignoreBuildErrors: isDev,
  },
  eslint: {
    // In dev, do not block on ESLint errors
    ignoreDuringBuilds: isDev,
  },
};

export default nextConfig;
