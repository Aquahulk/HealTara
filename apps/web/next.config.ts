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
    // Proxy API routes using env var in production, localhost in dev
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (isDev) {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:3001/api/:path*",
        },
        {
          // Allow frontend to access uploaded media served by API
          source: "/uploads/:path*",
          destination: "http://localhost:3001/uploads/:path*",
        },
      ];
    }
    if (apiBase) {
      return [
        {
          source: "/api/:path*",
          destination: `${apiBase}/api/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${apiBase}/uploads/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
