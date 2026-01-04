import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // CORS headers are handled by middleware.ts with strict origin validation.
    // Static headers cannot validate origins dynamically, so CORS is managed
    // in middleware where we can validate against a server-side allowlist
    // and only set Access-Control-Allow-Credentials for validated origins.
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
