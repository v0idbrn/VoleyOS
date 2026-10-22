import type { MetadataRoute } from "next";

import { LEGAL_DOCS } from "@/lib/legal";
import { LOCALES } from "@/lib/local-engines";
import { SEO_ITEMS, SEO_SECTIONS } from "@/lib/seo";

const BASE = "https://volleyos.app";
const LAST_MODIFIED = new Date("2026-10-22T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
  ];

  for (const locale of LOCALES) {
    entries.push({ url: `${BASE}/${locale}/`, lastModified: LAST_MODIFIED, changeFrequency: "weekly", priority: 0.9 });
    for (const doc of LEGAL_DOCS) {
      entries.push({
        url: `${BASE}/${locale}/legal/${doc}/`,
        lastModified: LAST_MODIFIED,
        changeFrequency: "yearly",
        priority: 0.3,
      });
    }
    for (const section of SEO_SECTIONS) {
      entries.push({
        url: `${BASE}/${locale}/${section}/`,
        lastModified: LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.7,
      });
      for (const item of SEO_ITEMS[section]) {
        entries.push({
          url: `${BASE}/${locale}/${section}/${item.slug}/`,
          lastModified: LAST_MODIFIED,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
