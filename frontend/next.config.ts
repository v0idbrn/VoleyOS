import type { NextConfig } from "next";

const buildTarget = process.env.NEXT_PUBLIC_BUILD_TARGET === "fdroid" ? "fdroid" : "cloud";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BUILD_TARGET: buildTarget },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: http://127.0.0.1:8000; frame-ancestors 'self'",
          },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
