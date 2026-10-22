import type { MetadataRoute } from "next";

const BASE = "https://volleyos.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/overlay/", "/api/"] }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
