import { describe, expect, it } from "vitest";

import { MODULES } from "./modules";
import { LOCALES } from "./local-engines";
import { MODULE_GUIDES, getModuleGuide } from "./module-guides";
import { GUIDED_MODES, GUIDED_MODE_BY_ID, DIFFICULTY_BADGES } from "./guided-modes";

describe("module guides: all 61 modules in ES/EN/PT", () => {
  it("has exactly one guide per module in every locale", () => {
    expect(MODULES).toHaveLength(61);
    expect(Object.keys(MODULE_GUIDES)).toHaveLength(61);
    for (const module of MODULES) {
      for (const locale of LOCALES) {
        const guide = MODULE_GUIDES[module.slug]?.[locale];
        expect(guide, `${module.slug} missing ${locale}`).toBeDefined();
        if (!guide) continue;
        expect(guide.why.length, `${module.slug} ${locale} why`).toBeGreaterThan(10);
        expect(guide.steps).toHaveLength(3);
        for (const step of guide.steps) {
          expect(step.length, `${module.slug} ${locale} step`).toBeGreaterThan(5);
        }
        expect(guide.glossary.length, `${module.slug} ${locale} glossary`).toBeGreaterThanOrEqual(2);
        for (const [term, definition] of guide.glossary) {
          expect(term.length).toBeGreaterThan(0);
          expect(definition.length).toBeGreaterThan(3);
        }
      }
    }
  });

  it("falls back to a generic guide for unknown slugs", () => {
    const guide = getModuleGuide("does-not-exist", "en");
    expect(guide.why).toContain("offline");
    expect(guide.steps).toHaveLength(3);
  });
});

describe("guided modes: 5 experiences with valid drawers", () => {
  it("exposes 5 modes and every referenced slug is a real module", () => {
    expect(GUIDED_MODES).toHaveLength(5);
    const ids = GUIDED_MODES.map((mode) => mode.id);
    expect(ids).toEqual(["novice", "advanced", "referee", "dt", "tournaments"]);
    const slugs = new Set(MODULES.map((module) => module.slug));
    for (const mode of GUIDED_MODES) {
      expect(mode.drawers.length).toBeGreaterThanOrEqual(3);
      for (const locale of LOCALES) {
        expect(mode.label[locale].length).toBeGreaterThan(2);
      }
      for (const drawer of mode.drawers) {
        expect(drawer.slugs.length).toBeGreaterThan(0);
        for (const locale of LOCALES) {
          expect(drawer.title[locale].length).toBeGreaterThan(3);
        }
        for (const slug of drawer.slugs) {
          expect(slugs.has(slug), `${mode.id}/${drawer.id} -> ${slug}`).toBe(true);
        }
      }
    }
  });

  it("keeps the referee cockpit at exactly 4 drawers and novice guides open by default", () => {
    const referee = GUIDED_MODE_BY_ID.get("referee");
    expect(referee?.drawers).toHaveLength(4);
    const novice = GUIDED_MODE_BY_ID.get("novice");
    expect(novice?.drawers.every((drawer) => drawer.openByDefault)).toBe(true);
    const dt = GUIDED_MODE_BY_ID.get("dt");
    expect(dt?.drawers.every((drawer) => drawer.badge !== undefined)).toBe(true);
    for (const badge of ["basic", "tactical", "pro"] as const) {
      expect(DIFFICULTY_BADGES[badge].en.length).toBeGreaterThan(2);
    }
  });
});
