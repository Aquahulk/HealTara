import type { NextConfig } from "next";

// Enable ignoring TypeScript and ESLint errors during development only
const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  typescript: {
    // In dev, do not block on type errors
    ignoreBuildErrors: isDev,
  },
  async rewrites() {
    // Proxy API routes using env var in production, localhost in dev
    const isProd = process.env.NODE_ENV === "production";
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    
    // IN PRODUCTION: Ensure we use a secure live URL
    if (isProd) {
      const prodApi = apiBase || 'https://api.healtara.com';
      return [
        {
          source: "/api/:path*",
          destination: `${prodApi}/api/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${prodApi}/uploads/:path*`,
        },
      ];
    }

    // IN DEVELOPMENT: Use localhost fallback if no env var is set
    const devApi = apiBase || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${devApi}/api/:path*`,
      },
      {
        // Allow frontend to access uploaded media served by API
        source: "/uploads/:path*",
        destination: `${devApi}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
