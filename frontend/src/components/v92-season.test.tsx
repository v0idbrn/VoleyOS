import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CasualPlayerSuite } from "./CasualPlayerSuite";
import { ScoreboardStation } from "./stations";
import { VolleyOSHub } from "./VolleyOSHub";
import { SEASON_KEY, loadSeason, type SeasonMatch } from "@/lib/season-vault";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { newScoreboard } from "@/lib/local-engines";

const meta = MODULE_BY_SLUG.get("scoreboard");
if (!meta) throw new Error("scoreboard module missing");

const noop = (): void => undefined;

const match = (
  id: string,
  date: string,
  teamA: string,
  teamB: string,
  setsA: number,
  setsB: number,
  winner: "A" | "B",
): SeasonMatch => ({
  id,
  date,
  mode: "picadito",
  teamA,
  teamB,
  setsA,
  setsB,
  setScores: [
    { setNumber: 1, a: 15, b: 10 },
    { setNumber: 2, a: 15, b: 12 },
  ],
  winner,
});

describe("mi temporada", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
  });

  afterEach(() => cleanup());

  it("saves a finished match from Cancha with one tap and chains the flow bar", async () => {
    const finished = newScoreboard("Tiburones", "Cóndores", 3, {
      status: "finished",
      winner: "A",
      setsA: 2,
      setsB: 0,
      setHistory: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
      ],
    });
    window.localStorage.setItem("volleyos.liveScoreboard", JSON.stringify(finished));
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);

    expect(screen.getByTestId("flow-wizard")).toBeDefined();
    fireEvent.click(screen.getByTestId("save-season"));
    await waitFor(() => expect(loadSeason()).toHaveLength(1));
    const saved = loadSeason()[0] as SeasonMatch;
    expect(saved.teamA).toBe("Tiburones");
    expect(saved.winner).toBe("A");
    expect(saved.setScores).toHaveLength(2);
    expect(screen.getByText(/Partido guardado en/)).toBeDefined();
  });

  it("auto-saves the match the moment it closes and never duplicates it", async () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    const home = screen.getByRole("button", { name: "+ Tiburones [A]" });
    for (let index = 0; index < 25; index += 1) fireEvent.click(home);
    for (let index = 0; index < 25; index += 1) fireEvent.click(home);
    await waitFor(() => expect(loadSeason()).toHaveLength(1));
    const saved = loadSeason()[0] as SeasonMatch;
    expect(saved.mode).toBe("oficial");
    expect(saved.setsA).toBe(2);
    expect(screen.getByText(/guardado en Mi Temporada/)).toBeDefined();

    fireEvent.click(screen.getByTestId("save-season"));
    expect(loadSeason()).toHaveLength(1);
  });

  it("renders the season dashboard with totals, trend and rivalries", () => {
    window.localStorage.setItem(
      SEASON_KEY,
      JSON.stringify([
        match("m3", "2026-10-15", "Tiburones", "Cóndores", 2, 0, "A"),
        match("m1", "2026-10-01", "Tiburones", "Cóndores", 2, 1, "A"),
        match("m2", "2026-10-08", "Cóndores", "Tiburones", 1, 2, "B"),
      ]),
    );
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Mi Temporada/ }));
    const vault = screen.getByTestId("season-vault");
    expect(vault.textContent).toContain("Tiburones");
    expect(screen.getByTestId("season-trend")).toBeDefined();
    expect(vault.textContent).toContain("Cóndores 0 - 3 Tiburones");
    expect(screen.getByText(/🔥3/)).toBeDefined();
  });

  it("exports the season summary to WhatsApp and the CSV fallback", async () => {
    window.localStorage.setItem(SEASON_KEY, JSON.stringify([match("m1", "2026-10-01", "Tiburones", "Cóndores", 2, 0, "A")]));
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Mi Temporada/ }));

    fireEvent.click(screen.getByTestId("season-whatsapp"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(String(vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0] ?? "")).toContain("Mi Temporada");

    // jsdom has no URL.createObjectURL, so the CSV export takes the clipboard path.
    fireEvent.click(screen.getByTestId("season-csv"));
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((node) => (node.textContent ?? "").includes("CSV"))).toBe(true),
    );
  });

  it("chains the five Picadito steps in one tap", () => {
    const onScoreboard = vi.fn();
    window.addEventListener("voleyos:open-scoreboard", onScoreboard);
    render(<CasualPlayerSuite locale="es" />);
    expect(screen.getByTestId("flow-wizard")).toBeDefined();

    fireEvent.click(screen.getByTestId("flow-step-5"));
    expect(screen.getByRole("tab", { name: /La Vaquita/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByTestId("flow-step-1"));
    expect(screen.getByRole("tab", { name: /Lista de WhatsApp/ }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByTestId("flow-step-3"));
    expect(onScoreboard).toHaveBeenCalledOnce();
    window.removeEventListener("voleyos:open-scoreboard", onScoreboard);
  });

  it("shows the scheduled match readiness banner on the home tab", () => {
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    expect(render(<VolleyOSHub locale="es" />).queryByTestId("next-match-banner")).toBeNull();
    cleanup();

    window.localStorage.setItem(
      "voleyos_flow_roster_v1",
      JSON.stringify({
        venue: "Cancha Municipal",
        time: "21:00",
        capacity: 12,
        confirmed: [{ id: "ana", name: "Ana", paid: false, gear: [] }],
        waitlist: [],
      }),
    );
    window.localStorage.setItem("volleyos.acwrLoad", "150");
    render(<VolleyOSHub locale="es" />);
    const banner = screen.getByTestId("next-match-banner");
    expect(banner.textContent).toContain("21:00");
    expect(banner.textContent).toContain("Cancha Municipal");
    expect(banner.textContent).toContain("ACWR");
    expect(banner.textContent).toContain("Pelota");
  });
});
