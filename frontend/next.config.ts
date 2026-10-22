import type { NextConfig } from "next";

const buildTarget = process.env.NEXT_PUBLIC_BUILD_TARGET === "fdroid" ? "fdroid" : "cloud";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BUILD_TARGET: buildTarget },
};

export default nextConfig;
