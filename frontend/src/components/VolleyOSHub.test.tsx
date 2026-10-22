import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { VolleyOSHub } from "./VolleyOSHub";
import { loadVault } from "@/lib/vault";

describe("command center", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all twelve stations and filters by profile", () => {
    render(<VolleyOSHub locale="es" />);
    expect(screen.getAllByText(/^Módulo \d{2}$/)).toHaveLength(12);
    fireEvent.click(screen.getByRole("tab", { name: "Jugadores" }));
    const filtered = screen.getAllByText(/^Módulo \d{2}$/).length;
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(12);
  });

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
