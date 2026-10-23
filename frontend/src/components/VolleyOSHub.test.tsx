import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { VolleyOSHub } from "./VolleyOSHub";
import { loadVault } from "@/lib/vault";

describe("native app shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all forty-eight modules as app cards and filters by role", () => {
    render(<VolleyOSHub locale="es" />);
    expect(screen.getAllByTestId("module-card")).toHaveLength(48);
    fireEvent.click(screen.getByRole("tab", { name: "Jugador" }));
    const filtered = screen.getAllByTestId("module-card").length;
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(48);
  });

  it("searches instantly and focuses the search field with Ctrl+K", async () => {
    render(<VolleyOSHub locale="es" />);
    const search = screen.getByRole("searchbox", { name: "Buscar módulo" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await waitFor(() => expect(document.activeElement).toBe(search));
    fireEvent.change(search, { target: { value: "serpiente" } });
    expect(screen.getAllByTestId("module-card")).toHaveLength(1);
  });

  for (const locale of ["es", "en", "pt"] as const) {
    it(`renders the five native tabs in ${locale}`, () => {
      render(<VolleyOSHub locale={locale} />);
      expect(screen.getAllByTestId("module-card")).toHaveLength(48);
      expect(screen.getAllByRole("tab")).toHaveLength(13);
    });
  }

  it("opens a module full screen and comes back without scrolling the launcher", () => {
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getAllByTestId("module-card")[0]!);
    expect(screen.getByRole("button", { name: "Volver" })).toBeDefined();
    expect(screen.getByText(/^Módulo 01$/)).toBeDefined();
    expect(screen.queryByRole("tab", { name: /Inicio/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getAllByTestId("module-card")).toHaveLength(48);
  });

  it("switches to the Court tab and keeps the scoreboard one tap away", () => {
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getAllByRole("tab", { name: "Cancha" }).at(-1)!);
    expect(screen.getByRole("heading", { name: "Cancha" })).toBeDefined();
    expect(screen.getAllByText(/Tablero Indoor 6v6/).length).toBeGreaterThan(0);
  });

  it("saves a station report into the local vault from the full-screen view", () => {
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getAllByTestId("module-card")[0]!);
    const save = screen.getAllByRole("button", { name: "Guardar reporte" })[0];
    expect(save).toBeDefined();
    if (save) fireEvent.click(save);
    expect(loadVault()).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("bóveda");
  });

  it("toggles the outdoor theme from native settings", () => {
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Ajustes/ }));
    const theme = screen.getByRole("switch", { name: "Tema" });
    fireEvent.click(theme);
    expect(document.documentElement.classList.contains("solar")).toBe(true);
  });

  it("onboards in three taps and prefills role favourites", () => {
    window.localStorage.removeItem("voleyos_onboarding_done");
    render(<VolleyOSHub locale="es" />);
    expect(screen.getByRole("dialog", { name: "Configuración inicial" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Español/ }));
    fireEvent.click(screen.getByRole("button", { name: /Jugador/ }));
    fireEvent.click(screen.getByRole("button", { name: /Entrar a la cancha/ }));
    expect(window.localStorage.getItem("voleyos_onboarding_done")).toBe("1");
    expect(screen.queryByRole("dialog", { name: "Configuración inicial" })).toBeNull();
    fireEvent.click(screen.getAllByRole("tab", { name: /Inicio/ }).at(-1)!);
    fireEvent.click(screen.getByRole("tab", { name: /Mis favoritos/ }));
    expect(screen.getAllByTestId("module-card")).toHaveLength(4);
  });

  it("keeps the paywall closed when localStorage is injected with a fake unlock", async () => {
    window.localStorage.setItem("volleyos.creator.token", "true");
    render(<VolleyOSHub locale="es" />);
    await waitFor(() => expect(window.localStorage.getItem("volleyos.creator.token")).toBeNull());
    expect(screen.queryByText(/👑/)).toBeNull();
    expect(screen.getAllByRole("button", { name: "Desbloquear con clave" }).length).toBeGreaterThan(0);
  });
});
