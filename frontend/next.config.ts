import type { NextConfig } from "next";

const buildTarget = process.env.NEXT_PUBLIC_BUILD_TARGET === "fdroid" ? "fdroid" : "cloud";
const staticExport = process.env.VOLEYOS_STATIC_EXPORT === "true";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: http://127.0.0.1:8000; frame-ancestors 'self'",
  },
  // QR scoreboard cloning needs the camera in this origin; geolocation stays off.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: staticExport ? "export" : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BUILD_TARGET: buildTarget },
  ...(staticExport
    ? {}
    : {
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;