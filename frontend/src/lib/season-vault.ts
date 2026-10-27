import { t } from "@/lib/i18n";
import { type Locale, type ScoreboardState } from "@/lib/local-engines";
import { safeJsonParse } from "@/lib/security-shield";
import type { OrganizerRoster } from "@/lib/casual-engines";

export const SEASON_KEY = "voleyos_season_history_v1";
export const FLOW_ROSTER_KEY = "voleyos_flow_roster_v1";

export type MatchMode = "picadito" | "king" | "oficial";

export interface SeasonSet {
  setNumber: number;
  a: number;
  b: number;
}

export interface SeasonMatch {
  id: string;
  date: string;
  mode: MatchMode;
  teamA: string;
  teamB: string;
  setsA: number;
  setsB: number;
  setScores: SeasonSet[];
  winner: "A" | "B";
  mvp?: string;
}

/** Deterministic identity so a finished match is never stored twice. */
export function matchId(teamA: string, teamB: string, setsA: number, setsB: number, setScores: SeasonSet[]): string {
  const line = setScores.map((set) => `${set.a}-${set.b}`).join(",");
  return `${teamA}|${teamB}|${setsA}-${setsB}|${line}`;
}

function isMatch(value: unknown): value is SeasonMatch {
  if (typeof value !== "object" || value === null) return false;
  const match = value as Partial<SeasonMatch>;
  return (
    typeof match.id === "string" &&
    typeof match.date === "string" &&
    typeof match.teamA === "string" &&
    typeof match.teamB === "string" &&
    typeof match.setsA === "number" &&
    typeof match.setsB === "number" &&
    (match.winner === "A" || match.winner === "B") &&
    Array.isArray(match.setScores)
  );
}

export function loadSeason(): SeasonMatch[] {
  try {
    const raw = window.localStorage.getItem(SEASON_KEY);
    if (!raw) return [];
    const parsed: unknown = safeJsonParse(raw, null);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMatch);
  } catch {
    return [];
  }
}

export function persistSeason(history: SeasonMatch[]): SeasonMatch[] {
  try {
    window.localStorage.setItem(SEASON_KEY, JSON.stringify(history));
  } catch {
    /* storage unavailable */
  }
  return history;
}

/** Appends (or refreshes) a match, newest first, deduped by deterministic id. */
export function saveSeasonMatch(match: SeasonMatch): SeasonMatch[] {
  return persistSeason([match, ...loadSeason().filter((entry) => entry.id !== match.id)]);
}

export function clearSeason(): void {
  try {
    window.localStorage.removeItem(SEASON_KEY);
  } catch {
    /* ignore */
  }
}

/** Builds a storable match from the live scoreboard (auto + manual save). */
export function seasonMatchFromState(state: ScoreboardState, mode: MatchMode, today = new Date()): SeasonMatch {
  const setScores: SeasonSet[] = (state.setHistory ?? []).map((set) => ({
    setNumber: set.setNumber,
    a: set.scoreA,
    b: set.scoreB,
  }));
  if (state.status === "live" && (state.scoreA > 0 || state.scoreB > 0)) {
    setScores.push({ setNumber: state.setNumber, a: state.scoreA, b: state.scoreB });
  }
  const winner: "A" | "B" = state.winner ?? (state.setsA >= state.setsB ? "A" : "B");
  return {
    id: matchId(state.teamA, state.teamB, state.setsA, state.setsB, setScores),
    date: today.toISOString().slice(0, 10),
    mode,
    teamA: state.teamA,
    teamB: state.teamB,
    setsA: state.setsA,
    setsB: state.setsB,
    setScores,
    winner,
  };
}

export interface SeasonRivalry {
  teamA: string;
  teamB: string;
  winsA: number;
  winsB: number;
  total: number;
}

export interface SeasonStats {
  matches: number;
  setsPlayed: number;
  winRates: Array<{ team: string; played: number; wins: number; rate: number }>;
  bestStreak: { team: string; streak: number };
  rivalries: SeasonRivalry[];
  trend: { team: string; points: Array<{ index: number; rate: number }> };
}

function chronological(history: SeasonMatch[]): SeasonMatch[] {
  return [...history].sort((left, right) => (left.date < right.date ? -1 : left.date > right.date ? 1 : 0));
}

