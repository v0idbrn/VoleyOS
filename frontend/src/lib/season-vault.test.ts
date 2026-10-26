import { beforeEach, describe, expect, it } from "vitest";

import {
  FLOW_ROSTER_KEY,
  SEASON_KEY,
  clearSeason,
  loadFlowRoster,
  loadSeason,
  matchId,
  saveFlowRoster,
  saveSeasonMatch,
  seasonMatchFromState,
  seasonStats,
  seasonSummaryText,
  seasonToCsv,
  trendPath,
  type SeasonMatch,
} from "@/lib/season-vault";
import { newScoreboard } from "@/lib/local-engines";
import type { OrganizerRoster } from "@/lib/casual-engines";

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

const HISTORY: SeasonMatch[] = [
  match("m3", "2026-10-15", "Tiburones", "Cóndores", 2, 0, "A"),
  match("m1", "2026-10-01", "Tiburones", "Cóndores", 2, 1, "A"),
  match("m2", "2026-10-08", "Cóndores", "Tiburones", 1, 2, "B"),
];

describe("season vault persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores matches newest first and never duplicates a finished match", () => {
    const first = HISTORY[2] as SeasonMatch;
    saveSeasonMatch(first);
    saveSeasonMatch(HISTORY[1] as SeasonMatch);
    saveSeasonMatch(first);
    const stored = loadSeason();
    expect(stored).toHaveLength(2);
    expect(stored[0]?.id).toBe("m2");
    expect(stored[1]?.id).toBe("m1");
  });

  it("survives corrupt storage by returning an empty season", () => {
    window.localStorage.setItem(SEASON_KEY, "{not json");
    expect(loadSeason()).toEqual([]);
    window.localStorage.setItem(SEASON_KEY, '{"nope":1}');
    expect(loadSeason()).toEqual([]);
    clearSeason();
    expect(loadSeason()).toEqual([]);
  });

  it("builds a storable match from the live scoreboard", () => {
    const live = newScoreboard("Tiburones", "Cóndores", 3, {
      scoreA: 21,
      scoreB: 18,
      setNumber: 2,
      setHistory: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
      setsA: 1,
    });
    const built = seasonMatchFromState(live, "picadito", new Date("2026-10-26T12:00:00Z"));
    expect(built.date).toBe("2026-10-26");
    expect(built.mode).toBe("picadito");
    expect(built.winner).toBe("A");
    expect(built.setScores).toEqual([
      { setNumber: 1, a: 25, b: 20 },
      { setNumber: 2, a: 21, b: 18 },
    ]);
    expect(built.id).toBe(matchId("Tiburones", "Cóndores", 1, 0, built.setScores));
    // A finished match keeps only its completed sets (scores reset to 0).
    const done = seasonMatchFromState(
      { ...live, status: "finished", winner: "B", scoreA: 0, scoreB: 0, setsA: 1, setsB: 2 },
      "oficial",
      new Date("2026-10-26T12:00:00Z"),
    );
    expect(done.winner).toBe("B");
    expect(done.setScores).toHaveLength(1);
  });
});

describe("season stats", () => {
  const stats = seasonStats(HISTORY);

  it("totals matches, sets and win rates per team", () => {
    expect(stats.matches).toBe(3);
    expect(stats.setsPlayed).toBe(6);
    const tiburones = stats.winRates.find((row) => row.team === "Tiburones");
    const condores = stats.winRates.find((row) => row.team === "Cóndores");
    expect(tiburones).toMatchObject({ played: 3, wins: 3, rate: 1 });
    expect(condores).toMatchObject({ played: 3, wins: 0, rate: 0 });
  });

  it("walks chronologically for the best streak", () => {
    expect(stats.bestStreak).toEqual({ team: "Tiburones", streak: 3 });
  });

  it("normalises head-to-head rivalries regardless of side orientation", () => {
    expect(stats.rivalries).toHaveLength(1);
    const rivalry = stats.rivalries[0];
    expect(rivalry?.total).toBe(3);
    expect([rivalry?.teamA, rivalry?.teamB]).toEqual(["Cóndores", "Tiburones"]);
    expect(rivalry?.winsB).toBe(3);
    expect(rivalry?.winsA).toBe(0);
  });

  it("charts the cumulative win trend of the most-played team", () => {
    expect(stats.trend.team).toBe("Tiburones");
    expect(stats.trend.points.map((point) => point.rate)).toEqual([1, 1, 1]);
    expect(trendPath(stats.trend.points)).toBe("0,0 120,0 240,0");
    expect(trendPath([])).toBe("");
    expect(trendPath([{ rate: 0.5 }])).toBe("0,30 240,30");
  });
});

describe("season exports", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders a quoted CSV with one row per match", () => {
    const csv = seasonToCsv([match("m1", "2026-10-01", 'Tiburones "A"', "Cóndores", 2, 0, "A")]);
    const [header, row] = csv.split("\r\n");
    expect(header).toContain("Fecha");
    expect(row).toContain('"Tiburones ""A"""');
    expect(row).toContain("15-10 / 15-12");
  });

  it("builds a trilingual WhatsApp summary", () => {
    const es = seasonSummaryText(HISTORY, "es");
    const en = seasonSummaryText(HISTORY, "en");
    expect(es).toContain("Mi Temporada");
    expect(es).toContain("Racha");
    expect(en).toContain("My Season");
    expect(en).toContain("Streak");
    expect(en).toContain("Tiburones ×3");
  });
});

describe("chained flow roster handoff", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists and restores the roster between workflow steps", () => {
    const roster: OrganizerRoster = {
      venue: "Cancha Municipal",
      time: "21:00",
      capacity: 12,
      confirmed: [{ id: "ana", name: "Ana", paid: false, gear: [] }],
      waitlist: [],
    };
    saveFlowRoster(roster);
    expect(loadFlowRoster()).toEqual(roster);
    saveFlowRoster(null);
    expect(loadFlowRoster()).toBeNull();
    expect(window.localStorage.getItem(FLOW_ROSTER_KEY)).toBeNull();
  });

  it("rejects corrupted handoff payloads", () => {
    window.localStorage.setItem(FLOW_ROSTER_KEY, JSON.stringify({ venue: 42 }));
    expect(loadFlowRoster()).toBeNull();
    window.localStorage.setItem(FLOW_ROSTER_KEY, "not json");
    expect(loadFlowRoster()).toBeNull();
  });
});
