import { describe, expect, it } from "vitest";

import { LEGAL, LEGAL_DOCS, isLegalDoc } from "./legal";
import { LOCALES } from "./local-engines";

describe("legal pages", () => {
  it("has every document in every locale with real sections", () => {
    for (const doc of LEGAL_DOCS) {
      for (const locale of LOCALES) {
        const page = LEGAL[doc][locale];
        expect(page.title.length).toBeGreaterThan(3);
        expect(page.intro.length).toBeGreaterThan(20);
        expect(page.sections.length).toBeGreaterThanOrEqual(3);
        expect(page.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
      }
    }
  });

  it("validates document slugs", () => {
    expect(isLegalDoc("privacy")).toBe(true);
    expect(isLegalDoc("cookies")).toBe(false);
  });
});
