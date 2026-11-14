import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreboardStation } from "@/components/stations";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { VolleyOSHub } from "@/components/VolleyOSHub";

// Ensure Pro is locked so "Simple Mode" / "Modo Simples" text is visible.
vi.mock("@/lib/pro-entitlement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pro-entitlement")>();
  return { ...actual, isUserProEntitled: () => false };
});
import {
  ACTIVE_ROSTERS_KEY,
  SAVED_TEAMS_KEY,
  deleteTeamPreset,
  getActiveCourtRosters,
  loadSavedTeams,
  saveTeamPreset,
  setActiveCourtRosters,
} from "@/lib/saved-teams";
import { detectInitialLocale, LOCALE_AUTODETECT_TEST_KEY, LOCALE_PREF_KEY } from "@/components/VolleyOSHub";
import type { Locale } from "@/lib/local-engines";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};
const noop = (): void => undefined;

const renderBoard = () => render(<ScoreboardStation meta={meta("scoreboard")} locale="en" onSave={noop} />);

const enableSeven = (): void => {
  const toggle = screen.getByTestId("rotation-7p-toggle");
  if (toggle.getAttribute("aria-pressed") !== "true") fireEvent.click(toggle);
};

describe("v11.3.4 offline saved teams vault", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("saves, updates, lists and deletes 6p and 7p presets", () => {
    expect(loadSavedTeams()).toEqual([]);

    const six = saveTeamPreset({ name: "  Tiburones  ", mode: "6p", players: ["Ana", "Beto"] });
    expect(six).toHaveLength(1);
    expect(six[0]?.name).toBe("Tiburones");
    expect(six[0]?.players).toEqual(["Ana", "Beto", "J3", "J4", "J5", "J6"]);

    const seven = saveTeamPreset({
      name: "Cóndores",
      mode: "7p",
      color: "#0ea5e9",
      players: ["Santi", "Mati", "Caro", "Dani", "Ema", "Fabi", "Gabi"],
    });
    expect(seven.map((preset) => preset.name)).toEqual(["Cóndores", "Tiburones"]);
    expect(seven[0]?.players).toHaveLength(7);
    expect(seven[0]?.color).toBe("#0ea5e9");

    // Same name in a different case updates in place instead of duplicating.
    const updated = saveTeamPreset({ name: "tiburones", mode: "7p", players: ["Ana", "Beto", "Caro"] });
    expect(updated.filter((preset) => preset.name.toLowerCase() === "tiburones")).toHaveLength(1);
    expect(updated.find((preset) => preset.name === "Tiburones")?.mode).toBe("7p");
    expect(updated.find((preset) => preset.name === "Tiburones")?.players).toHaveLength(7);

    expect(updated[0]?.name).toBe("Tiburones");
    const remaining = deleteTeamPreset(updated[0]!.id);
    expect(remaining.map((preset) => preset.name)).toEqual(["Cóndores"]);
    expect(JSON.parse(window.localStorage.getItem(SAVED_TEAMS_KEY) ?? "[]")).toHaveLength(1);
  });

  it("round-trips the active court rosters for 6p and 7p teams", () => {
    const defaults = getActiveCourtRosters();
    expect(defaults.rosterA).toHaveLength(6);
    expect(defaults.modeA).toBe("6p");

    setActiveCourtRosters({
      teamA: "Sharks",
      teamB: "Condors",
      rosterA: ["Santi", "Mati", "Caro", "Dani", "Ema", "Fabi", "Gabi"],
      rosterB: ["Ana", "Beto"],
      modeA: "7p",
      modeB: "6p",
    });
    const stored = JSON.parse(window.localStorage.getItem(ACTIVE_ROSTERS_KEY) ?? "{}") as Record<string, unknown>;
    expect(stored.teamA).toBe("Sharks");

    const active = getActiveCourtRosters();
    expect(active.teamA).toBe("Sharks");
    expect(active.modeA).toBe("7p");
    expect(active.rosterA).toHaveLength(7);
    expect(active.rosterB).toEqual(["Ana", "Beto", "J3", "J4", "J5", "J6"]);
    expect(active.modeB).toBe("6p");

    setActiveCourtRosters({ rosterB: ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete"], modeB: "7p" });
    expect(getActiveCourtRosters().rosterB).toHaveLength(7);
  });
});

describe("v11.3.4 1-tap inline court naming", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("renames a 7-player chip inline and updates the serve/entry status", async () => {
    renderBoard();
    enableSeven();
    const strip = screen.getByTestId("rotation-7p-strip");
    expect(strip.textContent).toContain("Serving (#7): J1");

    fireEvent.click(screen.getByTestId("chip-7p-a-0"));
    const input = screen.getByTestId("quick-player-rename-input");
    fireEvent.change(input, { target: { value: "Santi" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByTestId("rotation-7p-strip").textContent).toContain("Serving (#7): Santi"));
    expect(screen.getByTestId("chip-7p-a-0").textContent).toContain("Santi");
    // The renamed label also reaches the shared snapshot for the other boards.
    expect(getActiveCourtRosters().rosterA).toContain("Santi");
    expect(screen.queryByTestId("quick-player-rename-input")).toBeNull();
  });

  it("renames Team A inline from the score card", async () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("quick-edit-team-a"));
    const input = screen.getByTestId("quick-team-name-input");
    fireEvent.change(input, { target: { value: "Sharks" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByTestId("quick-edit-team-a").textContent).toContain("Sharks"));
    expect(getActiveCourtRosters().teamA).toBe("Sharks");
  });

  it("saves Team A into the vault and loads it into Team B", async () => {
    renderBoard();
    enableSeven();
    fireEvent.click(screen.getByTestId("saved-teams-toggle"));
    fireEvent.click(screen.getByTestId("save-preset-a-btn"));

    const panel = screen.getByTestId("saved-teams-panel");
    expect(panel.textContent).toContain("7P (6+1)");
    const loadB = panel.querySelector('[data-testid^="load-preset-b-"]');
    expect(loadB).not.toBeNull();
    fireEvent.click(loadB as HTMLElement);

    await waitFor(() => expect(screen.getByTestId("quick-edit-team-b").textContent).toBe(screen.getByTestId("quick-edit-team-a").textContent));
    const strip = screen.getByTestId("rotation-7p-strip");
    expect(strip.textContent).toContain("Serving (#7): J1");
    const rosterB = getActiveCourtRosters().rosterB;
    expect(rosterB).toHaveLength(7);
    expect(getActiveCourtRosters().teamB).toBe(getActiveCourtRosters().teamA);
  });

  it("deletes a saved preset from the vault", async () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("saved-teams-toggle"));
    fireEvent.click(screen.getByTestId("save-preset-a-btn"));
    const panel = screen.getByTestId("saved-teams-panel");
    const remove = panel.querySelector('[data-testid^="delete-preset-"]');
    expect(remove).not.toBeNull();
    fireEvent.click(remove as HTMLElement);
    await waitFor(() => expect(loadSavedTeams()).toHaveLength(0));
    expect(screen.getByTestId("saved-teams-panel").textContent).toContain("No saved teams yet");
  });
});

