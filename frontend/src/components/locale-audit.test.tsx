import { cleanup, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { STATIONS } from "./stations";
import { MODULES } from "@/lib/modules";
import type { Locale } from "@/lib/local-engines";

/** Ambiguous English words (red, rival) and shared Portuguese terms are excluded. */
const SPANISH_EN =
  /(Rodilla|Codo|Asimetría|Eficiencia|Jugadores|Duración|Muneca|Cuello|Categoría|Puntaje|Pelota|partido|empate|brazo|zona|opuesto|armador|recepciones|servicio|saltos|carga|lesión|torneo|cuota|sello|boleta|sanción|saque|Líbero|FALTA|Racha|Equipo \d|Cancha|tiempo muerto|demora)/i;
// "demora" is valid Portuguese, so it is not a Spanish leftover there.
const SPANISH_PT =
  /(Rodilla|Codo|Asimetría|Eficiencia|Jugadores|Duración|Muneca|Cuello|Categoría|Puntaje|Pelota|partido|brazo|opuesto|armador|recepciones|servicio|lesión|torneo|cuota|sello|sanción|Cancha|tiempo muerto)/i;

describe("engine localisation coverage", () => {
  for (const locale of ["en", "pt"] as Locale[]) {
    it(`ships no Spanish leftovers in ${locale}`, () => {
      const failures: string[] = [];
      const marker = locale === "en" ? SPANISH_EN : SPANISH_PT;
      for (const meta of MODULES) {
        const Station = STATIONS[meta.slug];
        if (!Station) continue;
        const { container, unmount } = render(<Station meta={meta} locale={locale} onSave={() => undefined} />);
        const text = (container.textContent ?? "").replace(/\s+/g, " ");
        if (marker.test(text)) {
          const hits = Array.from(new Set(text.match(new RegExp(marker.source, "gi")) ?? []));
          failures.push(`${meta.slug}: ${hits.join(", ")}`);
        }
        unmount();
        cleanup();
      }
      expect(failures).toEqual([]);
    });
  }

  it("keeps stable keys while localising a station tree", () => {
    const messages: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      messages.push(args.map(String).join(" "));
    });
    const meta = MODULES.find((entry) => entry.slug === "biomechanics");
    const Station = meta ? STATIONS[meta.slug] : undefined;
    if (!meta || !Station) throw new Error("biomechanics station missing");
    const { unmount } = render(<Station meta={meta} locale="en" onSave={() => undefined} />);
    unmount();
    spy.mockRestore();
    expect(messages.join("\n")).not.toContain('unique "key"');
  });
});
