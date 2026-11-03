import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ScoreboardStation, PickupStation } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
import {
  applyAutoLiberoSwap,
  computeFivbPoolStandings,
  validateFivbRotationOverlap,
  type FivbPoolMatch,
  type RotationPosition,
  type RotationSlot,
} from "@/lib/datavolley-courtside-engine";
import {
  MMR_RECORD_KEY,
  PIPELINE_TEAMS_KEY,
  VAQUITA_DEBTS_KEY,
  loadPlayerMmr,
  parseWhatsAppListAndBalanceTeams,
  parseWhatsAppPlayerNames,
} from "@/lib/community-match-pipeline";
import { MODULE_BY_SLUG } from "@/lib/modules";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};
const noop = (): void => undefined;

const repo = (...parts: string[]): string => path.resolve(process.cwd(), "..", ...parts);

describe("v11.0.0 Full Overhaul", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.backgroundColor = "";
  });

  afterEach(() => cleanup());

  /* PHASE 0 — privacy purge ------------------------------------------------ */
  it("has zero posthog / session-replay references in layout, hub and config", () => {
    for (const relative of [
      "src/app/layout.tsx",
      "src/components/VolleyOSHub.tsx",
      "next.config.ts",
      "package.json",
    ]) {
      const file = repo("frontend", relative);
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8").toLowerCase();
      expect(text).not.toContain("posthog");
      expect(text).not.toContain("sessionreplay");
      expect(text).not.toContain("session-replay");
    }
  });

  /* PHASE 1 — hub quick launch + workstations ------------------------------ */
  it("renders the 3-path quick launch and filters modules by workstation", () => {
    render(<VolleyOSHub locale="es" />);
    expect(screen.getByTestId("quick-launch-paths")).toBeTruthy();
    expect(screen.getByTestId("quick-path-fast-match")).toBeTruthy();
    expect(screen.getByTestId("quick-path-tournament")).toBeTruthy();
    expect(screen.getByTestId("quick-path-scouting")).toBeTruthy();

    const bar = screen.getByTestId("workstation-bar");
    expect(bar).toBeTruthy();
    const beta = screen.getAllByTestId("experimental-beta-badge");
    expect(beta.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByTestId("workstation-pill-match"));
    const filtered = screen.getAllByTestId("module-card");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(61);
  });

  /* PHASE 3 — dock, focus, OLED, El Juez ----------------------------------- */
  it("exposes the primary dock, focus mode, OLED mode and the El Juez drawer", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);

    const dock = screen.getByTestId("cancha-primary-dock");
    expect(dock).toBeTruthy();
    expect(screen.getByTestId("enter-table-mode-btn")).toBeTruthy();
    expect(screen.getByTestId("cancha-more-drawer-toggle")).toBeTruthy();

    // Focus mode ships OFF: the topbar stays visible for legacy flows.
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    const focus = screen.getByTestId("focus-mode-toggle");
    expect(focus.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("cancha-topbar").className).not.toContain(" hidden");
    fireEvent.click(focus);
    expect(focus.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("cancha-topbar").className).toContain(" hidden");
    // Pure #000000 OLED (drawer is open).
    const oled = screen.getByTestId("oled-theme-toggle");
    fireEvent.click(oled);
    expect(document.body.style.backgroundColor).toBe("rgb(0, 0, 0)");

    // El Juez quick rules drawer (inline, non-blocking).
    expect(screen.getByTestId("inline-live-metrics-strip").textContent).toContain("K1");
    fireEvent.click(screen.getByTestId("inline-rules-drawer-btn"));
    expect(screen.getByTestId("inline-rules-drawer").textContent?.length ?? 0).toBeGreaterThan(20);
  });

  /* PHASE 3 — scouting depth, quick tagger → .DVW, swipe pad, voice fallback */
  it("generates DataVolley codes from the quick tagger and swipe pad", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    fireEvent.click(screen.getByTestId("scout-depth-2"));
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));

    fireEvent.click(screen.getByTestId("tagger-attack"));
    expect(screen.getByTestId("tagger-last-code").textContent).toBe("*14AH#");

    const jersey = screen.getByTestId("tagger-jersey-select") as HTMLSelectElement;
    fireEvent.change(jersey, { target: { value: "5" } });
    fireEvent.click(screen.getByTestId("tagger-ace"));
    expect(screen.getByTestId("tagger-last-code").textContent).toBe("*05A#");

    fireEvent.click(screen.getByTestId("swipe-down"));
    expect(screen.getByTestId("tagger-last-code").textContent).toBe("=");

    // Voice dictation without SpeechRecognition opens the text fallback.
    fireEvent.click(screen.getByTestId("voice-scout-dictation-btn"));
    expect(screen.getByTestId("voice-scout-text-input")).toBeTruthy();
    expect(screen.getByTestId("swipe-scout-pad")).toBeTruthy();
  });

  /* PHASE 2 — WhatsApp pipeline (balance → bench → send) ------------------- */
  it("parses WhatsApp lists, balances teams and stores the pipeline for Cancha", () => {
    const ratings = { Ana: 90, Beto: 85, Cara: 80, Dario: 30, Emma: 20 };
    window.localStorage.setItem(MMR_RECORD_KEY, JSON.stringify(ratings));

    const parsedNames = parseWhatsAppPlayerNames("Lista de hoy:\n1. Ana\n2. Beto\n3. Cara\n- Dario\n* Emma\n🎉🎉");
    expect(parsedNames).toEqual(["Ana", "Beto", "Cara", "Dario", "Emma"]);

    const balance = parseWhatsAppListAndBalanceTeams("1. Ana\n2. Beto\n3. Cara\n- Dario\n* Emma", loadPlayerMmr());
    expect([...balance.teamA, ...balance.teamB].sort()).toEqual(["Ana", "Beto", "Cara", "Dario", "Emma"]);
    expect(balance.teamA.length).toBeGreaterThan(0);
    expect(balance.teamB.length).toBeGreaterThan(0);
    expect(balance.bench.length).toBeGreaterThan(0);
    expect(balance.bench.every((name) => balance.teamA.concat(balance.teamB).includes(name))).toBe(true);
    expect(balance.unrated).toEqual([]);

    render(<PickupStation meta={meta("pickup")} locale="es" onSave={noop} />);
    fireEvent.change(screen.getByTestId("whatsapp-list-input"), { target: { value: "1. Ana\n2. Beto\n3. Cara" } });
    fireEvent.click(screen.getByTestId("pipeline-balance-btn"));
    expect(screen.getByTestId("pipeline-balance-preview").textContent).toContain("Ana");
    fireEvent.click(screen.getByTestId("pipeline-send-to-cancha-btn"));
    const stored = window.localStorage.getItem(PIPELINE_TEAMS_KEY);
    expect(stored).toBeTruthy();
    expect(JSON.stringify(JSON.parse(stored ?? "{}").teamA)).toContain("Ana");
  });

  it("boots Cancha with the teams pushed from the WhatsApp pipeline", () => {
    window.localStorage.setItem(
      PIPELINE_TEAMS_KEY,
      JSON.stringify({ teamA: ["Ana", "Cara"], teamB: ["Beto", "Dario"], bench: ["Emma"] }),
    );
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    expect(document.body.textContent).toContain("Ana · Cara");
  });

  it("keeps the La Vaquita 2.0 debtors ledger persistent", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    fireEvent.click(screen.getByTestId("match-hub-toggle"));
    fireEvent.change(screen.getByTestId("vaquita-alias-input"), { target: { value: "Chino" } });
    fireEvent.click(screen.getByTestId("add-vaquita-debt-btn"));
    expect(screen.getByTestId("vaquita-debtors-ledger").textContent).toContain("Chino");
    expect(window.localStorage.getItem(VAQUITA_DEBTS_KEY)).toContain("Chino");

    // MVP / Mufa votes move the local MMR record.
    fireEvent.change(screen.getByTestId("mvp-vote-input"), { target: { value: "Cara" } });
    fireEvent.click(screen.getByTestId("vote-mvp-btn"));
    const savedRecord = JSON.parse(window.localStorage.getItem(MMR_RECORD_KEY) ?? "{}") as Record<string, number>;
    expect(savedRecord.Cara).toBe(55);
    expect(screen.getByTestId("export-match-png-btn")).toBeTruthy();
    expect(screen.getByTestId("copy-debt-reminder-btn")).toBeTruthy();
  });

  /* PHASE 4 — 5-1 overlap, standings, auto-libero -------------------------- */
  it("validates official 5-1 overlap positions", () => {
    const legal: Record<RotationSlot, RotationPosition> = {
      1: { x: 5, y: 8 },
      2: { x: 5, y: 1 },
      3: { x: 3, y: 1 },
      4: { x: 1, y: 1 },
      5: { x: 1, y: 8 },
      6: { x: 3, y: 8 },
    };
    expect(validateFivbRotationOverlap(legal).legal).toBe(true);

    const overlap = validateFivbRotationOverlap({ ...legal, 1: { x: 5, y: 1 }, 2: { x: 5, y: 8 } });
    expect(overlap.legal).toBe(false);
    expect(overlap.violations).toContain("P2<P1");
  });

  it("ranks a triangular pool by the FIVB tie-breaker chain", () => {
    const matches: FivbPoolMatch[] = [
      { teamA: "Tiburones", teamB: "Cóndores", setScores: [[25, 15], [25, 20], [25, 12]] },
      {
        teamA: "Tiburones",
        teamB: "Malvinas",
        setScores: [[25, 22], [20, 25], [25, 23], [22, 25], [15, 12]],
      },
      {
        teamA: "Cóndores",
        teamB: "Malvinas",
        setScores: [[25, 20], [23, 25], [25, 18], [25, 28], [15, 13]],
      },
    ];
    const rows = computeFivbPoolStandings(matches);
    expect(rows.map((row) => row.team)).toEqual(["Tiburones", "Cóndores", "Malvinas"]);
    expect(rows[0]?.matchPoints).toBe(5);
    expect(rows[1]?.matchPoints).toBe(2); // 3-2 winner earns 2, not 3
    expect(rows[2]?.matchPoints).toBe(2); // 3-2 loser earns 1 per match ×2
    expect(rows[0]?.team).toBe("Tiburones");
  });

  it("swaps the libero in for a back-row middle blocker without touching sub counts", () => {
    const roster = [
      { number: 1, role: "L" },
      { number: 7, role: "MB" },
    ];
    const lineup = [4, 5, 6, 2, 7, 3]; // MB #7 in back slot index 4 (P5)
    const swap = applyAutoLiberoSwap(lineup, roster, null);
    expect(swap.active).toEqual({ libero: 1, replaced: 7 });
    expect(swap.lineup).toEqual([4, 5, 6, 2, 1, 3]);
    // The reset: libero leaves when its MB is not in a back-row slot anymore.
    const stay = applyAutoLiberoSwap([3, 4, 5, 6, 2, 1], roster, swap.active);
    expect(stay.active).toEqual({ libero: 1, replaced: 7 });
    const release = applyAutoLiberoSwap([2, 1, 3, 4, 5, 6], roster, stay.active);
    expect(release.active).toBeNull();
    expect(release.lineup).toEqual([2, 7, 3, 4, 5, 6]);
  });

  it("renders the diagnostic cards with zero NaN", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    expect(screen.getByTestId("timeout-diagnostic-card").textContent).not.toContain("NaN");
    expect(screen.getByTestId("three-match-keys-card").textContent).not.toContain("NaN");
  });

  it("exposes the lineup (roster QR swap) code export inside the drawer", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    fireEvent.click(screen.getByTestId("roster-qr-swap-btn"));
    const input = screen.getByTestId("roster-swap-input") as HTMLTextAreaElement;
    expect(input.value).toMatch(/^\d+(,\d+){5}\|\d+(,\d+){5}$/);
  });

  it("ranks overlap status and standings from the Cancha drawer", async () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("cancha-more-drawer-toggle"));
    expect(screen.getByTestId("fivb-overlap-status").textContent).toContain("✅");
    fireEvent.click(screen.getByTestId("overlap-demo-swap-btn"));
    await waitFor(() => expect(screen.getByTestId("fivb-overlap-status").textContent).toContain("⚠️"));

    fireEvent.change(screen.getByTestId("triangular-results-input"), {
      target: { value: "Tiburones 25-20 25-18 25-22 Cóndores" },
    });
    fireEvent.click(screen.getByTestId("triangular-compute-btn"));
    expect(screen.getByTestId("triangular-standings").textContent).toContain("Tiburones");
  });
});