export function seasonStats(history: SeasonMatch[]): SeasonStats {
  const chron = chronological(history);
  const played = new Map<string, number>();
  const wins = new Map<string, number>();
  const pairs = new Map<string, SeasonRivalry>();
  let setsPlayed = 0;

  const bump = (map: Map<string, number>, key: string): void => {
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (const match of history) {
    bump(played, match.teamA);
    bump(played, match.teamB);
    setsPlayed += match.setScores.length;
    const winnerTeam = match.winner === "A" ? match.teamA : match.teamB;
    bump(wins, winnerTeam);
    const [first, second] = [match.teamA, match.teamB].sort() as [string, string];
    const key = `${first}|${second}`;
    const rivalry = pairs.get(key) ?? { teamA: first, teamB: second, winsA: 0, winsB: 0, total: 0 };
    rivalry.total += 1;
    if (winnerTeam === first) rivalry.winsA += 1;
    else rivalry.winsB += 1;
    pairs.set(key, rivalry);
  }

  // Best win streak, walking matches oldest to newest.
  let bestStreak = { team: "—", streak: 0 };
  const running = new Map<string, number>();
  for (const match of chron) {
    const winnerTeam = match.winner === "A" ? match.teamA : match.teamB;
    const loserTeam = match.winner === "A" ? match.teamB : match.teamA;
    running.set(loserTeam, 0);
    const streak = (running.get(winnerTeam) ?? 0) + 1;
    running.set(winnerTeam, streak);
    if (streak > bestStreak.streak) bestStreak = { team: winnerTeam, streak };
  }

  const winRates = [...played.entries()]
    .map(([team, playedCount]) => ({
      team,
      played: playedCount,
      wins: wins.get(team) ?? 0,
      rate: playedCount === 0 ? 0 : (wins.get(team) ?? 0) / playedCount,
    }))
    .sort((left, right) => right.played - left.played || right.wins - left.wins);

  // Cumulative win-rate trend for the most-played team.
  const leader = winRates[0]?.team ?? "—";
  const tally = { wins: 0, played: 0 };
  const points: Array<{ index: number; rate: number }> = [];
  chron.forEach((match, index) => {
    if (match.teamA === leader || match.teamB === leader) {
      tally.played += 1;
      const winnerTeam = match.winner === "A" ? match.teamA : match.teamB;
      if (winnerTeam === leader) tally.wins += 1;
      points.push({ index: tally.played, rate: tally.played === 0 ? 0 : tally.wins / tally.played });
    }
  });

  return {
    matches: history.length,
    setsPlayed,
    winRates,
    bestStreak,
    rivalries: [...pairs.values()].sort((left, right) => right.total - left.total),
    trend: { team: leader, points },
  };
}

/** Polyline points for the SVG win-rate trend chart. */
export function trendPath(points: Array<{ rate: number }>, width = 240, height = 60): string {
  if (points.length === 0) return "";
  const clamp = (rate: number): number => Math.min(1, Math.max(0, rate));
  if (points.length === 1) {
    const y = height - clamp(points[0]?.rate ?? 0) * height;
    return `0,${y} ${width},${y}`;
  }
  return points
    .map((point, index) => {
      const x = Math.round((index * width) / (points.length - 1));
      const y = Math.round(height - clamp(point.rate) * height);
      return `${x},${y}`;
    })
    .join(" ");
}

const csvCell = (value: string | number): string => `"${String(value).replace(/"/g, '""')}"`;

export function seasonToCsv(history: SeasonMatch[]): string {
  const header = ["Fecha", "Modo", "Equipo A", "Equipo B", "Sets A", "Sets B", "Ganador", "Sets", "MVP"];
  const rows = history.map((match) => [
    match.date,
    match.mode,
    match.teamA,
    match.teamB,
    String(match.setsA),
    String(match.setsB),
    match.winner === "A" ? match.teamA : match.teamB,
    match.setScores.map((set) => `${set.a}-${set.b}`).join(" / "),
    match.mvp ?? "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function seasonSummaryText(history: SeasonMatch[], locale: Locale): string {
  const stats = seasonStats(history);
  const lines: string[] = [
    `🏆 ${t(locale, "Mi Temporada — VolleyOS", "My Season — VolleyOS", "Minha Temporada — VolleyOS")}`,
    `${stats.matches} ${t(locale, "partidos", "matches", "jogos")} · ${stats.setsPlayed} ${t(locale, "sets", "sets", "sets")}`,
  ];
  if (stats.bestStreak.streak > 0) {
    lines.push(
      `🔥 ${t(locale, "Racha", "Streak", "Sequência")}: ${stats.bestStreak.team} ×${stats.bestStreak.streak}`,
    );
  }
  for (const rivalry of stats.rivalries.slice(0, 3)) {
    lines.push(`${rivalry.teamA} ${rivalry.winsA} - ${rivalry.winsB} ${rivalry.teamB}`);
  }
  for (const match of history.slice(0, 5)) {
    const winner = match.winner === "A" ? match.teamA : match.teamB;
    lines.push(`${match.date} · ${match.teamA} ${match.setsA}-${match.setsB} ${match.teamB} · 🏆 ${winner}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * Chained Picadito / Weekend-tournament flow handoff
 * ------------------------------------------------------------------ */

export function saveFlowRoster(roster: OrganizerRoster | null): void {
  try {
    if (roster === null) window.localStorage.removeItem(FLOW_ROSTER_KEY);
    else window.localStorage.setItem(FLOW_ROSTER_KEY, JSON.stringify(roster));
  } catch {
    /* storage unavailable */
  }
}

export function loadFlowRoster(): OrganizerRoster | null {
  try {
    const raw = window.localStorage.getItem(FLOW_ROSTER_KEY);
    if (!raw) return null;
    const value: unknown = safeJsonParse(raw, null);
    if (typeof value !== "object" || value === null) return null;
    const roster = value as Partial<OrganizerRoster>;
    if (!Array.isArray(roster.confirmed) || !Array.isArray(roster.waitlist)) return null;
    if (typeof roster.venue !== "string" || typeof roster.time !== "string") return null;
    return roster as OrganizerRoster;
  } catch {
    return null;
  }
}
