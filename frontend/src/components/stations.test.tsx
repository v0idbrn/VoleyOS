import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BiomechanicsStation, ScoreboardStation, ScoutingStation } from "./stations";
import { MODULE_BY_SLUG } from "@/lib/modules";
import type { Locale } from "@/lib/local-engines";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;

function renderScoreboard() {
  return render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
}

describe("match mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => cleanup());

  it("scores home and away from hardware volume events and locks the screen", async () => {
    renderScoreboard();
    fireEvent.click(screen.getByRole("button", { name: /Modo Partido/ }));
    expect(screen.getByText(/Toques bloqueados/)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Desbloquear/ })).not.toBeNull();

    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_UP" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("1"));

    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_DOWN" }));
    await waitFor(() => expect(screen.getByTestId("score-b").textContent).toBe("1"));
    expect(navigator.vibrate).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Desbloquear/ }));
    expect(screen.queryByText(/Toques bloqueados/)).toBeNull();
  });

  it("undoes the accidental point plus the previous point on a long volume press", async () => {
    renderScoreboard();
    fireEvent.click(screen.getByRole("button", { name: /Modo Partido/ }));
    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_UP" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("1"));
    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_UP" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("2"));
    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_LONG_UNDO" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("0"));
  });

  it("ignores volume events while match mode is off", () => {
    renderScoreboard();
    window.dispatchEvent(new CustomEvent("voleyos:hardware-key", { detail: "VOLUME_UP" }));
    expect(screen.getByTestId("score-a").textContent).toBe("0");
  });

  it("survives an Android bridge that does not expose setHardwareScoreMode", () => {
    // Regression: on device the bridge OBJECT exists but older MainActivity
    // builds lack the method; the unguarded call threw a TypeError on mount
    // and produced Next's "client-side error" dead screen inside the APK.
    const bridge = {};
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = bridge;
    expect(() => renderScoreboard()).not.toThrow();
    delete (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge;
  });

  it("forwards hardware mode to the bridge when the method exists", async () => {
    const setHardwareScoreMode = vi.fn();
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = { setHardwareScoreMode };
    renderScoreboard();
    fireEvent.click(screen.getByRole("button", { name: /Modo Partido/ }));
    await waitFor(() => expect(setHardwareScoreMode).toHaveBeenCalledWith(true));
    delete (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge;
  });
});

describe("scouting voice", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("falls back to tap chips when the WebView has no speech API", () => {
    render(<ScoutingStation meta={meta("scouting")} locale="en" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Dictate play" }));
    expect(screen.getByRole("alert").textContent).toContain("tap chips");
  });

  it("cycles the result chip and nudges zones", () => {
    render(<ScoutingStation meta={meta("scouting")} locale="en" onSave={noop} />);
    const targetPlus = screen.getByRole("button", { name: "Target Z +" });
    fireEvent.click(targetPlus);
    fireEvent.click(screen.getByRole("button", { name: /^Result:/ }));
    expect(screen.getAllByText(/Kill|In play/).length).toBeGreaterThan(0);
  });
});

describe("engine localisation", () => {
  afterEach(() => cleanup());

  for (const locale of ["en", "pt"] as Locale[]) {
    it(`renders biomechanics diagnostics without Spanish leftovers in ${locale}`, () => {
      render(<BiomechanicsStation meta={meta("biomechanics")} locale={locale} onSave={noop} />);
      const text = document.body.textContent ?? "";
      expect(text).not.toContain("Rodilla");
      expect(text).not.toContain("Codo de armado");
      expect(text).not.toContain("Asimetría");
    });
  }
});
