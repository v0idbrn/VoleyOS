import type { NextConfig } from "next";

const buildTarget = process.env.NEXT_PUBLIC_BUILD_TARGET === "fdroid" ? "fdroid" : "cloud";
const staticExport = process.env.VOLEYOS_STATIC_EXPORT === "true";

// Next.js dev (react-refresh) evaluates strings at boot; without 'unsafe-eval'
// the main-app chunk throws and React never hydrates, killing every handler.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${devEval}; connect-src 'self' https: http://127.0.0.1:8000; worker-src 'self' blob: data:; frame-ancestors 'self'`,
  },
  // QR scoreboard cloning needs the camera in this origin; geolocation stays off.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: staticExport ? "export" : undefined,
  // The APK loads file:///android_asset/index.html: absolute "/_next/..."
  // URLs resolve outside android_asset and every asset 404s. A relative
  // assetPrefix makes the WebView resolve them next to index.html.
  assetPrefix: staticExport ? "." : undefined,
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