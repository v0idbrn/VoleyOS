import { describe, expect, it } from "vitest";

import { translateEngineText } from "./engine-l10n";

describe("engine localisation", () => {
  it("keeps Spanish untouched", () => {
    expect(translateEngineText("Rodilla 118.1° (óptimo 110°-130°).", "es")).toBe("Rodilla 118.1° (óptimo 110°-130°).");
  });

  it("translates dynamic biomechanics diagnostics", () => {
    expect(translateEngineText("Rodilla 118.1° (óptimo 110°-130°).", "en")).toBe("Knee 118.1° (optimal 110°-130°).");
    expect(translateEngineText("Codo de impacto 172.0° (óptimo 170°-180°).", "pt")).toBe("Cotovelo de impacto 172.0° (ideal 170°-180°).");
  });

  it("translates scoreboard messages without losing team names", () => {
    expect(translateEngineText("Punto A — 24-22", "en")).toBe("Point A — 24-22");
    expect(translateEngineText("Set para A. Nuevo set 2.", "pt")).toBe("Set para A. Novo set 2.");
    expect(translateEngineText("Partido para B (2-1).", "en")).toBe("Match for B (2-1).");
  });

  it("translates court FAQs and fallback labels", () => {
    expect(translateEngineText("Alto contraste alternado.", "en")).toBe("High contrast toggled.");
    expect(translateEngineText("Eficiencia", "pt")).toBe("Eficiência");
    expect(translateEngineText("Texto desconocido", "en")).toBe("Texto desconocido");
  });
});
