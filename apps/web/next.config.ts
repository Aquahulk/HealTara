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
  async rewrites() {
    // In development, proxy API routes to the backend on port 3001
    // This lets the frontend call "/api/..." without hardcoding a host
    if (isDev) {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:3001/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
