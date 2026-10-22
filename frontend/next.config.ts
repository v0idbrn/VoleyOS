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
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