describe("v11.3.4 locale auto-detect (en/pt/es)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Opt into the real navigator-language detection path for tests.
    window.localStorage.setItem(LOCALE_AUTODETECT_TEST_KEY, "1");
  });
  afterEach(() => cleanup());

  it("detectInitialLocale returns 'en' when navigator.language is 'en-US' and no stored pref", () => {
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["en-US", "en"], configurable: true });
    expect(detectInitialLocale("es")).toBe("en");
  });

  it("detectInitialLocale returns 'pt' when navigator.language is 'pt-BR' and no stored pref", () => {
    Object.defineProperty(navigator, "language", { value: "pt-BR", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["pt-BR", "pt"], configurable: true });
    expect(detectInitialLocale("es")).toBe("pt");
  });

  it("detectInitialLocale returns 'es' as fallback for unknown languages", () => {
    Object.defineProperty(navigator, "language", { value: "de-DE", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["de-DE", "de"], configurable: true });
    expect(detectInitialLocale("es")).toBe("es");
  });

  it("stored voleyos_locale always wins over navigator detection", () => {
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    window.localStorage.setItem(LOCALE_PREF_KEY, "pt");
    expect(detectInitialLocale("es")).toBe("pt");
    window.localStorage.removeItem(LOCALE_PREF_KEY);
  });

  it("VolleyOSHub boots in English when navigator.language is 'en-US' and auto-detect test flag is set", async () => {
    Object.defineProperty(navigator, "language", { value: "en-US", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["en-US", "en"], configurable: true });
    render(<VolleyOSHub locale="es" />);
    await waitFor(() => expect(screen.getByTestId("header-mode-toggle")).toBeTruthy());
    // The header should show English labels when the detected locale is EN.
    expect(screen.getByTestId("header-mode-toggle").textContent).toContain("Simple Mode");
  });

  it("VolleyOSHub boots in Portuguese when navigator.language is 'pt-BR' and auto-detect test flag is set", async () => {
    Object.defineProperty(navigator, "language", { value: "pt-BR", configurable: true });
    Object.defineProperty(navigator, "languages", { value: ["pt-BR", "pt"], configurable: true });
    render(<VolleyOSHub locale="es" />);
    await waitFor(() => expect(screen.getByTestId("header-mode-toggle")).toBeTruthy());
    expect(screen.getByTestId("header-mode-toggle").textContent).toContain("Modo Simples");
  });
});
