import { describe, expect, it } from "vitest";

import { LEGAL_DOCS } from "./legal";
import { LOCALES } from "./local-engines";
import { SEO_ITEMS, SEO_SECTIONS } from "./seo";
import sitemap from "@/app/sitemap";

describe("seo content", () => {
  it("has unique and complete entries in every section", () => {
    for (const section of SEO_SECTIONS) {
      const items = SEO_ITEMS[section];
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((item) => item.slug)).size).toBe(items.length);
      for (const item of items) {
        for (const locale of LOCALES) {
          expect(item.title[locale].length).toBeGreaterThan(2);
          expect(item.description[locale].length).toBeGreaterThan(20);
          expect(item.facts[locale].length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("ships 117 localized seo urls plus legal and homes", () => {
    const items = SEO_SECTIONS.reduce((sum, section) => sum + SEO_ITEMS[section].length, 0);
    expect(items).toBe(34);
    const urls = sitemap();
    expect(urls).toHaveLength(1 + LOCALES.length * (1 + LEGAL_DOCS.length + SEO_SECTIONS.length + items));
    expect(urls.some((entry) => entry.url.endsWith("/es/tools/jump-calculator/"))).toBe(true);
    expect(urls.some((entry) => entry.url.includes("/overlay/tv"))).toBe(false);
  });
});
