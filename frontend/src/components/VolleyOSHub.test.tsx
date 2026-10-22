import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VolleyOSHub } from "./VolleyOSHub";
import { loadVault } from "@/lib/vault";

describe("command center", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all eighteen stations and filters by profile", () => {
    render(<VolleyOSHub locale="es" />);
    expect(screen.getAllByText(/^Módulo \d{2}$/)).toHaveLength(18);
    fireEvent.click(screen.getByRole("tab", { name: "Jugadores" }));
    const filtered = screen.getAllByText(/^Módulo \d{2}$/).length;
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(18);
  });

  it("searches instantly by name and opens filters with Ctrl+K", () => {
    render(<VolleyOSHub locale="es" />);
    const search = screen.getByRole("searchbox", { name: "Buscar módulo" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: "sello" } });
    expect(screen.getAllByText(/^Módulo \d{2}$/)).toHaveLength(1);
  });

  for (const locale of ["es", "en", "pt"] as const) {
    it(`renders all eighteen stations in ${locale}`, () => {
      render(<VolleyOSHub locale={locale} />);
      expect(screen.getAllByText(/^(Módulo|Module) \d{2}$/)).toHaveLength(18);
    });
  }

  it("saves a station report into the local vault", () => {
    render(<VolleyOSHub locale="es" />);
    const saveButtons = screen.getAllByRole("button", { name: "Guardar reporte" });
    const first = saveButtons[0];
    expect(first).toBeDefined();
    if (first) fireEvent.click(first);
    expect(loadVault()).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("bóveda");
  });
});
