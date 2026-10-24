/**
 * Offline-first TypeScript mirror of the 60 VolleyOS Python engines.
 * Runs in the browser with zero network and zero telemetry.
 */

export type Locale = "es" | "en" | "pt";
export type Profile = "players" | "coaches" | "court" | "tournaments" | "referees" | "fans";
export type Side = "A" | "B";

export const LOCALES: Locale[] = ["es", "en", "pt"];

export function buildTarget(): "cloud" | "fdroid" {
  return process.env.NEXT_PUBLIC_BUILD_TARGET === "fdroid" ? "fdroid" : "cloud";
}

export function paywallEnabled(): boolean {
  return buildTarget() === "cloud";
}

/* ---------------------------------------------------------------- module 1 */

export function verticalJumpCm(takeoffMs: number, landingMs: number): number {
  if (landingMs <= takeoffMs) {
    throw new Error("landing must be after takeoff");
  }
  const seconds = (landingMs - takeoffMs) / 1000;
  return round2((1 / 8) * 9.81 * seconds * seconds * 100);
}

export interface FrameInput {
  kneeAngle: number;
  drawAngle: number;
  impactAngle: number;
  windowAngle: number;
  symmetry: number;
}

export interface FrameVerdict {
  frame: number;
  status: string;
  detail: string;
}

export function analyseFiveFrames(input: FrameInput): { frames: FrameVerdict[]; score: number; priority: number } {
  const frames: FrameVerdict[] = [];
  frames.push({
    frame: 1,
    status: input.kneeAngle < 110 ? "TOO_DEEP" : input.kneeAngle > 130 ? "TOO_STRAIGHT" : "OPTIMAL",
    detail: `Rodilla ${input.kneeAngle.toFixed(1)}° (óptimo 110°-130°).`,
  });
  frames.push({
    frame: 2,
    status: input.drawAngle < 70 ? "OVER_DRAWN" : input.drawAngle > 100 ? "UNDER_DRAWN" : "OPTIMAL",
    detail: `Codo de armado ${input.drawAngle.toFixed(1)}° (óptimo 70°-100°).`,
  });
  frames.push({
    frame: 3,
    status: input.impactAngle < 155 ? "T_REX_ARM" : input.impactAngle < 170 ? "NEAR_EXTENSION" : "OPTIMAL",
    detail: `Codo de impacto ${input.impactAngle.toFixed(1)}° (óptimo 170°-180°).`,
  });
  const windowOk = input.windowAngle >= 15 && input.windowAngle <= 35;
  frames.push({
    frame: 4,
    status: windowOk ? "OPTICAL_WINDOW_11_OCLOCK" : input.windowAngle < 5 ? "LATE_WINDOW_12_OCLOCK" : "TRANSITION_WINDOW",
    detail: `Mano ${input.windowAngle.toFixed(1)}° delante de la frente (óptimo 15°-35°).`,
  });
  frames.push({
    frame: 5,
    status: Math.abs(input.symmetry) <= 10 ? "OPTIMAL" : "ASYMMETRIC",
    detail: `Asimetría de aterrizaje ${input.symmetry.toFixed(1)}°.`,
  });
  const optimal = new Set(["OPTIMAL", "OPTICAL_WINDOW_11_OCLOCK"]);
  const failed = frames.filter((frame) => !optimal.has(frame.status));
  const score = Math.max(0, 100 - failed.length * 20);
  return { frames, score, priority: failed[0]?.frame ?? 0 };
}

/* ---------------------------------------------------------------- module 2 */

export interface ZonePoint {
  zone: number;
  x: number;
  y: number;
}

export interface OverlapFault {
  pair: string;
  offender: number;
  rule: string;
  dx: number;
  dy: number;
}

export function formationForRotation(rotation: number): Record<number, number> {
  if (rotation < 1 || rotation > 6) {
    throw new Error("rotation must be 1..6");
  }
  const formation: Record<number, number> = {};
  for (let zone = 1; zone <= 6; zone += 1) {
    formation[zone] = ((zone - 1 + rotation - 1) % 6) + 1;
  }
  return formation;
}

export function defaultPositions(rotation = 1): ZonePoint[] {
  const base: ZonePoint[] = [
    { zone: 4, x: 150, y: 150 },
    { zone: 3, x: 450, y: 150 },
    { zone: 2, x: 750, y: 150 },
    { zone: 5, x: 150, y: 450 },
    { zone: 6, x: 450, y: 450 },
    { zone: 1, x: 750, y: 450 },
  ];
  const offset = rotation * 3;
  return base.map((point) => ({ ...point, x: point.x + offset, y: point.y + offset }));
}

export function validateOverlap(points: ZonePoint[]): { valid: boolean; faults: OverlapFault[] } {
  const byZone = new Map(points.map((point) => [point.zone, point]));
  const faults: OverlapFault[] = [];
  const pair = (front: number, back: number): void => {
    const f = byZone.get(front);
    const b = byZone.get(back);
    if (!f || !b) return;
    if (f.y >= b.y) {
      faults.push({
        pair: `Z${front}/Z${back}`,
        offender: front,
        rule: "El delantero debe estar más cerca de la red (FIVB 7.4).",
        dx: 0,
        dy: -(f.y - b.y) - 10,
      });
    }
  };
  pair(4, 5);
  pair(3, 6);
  pair(2, 1);
  const order = (zones: number[], label: string): void => {
    for (let index = 0; index < zones.length - 1; index += 1) {
      const left = byZone.get(zones[index] as number);
      const right = byZone.get(zones[index + 1] as number);
      if (!left || !right) continue;
      if (left.x >= right.x) {
        faults.push({
          pair: `Z${left.zone}/Z${right.zone}`,
          offender: left.zone,
          rule: `En la fila ${label} el izquierdo debe estar más a la izquierda (FIVB 7.4.2).`,
          dx: -(left.x - right.x) - 10,
          dy: 0,
        });
      }
    }
  };
  order([4, 3, 2], "delantera");
  order([5, 6, 1], "zaguera");
  return { valid: faults.length === 0, faults };
}

/* ---------------------------------------------------------------- module 3 */

export interface ParsedPlay {
  player: number | null;
  skill: string;
  originZone: number | null;
  targetZone: number | null;
  direction: string;
  result: string;
}

export interface ScoutEvent {
  player: number;
  skill: string;
  rotation: number;
  targetZone?: number;
  originZone?: number;
  direction?: string;
  result: string;
  sideOut?: boolean;
}

export interface HeatCell {
  zone: number;
  count: number;
  share: number;
  heat: "cold" | "warm" | "hot" | "volcano";
}

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const SKILLS: Array<[string, string]> = [
  ["saque", "serve"],
  ["serve", "serve"],
  ["bloqueo", "block"],
  ["block", "block"],
  ["defensa", "dig"],
  ["dig", "dig"],
  ["recepcion", "pass"],
  ["pase", "pass"],
  ["pass", "pass"],
  ["armado", "set"],
  ["ataque", "attack"],
  ["remate", "attack"],
  ["attack", "attack"],
  ["spike", "attack"],
];

const DIRECTIONS: Array<[string, string]> = [
  ["diagonal", "diagonal"],
  ["linea", "line"],
  ["line", "line"],
  ["paralela", "line"],
  ["corta", "short"],
  ["short", "short"],
  ["larga", "deep"],
  ["cruzada", "cross"],
];

const RESULTS: Array<[string, string]> = [
  ["punto", "KILL"],
  ["kill", "KILL"],
  ["winner", "KILL"],
  ["ace", "ACE"],
  ["error", "ERROR"],
  ["fuera", "ERROR"],
  ["bloqueado", "BLOCKED"],
  ["blocked", "BLOCKED"],
  ["defensa", "IN_PLAY"],
  ["jugada", "IN_PLAY"],
];

function firstInt(pattern: RegExp, text: string): number | null {
  const match = text.match(pattern);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
}

export function parsePlay(text: string): ParsedPlay {
  const normalized = normalizeText(text);
  const skill = SKILLS.find(([keyword]) => new RegExp(`\\b${keyword}\\b`).test(normalized))?.[1] ?? "attack";
  const player = firstInt(/(?:#|numero\s*|jugador\s*|player\s*)(\d+)/, normalized) ?? firstInt(/\b(?:del|de la|de|from)\s+(\d+)\b/, normalized);
  const originZone = firstInt(/(?:por|desde|from|zona|zone)\s+(?:zona\s+|zone\s+)?(\d+)/, normalized);
  const targetZone = firstInt(/(?:al|a la|hacia|to|target)\s+(\d+)/, normalized);
  const direction = DIRECTIONS.find(([keyword]) => new RegExp(`\\b${keyword}\\b`).test(normalized))?.[1] ?? "unknown";
  const result = RESULTS.find(([keyword]) => new RegExp(`\\b${keyword}\\b`).test(normalized))?.[1] ?? "IN_PLAY";
  return { player, skill, originZone, targetZone, direction, result };
}

export function heatmap(events: ScoutEvent[]): HeatCell[] {
  const counts: Record<number, number> = {};
  for (let zone = 1; zone <= 9; zone += 1) counts[zone] = 0;
  for (const event of events) {
    const zone = event.targetZone ?? event.originZone;
    if (zone && counts[zone] !== undefined) counts[zone] += 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.entries(counts).map(([zoneKey, count]) => {
    const zone = Number.parseInt(zoneKey, 10);
    const share = total === 0 ? 0 : round2((count * 100) / total);
    const heat = share >= 25 ? "volcano" : share >= 15 ? "hot" : share >= 5 ? "warm" : "cold";
    return { zone, count, share, heat } as HeatCell;
  });
}

export function scoutingReport(events: ScoutEvent[]): {
  attempts: number;
  kills: number;
  errors: number;
  blocked: number;
  efficiency: number;
  k1: Record<string, number>;
  worstRotation: string | null;
} {
  const attacks = events.filter((event) => event.skill === "attack");
  const kills = attacks.filter((event) => event.result === "KILL" || event.result === "ACE").length;
  const errors = attacks.filter((event) => event.result === "ERROR").length;
  const blocked = attacks.filter((event) => event.result === "BLOCKED").length;
  const efficiency = attacks.length === 0 ? 0 : round2((kills - errors - blocked) / attacks.length);
  const k1: Record<string, number> = {};
  for (let rotation = 1; rotation <= 6; rotation += 1) {
    const opportunities = events.filter((event) => event.rotation === rotation && event.sideOut);
    if (opportunities.length === 0) continue;
    const wins = opportunities.filter((event) => event.result === "KILL" || event.result === "ACE").length;
    k1[`R${rotation}`] = round2((wins * 100) / opportunities.length);
  }
  const entries = Object.entries(k1);
  const worstRotation = entries.length === 0 ? null : entries.sort((left, right) => left[1] - right[1])[0]?.[0] ?? null;
  return { attempts: attacks.length, kills, errors, blocked, efficiency, k1, worstRotation };
}

/* ---------------------------------------------------------------- module 4 */

export interface RosterPlayer {
  number: number;
  name: string;
  role: "S" | "OH" | "MB" | "OPP" | "L";
  captain?: boolean;
}

export interface TeamRoster {
  id: string;
  name: string;
  code: string;
  color: string;
  players: RosterPlayer[];
  starters: number[];
  libero?: number | null;
  bench: number[];
}

export interface SetHistoryEntry {
  setNumber: number;
  scoreA: number;
  scoreB: number;
}

export interface ScoreboardState {
  teamA: string;
  teamB: string;
  bestOf: number;
  setNumber: number;
  scoreA: number;
  scoreB: number;
  setsA: number;
  setsB: number;
  serving: Side;
  firstServing: Side;
  lineupA: number[];
  lineupB: number[];
  streak: number;
  status: "live" | "finished";
  winner: Side | null;
  matchFormat?: "bo3" | "bo5" | "short15";
  setHistory?: SetHistoryEntry[];
  rosterA?: TeamRoster | null;
  rosterB?: TeamRoster | null;
  isDecider?: boolean;
  isTieBreak?: boolean;
  sideSwitchedAt8?: boolean;
  isCourtSwapped?: boolean;
  targetPoints?: number;
  goldenPoint?: boolean;
}

export interface PointResult {
  state: ScoreboardState;
  rotated: boolean;
  setFinished: boolean;
  matchFinished: boolean;
  sideSwitchDue: boolean;
  message: string;
}

export function newScoreboard(teamA = "Tiburones", teamB = "Cóndores", bestOf = 3, options: Partial<ScoreboardState> = {}): ScoreboardState {
  const format = options.matchFormat ?? (bestOf === 5 ? "bo5" : bestOf === 1 ? "short15" : "bo3");
  return {
    teamA,
    teamB,
    bestOf: format === "bo5" ? 5 : format === "bo3" ? 3 : 1,
    setNumber: 1,
    scoreA: 0,
    scoreB: 0,
    setsA: 0,
    setsB: 0,
    serving: "A",
    firstServing: "A",
    lineupA: options.lineupA ?? [1, 2, 3, 4, 5, 6],
    lineupB: options.lineupB ?? [7, 8, 9, 10, 11, 12],
    streak: 1,
    status: "live",
    winner: null,
    matchFormat: format,
    setHistory: [],
    rosterA: options.rosterA ?? null,
    rosterB: options.rosterB ?? null,
    isDecider: false,
    isTieBreak: false,
    sideSwitchedAt8: false,
    isCourtSwapped: false,
    goldenPoint: false,
    ...options,
  };
}

export function rotateLineup(lineup: number[]): number[] {
  return [lineup[1] as number, lineup[2] as number, lineup[3] as number, lineup[4] as number, lineup[5] as number, lineup[0] as number];
}

export function awardIndoorPoint(state: ScoreboardState, team: Side): PointResult {
  if (state.status !== "live") throw new Error("match is not live");
  const next: ScoreboardState = structuredClone(state);
  if (!next.setHistory) next.setHistory = [];
  const sideOut = team !== next.serving;
  if (sideOut) {
    if (team === "A") next.lineupA = rotateLineup(next.lineupA);
    else next.lineupB = rotateLineup(next.lineupB);
    next.serving = team;
    next.streak = 1;
  } else {
    next.streak += 1;
  }
  if (team === "A") next.scoreA += 1;
  else next.scoreB += 1;

  const format = next.matchFormat ?? (next.bestOf === 5 ? "bo5" : next.bestOf === 1 ? "short15" : "bo3");
  const isDeciderSet = next.setNumber === next.bestOf || (format === "bo3" && next.setNumber === 3) || (format === "bo5" && next.setNumber === 5);
  next.isDecider = isDeciderSet;
  const target = next.targetPoints ?? (isDeciderSet || format === "short15" ? 15 : 25);
  const own = team === "A" ? next.scoreA : next.scoreB;
  const rival = team === "A" ? next.scoreB : next.scoreA;
  const setFinished = next.goldenPoint === true ? own >= target : own >= target && own - rival >= 2;
  let matchFinished = false;
  let message = `Punto ${team} — ${next.scoreA}-${next.scoreB}`;

  const atDeuce = next.goldenPoint !== true && next.scoreA === target - 1 && next.scoreB === target - 1;
  if (atDeuce) {
    message = `🔥 DEUCE — WIN BY 2 — ${next.scoreA}-${next.scoreB}`;
  } else if (setFinished && team === "A") {
    if (own >= target - 1) message = own - rival >= 1 ? `🏆 MATCH POINT — ${team}` : `⚡ SET POINT — ${team}`;
  } else if (setFinished && team === "B") {
    if (own >= target - 1) message = own - rival >= 1 ? `🏆 MATCH POINT — ${team}` : `⚡ SET POINT — ${team}`;
  }

  if (setFinished) {
    if (team === "A") next.setsA += 1;
    else next.setsB += 1;
    if (!next.setHistory) next.setHistory = [];
    next.setHistory.push({ setNumber: next.setNumber, scoreA: next.scoreA, scoreB: next.scoreB });
    const setsNeeded = format === "bo5" ? 3 : 2;
    matchFinished = (team === "A" && next.setsA >= setsNeeded) || (team === "B" && next.setsB >= setsNeeded) || next.setsA > Math.floor(next.bestOf / 2) || next.setsB > Math.floor(next.bestOf / 2);
    if (matchFinished) {
      next.status = "finished";
      next.winner = team;
      message = `🏆 MATCH FINISHED — WINNER: ${team === "A" ? next.teamA : next.teamB} (${next.setsA}-${next.setsB}).`;
    } else {
      next.setNumber += 1;
      next.scoreA = 0;
      next.scoreB = 0;
      next.firstServing = next.firstServing === "A" ? "B" : "A";
      next.serving = next.firstServing;
      next.streak = 1;
      next.sideSwitchedAt8 = false;
      message = `Set para ${team}. Nuevo set ${next.setNumber}.`;
    }
  }
  const sideSwitchDue = ((isDeciderSet || next.isTieBreak) && !setFinished && next.scoreA + next.scoreB === 8) as boolean;
  if (sideSwitchDue) next.sideSwitchedAt8 = true;
  return { state: next, rotated: sideOut, setFinished, matchFinished, sideSwitchDue, message };
}

/**
 * Toggles the on-screen left/right court sides so the scoreboard mirrors the
 * physical court in front of the user. Part of the undo history like a point.
 */
export function swapCourt(state: ScoreboardState): ScoreboardState {
  const next = structuredClone(state);
  next.isCourtSwapped = !(next.isCourtSwapped ?? false);
  return next;
}

/** True when the point-8 side-switch badge should be shown (15-point sets). */
export function point8SwitchDue(state: ScoreboardState): boolean {
  if (state.status !== "live") return false;
  const target = state.targetPoints ?? 15;
  if (target !== 15) return false;
  return Math.max(state.scoreA, state.scoreB) >= 8;
}

/* ---------------------------------------------------------------- module 5 */

export interface KingOfCourtState {
  teams: string[];
  courtA: string;
  courtB: string;
  queue: string[];
  wins: Record<string, number>;
  streakTeam: string | null;
  streak: number;
}

/** Rey de la Cancha: 3-5 rotating teams; the winner stays on court. */
export function newKingOfCourt(teams: string[]): KingOfCourtState {
  const clean = teams.map((name) => name.trim()).filter((name) => name.length > 0);
  if (clean.length < 3 || clean.length > 5) throw new Error("king_of_court needs 3 to 5 teams");
  return {
    teams: clean,
    courtA: clean[0] as string,
    courtB: clean[1] as string,
    queue: clean.slice(2),
    wins: {},
    streakTeam: null,
    streak: 0,
  };
}

/** Winner stays on court, loser joins the back of the queue, next challenger enters at 0-0. */
export function kingAwardWin(state: KingOfCourtState, winnerOnCourt: "A" | "B"): KingOfCourtState {
  const next = structuredClone(state);
  const winner = winnerOnCourt === "A" ? next.courtA : next.courtB;
  const loser = winnerOnCourt === "A" ? next.courtB : next.courtA;
  next.wins[winner] = (next.wins[winner] ?? 0) + 1;
  if (next.streakTeam === winner) {
    next.streak += 1;
  } else {
    next.streakTeam = winner;
    next.streak = 1;
  }
  next.queue = [...next.queue, loser];
  const challenger = next.queue.shift();
  if (challenger === undefined) throw new Error("empty king queue");
  if (winnerOnCourt === "A") next.courtB = challenger;
  else next.courtA = challenger;
  return next;
}

export interface MatchResult {
  home: string;
  away: string;
  homeSets: number;
  awaySets: number;
  homePoints: number;
  awayPoints: number;
}

export interface Standing {
  position: number;
  team: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  setsWon: number;
  setsLost: number;
  setsRatio: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsRatio: number;
}

export function rankingPoints(homeSets: number, awaySets: number): [number, number] {
  if (homeSets === 3 && awaySets <= 1) return [3, 0];
  if (homeSets === 3 && awaySets === 2) return [2, 1];
  if (awaySets === 3 && homeSets <= 1) return [0, 3];
  if (awaySets === 3 && homeSets === 2) return [1, 2];
  throw new Error(`invalid score ${homeSets}-${awaySets}`);
}

function ratio(won: number, lost: number): number {
  if (lost === 0) return won > 0 ? round2(won) : 0;
  return round2(won / lost);
}

export function standings(teams: string[], matches: MatchResult[]): Standing[] {
  const rows = new Map<string, Standing>();
  for (const team of teams) {
    rows.set(team, {
      position: 0,
      team,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      setsRatio: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsRatio: 0,
    });
  }
  for (const match of matches) {
    const home = rows.get(match.home);
    const away = rows.get(match.away);
    if (!home || !away) throw new Error(`unknown team in ${match.home} vs ${match.away}`);
    const [homePoints, awayPoints] = rankingPoints(match.homeSets, match.awaySets);
    home.played += 1;
    away.played += 1;
    home.setsWon += match.homeSets;
    home.setsLost += match.awaySets;
    away.setsWon += match.awaySets;
    away.setsLost += match.homeSets;
    home.pointsFor += match.homePoints;
    home.pointsAgainst += match.awayPoints;
    away.pointsFor += match.awayPoints;
    away.pointsAgainst += match.homePoints;
    home.points += homePoints;
    away.points += awayPoints;
    if (match.homeSets > match.awaySets) {
      home.won += 1;
      away.lost += 1;
    } else {
      away.won += 1;
      home.lost += 1;
    }
  }
  const ordered = [...rows.values()].sort((left, right) => {
    if (right.won !== left.won) return right.won - left.won;
    if (right.points !== left.points) return right.points - left.points;
    if (right.setsRatio !== left.setsRatio) return right.setsRatio - left.setsRatio;
    if (right.pointsRatio !== left.pointsRatio) return right.pointsRatio - left.pointsRatio;
    return left.team.localeCompare(right.team);
  });
  return ordered.map((row, index) => ({
    ...row,
    position: index + 1,
    setsRatio: ratio(row.setsWon, row.setsLost),
    pointsRatio: ratio(row.pointsFor, row.pointsAgainst),
  }));
}

/* ---------------------------------------------------------------- module 6 */

export interface PickupPlayer {
  name: string;
  role: string;
  level: number;
}

export interface PickupTeam {
  name: string;
  players: PickupPlayer[];
  average: number;
  setters: number;
}

export function isSetter(player: PickupPlayer): boolean {
  return ["armador", "armadora", "setter", "colocador"].includes(player.role.toLowerCase());
}

export function averageLevel(players: PickupPlayer[]): number {
  if (players.length === 0) return 0;
  return round2(players.reduce((sum, player) => sum + player.level, 0) / players.length);
}

export function balanceTeams(players: PickupPlayer[], teamCount: number): { teams: PickupTeam[]; delta: number; balanced: boolean } {
  if (teamCount < 2 || teamCount > 4) throw new Error("team_count must be 2..4");
  if (players.filter(isSetter).length < teamCount) throw new Error("need one setter per team");
  const ordered = [...players].sort((left, right) => right.level - left.level || Number(isSetter(right)) - Number(isSetter(left)) || left.name.localeCompare(right.name));
  const buckets: PickupPlayer[][] = Array.from({ length: teamCount }, () => []);
  let forward = true;
  ordered.forEach((player, index) => {
    const slot = forward ? index % teamCount : teamCount - 1 - (index % teamCount);
    (buckets[slot] as PickupPlayer[]).push(player);
    if ((index + 1) % teamCount === 0) forward = !forward;
  });
  buckets.forEach((bucket) => {
    if (bucket.some(isSetter)) return;
    const donorIndex = buckets.findIndex((candidate) => candidate.filter(isSetter).length > 1);
    if (donorIndex < 0) throw new Error("cannot place one setter per team");
    const donor = (buckets[donorIndex] as PickupPlayer[]).find(isSetter) as PickupPlayer;
    const weakest = [...bucket].sort((left, right) => Math.abs(left.level - donor.level) - Math.abs(right.level - donor.level))[0] as PickupPlayer;
    (buckets[donorIndex] as PickupPlayer[]).splice((buckets[donorIndex] as PickupPlayer[]).indexOf(donor), 1);
    bucket.splice(bucket.indexOf(weakest), 1);
    (buckets[donorIndex] as PickupPlayer[]).push(weakest);
    bucket.push(donor);
  });
  const averages = buckets.map(averageLevel);
  const delta = round2(Math.max(...averages) - Math.min(...averages));
  const teams = buckets.map((bucket, index) => ({
    name: `Equipo ${index + 1}`,
    players: [...bucket].sort((left, right) => right.level - left.level),
    average: averageLevel(bucket),
    setters: bucket.filter(isSetter).length,
  }));
  return { teams, delta, balanced: delta <= 0.15 };
}

/* ---------------------------------------------------------------- module 7 */

export interface OverlayPayload {
  teamA: { name: string; sets: number; points: number; serving: boolean };
  teamB: { name: string; sets: number; points: number; serving: boolean };
  setNumber: number;
  bestOf: number;
  serverNumber: number;
  streak: number;
  banner: string | null;
  sponsor: string | null;
  transparent: true;
}

export function overlayFromScoreboard(state: ScoreboardState, sponsor: string | null = null): OverlayPayload {
  const target = state.setNumber === state.bestOf ? 15 : 25;
  const setPoint = (score: number, rival: number): boolean => score >= target - 1 && score - rival >= 1;
  let banner: string | null = null;
  if (state.status === "finished") banner = "FINAL";
  else if (setPoint(state.scoreA, state.scoreB)) banner = state.setsA === Math.floor(state.bestOf / 2) ? "MATCH POINT" : "SET POINT";
  else if (setPoint(state.scoreB, state.scoreA)) banner = state.setsB === Math.floor(state.bestOf / 2) ? "MATCH POINT" : "SET POINT";
  const lineup = state.serving === "A" ? state.lineupA : state.lineupB;
  return {
    teamA: { name: state.teamA, sets: state.setsA, points: state.scoreA, serving: state.serving === "A" },
    teamB: { name: state.teamB, sets: state.setsB, points: state.scoreB, serving: state.serving === "B" },
    setNumber: state.setNumber,
    bestOf: state.bestOf,
    serverNumber: lineup[0] as number,
    streak: state.streak,
    banner,
    sponsor,
    transparent: true,
  };
}

/* ---------------------------------------------------------------- module 8 */

export interface VarDecision {
  title: string;
  citation: string;
  verdict: string;
  explanation: string;
  matched: boolean;
}

const VAR_SCENARIOS: Array<{ keywords: string[]; title: string; citation: string; verdict: string; explanation: string }> = [
  {
    keywords: ["libero", "dedos", "linea de 3", "3 metros"],
    title: "Líbero armando de dedos delante de la línea de 3 m",
    citation: "FIVB 13.3.4 / 19.3.1",
    verdict: "FALTA",
    explanation: "El líbero no puede armar de dedos en zona delantera cuando la jugada termina en ataque.",
  },
  {
    keywords: ["red", "net", "banda", "antena"],
    title: "Toque de red",
    citation: "FIVB 11.3",
    verdict: "FALTA en banda superior/antena",
    explanation: "La banda superior blanca y la antena cuentan; el cabello no.",
  },
  {
    keywords: ["invasion", "pie", "linea central"],
    title: "Invasión por debajo de la red",
    citation: "FIVB 11.2.2",
    verdict: "FALTA",
    explanation: "El pie completo que cruza la línea central es falta.",
  },
  {
    keywords: ["manos", "bloqueo", "block"],
    title: "Manos sobre la red en bloqueo",
    citation: "FIVB 14.3",
    verdict: "LEGAL tras el ataque rival",
    explanation: "Se permite penetrar después del golpe de ataque rival sin interferir.",
  },
  {
    keywords: ["pantalla", "screen", "saque"],
    title: "Pantalla en el saque",
    citation: "FIVB 12.5",
    verdict: "FALTA",
    explanation: "No se puede impedir la visión del receptor.",
  },
  {
    keywords: ["rotacion", "orden", "posicion"],
    title: "Falta de orden de rotación",
    citation: "FIVB 7.7",
    verdict: "FALTA",
    explanation: "Se concede punto y saque al rival y se corrige la posición.",
  },
];

export function decideVar(text: string): VarDecision {
  const normalized = normalizeText(text);
  let best: VarDecision | null = null;
  let bestHits = 0;
  for (const scenario of VAR_SCENARIOS) {
    const hits = scenario.keywords.filter((keyword) => normalized.includes(normalizeText(keyword))).length;
    if (hits > bestHits) {
      best = { ...scenario, matched: true };
      bestHits = hits;
    }
  }
  return best ?? {
    title: "Jugada no reconocida",
    citation: "FIVB Rules 2025-2028",
    verdict: "REVISAR VIDEO",
    explanation: "Describe líbero, red, invasión, bloqueo, pantalla o rotación.",
    matched: false,
  };
}

/* ---------------------------------------------------------------- module 9 */

export interface BeachState {
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
  setsA: number;
  setsB: number;
  setNumber: number;
  bestOf: number;
  serving: Side;
  serverIndexA: 0 | 1;
  serverIndexB: 0 | 1;
  status: "live" | "finished";
  winner: Side | null;
}

export function newBeach(teamA = "Ana y Bea", teamB = "Carla y Dani", bestOf = 3): BeachState {
  return {
    teamA,
    teamB,
    pointsA: 0,
    pointsB: 0,
    setsA: 0,
    setsB: 0,
    setNumber: 1,
    bestOf,
    serving: "A",
    serverIndexA: 0,
    serverIndexB: 0,
    status: "live",
    winner: null,
  };
}

export function beachSwitchInterval(state: BeachState): number {
  return state.setNumber === state.bestOf ? 5 : 7;
}

export function awardBeachPoint(state: BeachState, team: Side): { state: BeachState; sideSwitchDue: boolean; setFinished: boolean; message: string } {
  if (state.status !== "live") throw new Error("match is not live");
  const next: BeachState = structuredClone(state);
  if (team === "A") next.pointsA += 1;
  else next.pointsB += 1;
  if (team !== next.serving) {
    if (team === "A") next.serverIndexA = next.serverIndexA === 0 ? 1 : 0;
    else next.serverIndexB = next.serverIndexB === 0 ? 1 : 0;
    next.serving = team;
  }
  const decider = next.setNumber === next.bestOf;
  const target = decider ? 15 : 21;
  const own = team === "A" ? next.pointsA : next.pointsB;
  const rival = team === "A" ? next.pointsB : next.pointsA;
  const setFinished = own >= target && own - rival >= 2;
  let sideSwitchDue = false;
  let message = `Punto ${team} — ${next.pointsA}-${next.pointsB}`;
  if (setFinished) {
    if (team === "A") next.setsA += 1;
    else next.setsB += 1;
    const matchFinished = next.setsA > Math.floor(next.bestOf / 2) || next.setsB > Math.floor(next.bestOf / 2);
    if (matchFinished) {
      next.status = "finished";
      next.winner = team;
      message = `Partido para ${team}.`;
    } else {
      next.setNumber += 1;
      next.pointsA = 0;
      next.pointsB = 0;
      next.serving = next.serving === "A" ? "B" : "A";
      message = `Set para ${team}. Nuevo set ${next.setNumber}.`;
    }
  } else {
    const total = next.pointsA + next.pointsB;
    sideSwitchDue = total > 0 && total % beachSwitchInterval(next) === 0;
  }
  return { state: next, sideSwitchDue, setFinished, message };
}

/* --------------------------------------------------------------- module 10 */

export type Axis = "attack" | "reception" | "serve" | "block" | "defense" | "setting";
export type SixAttributes = Record<Axis, number>;

export interface VolleyCardInput {
  name: string;
  position: string;
  heightCm: number;
  standingReachCm: number;
  jumpCm: number;
  attributes: SixAttributes;
}

export interface VolleyCard {
  name: string;
  position: string;
  spikeReachCm: number;
  blockReachCm: number;
  archetype: string;
  rarity: "ROOKIE" | "PRO" | "ELITE" | "LEGEND";
  attributes: SixAttributes;
  radar: Array<{ axis: Axis; value: number }>;
}

const ARCHETYPES: Record<Axis, string> = {
  attack: "Francotirador Aéreo",
  reception: "Ancla de Recepción",
  serve: "Cañón de Saque",
  block: "Muro Carmesí",
  defense: "Guardián del Suelo",
  setting: "Director de Orquesta",
};

export function buildVolleyCard(input: VolleyCardInput): VolleyCard {
  if (input.standingReachCm < input.heightCm) throw new Error("standing reach cannot be lower than height");
  if (input.standingReachCm - input.heightCm > 80) throw new Error("unrealistic standing reach");
  const spikeReachCm = round2(input.standingReachCm + input.jumpCm);
  const blockReachCm = round2(input.standingReachCm + input.jumpCm * 0.92);
  const axes: Axis[] = ["attack", "reception", "serve", "block", "defense", "setting"];
  const best = axes.reduce((winner, axis) => (input.attributes[axis] > input.attributes[winner] ? axis : winner), "attack" as Axis);
  const rarity = spikeReachCm >= 350 ? "LEGEND" : spikeReachCm >= 330 ? "ELITE" : spikeReachCm >= 310 ? "PRO" : "ROOKIE";
  return {
    name: input.name,
    position: input.position,
    spikeReachCm,
    blockReachCm,
    archetype: ARCHETYPES[best],
    rarity,
    attributes: input.attributes,
    radar: axes.map((axis) => ({ axis, value: input.attributes[axis] })),
  };
}

/* --------------------------------------------------------------- module 11 */

export type TempoCode = "first" | "second" | "pipe" | "third";

export const TEMPO_SPECS: Record<TempoCode, { label: string; offsetMs: number; toleranceMs: number; description: string }> = {
  first: {
    label: "1° Tiempo (A / Quick Central)",
    offsetMs: -180,
    toleranceMs: 30,
    description: "Despega antes del toque del armador.",
  },
  second: {
    label: "2° Tiempo Rápido (Shoot / Tendida)",
    offsetMs: 0,
    toleranceMs: 40,
    description: "El paso de freno coincide con el toque.",
  },
  pipe: {
    label: "2° Tiempo Pipe",
    offsetMs: 0,
    toleranceMs: 50,
    description: "Ataque de zaguero con timing de segundo tiempo.",
  },
  third: {
    label: "3° Tiempo (Pelota Alta)",
    offsetMs: 350,
    toleranceMs: 60,
    description: "Espera a ver salir la pelota de las manos.",
  },
};

export function tempoWindow(code: TempoCode, contactMs = 0): { label: string; idealMs: number; startMs: number; endMs: number; toleranceMs: number; description: string } {
  const spec = TEMPO_SPECS[code];
  const idealMs = contactMs + spec.offsetMs;
  return {
    label: spec.label,
    idealMs,
    startMs: idealMs - spec.toleranceMs,
    endMs: idealMs + spec.toleranceMs,
    toleranceMs: spec.toleranceMs,
    description: spec.description,
  };
}

export function classifyTiming(code: TempoCode, offsetMs: number): { status: "PERFECT" | "EARLY" | "LATE"; delta: number; message: string } {
  const spec = TEMPO_SPECS[code];
  const delta = offsetMs - spec.offsetMs;
  if (Math.abs(delta) <= spec.toleranceMs) return { status: "PERFECT", delta, message: "Dentro de la ventana." };
  if (delta < 0) return { status: "EARLY", delta, message: `Temprano por ${Math.abs(delta)} ms.` };
  return { status: "LATE", delta, message: `Tarde por ${delta} ms.` };
}

/* --------------------------------------------------------------- module 12 */

export interface DailyJumps {
  date: string;
  jumps: number;
}

export interface AcwrReport {
  acute: number;
  chronicWeekly: number;
  ratio: number;
  zone: string;
  color: "emerald" | "amber" | "crimson";
  recommendation: string;
}

function dayDiff(later: string, earlier: string): number {
  const a = Date.parse(`${later}T00:00:00Z`);
  const b = Date.parse(`${earlier}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

export function jumpLoad(days: DailyJumps[], referenceDate?: string): AcwrReport {
  if (days.length === 0) throw new Error("no jump data");
  const reference = referenceDate ?? [...days].sort((left, right) => left.date.localeCompare(right.date)).at(-1)?.date;
  if (!reference) throw new Error("invalid reference date");
  const recent = days.filter((day) => {
    const diff = dayDiff(reference, day.date);
    return diff >= 0 && diff <= 27;
  });
  if (recent.length === 0) throw new Error("no data in the last 28 days");
  const acute = recent.filter((day) => dayDiff(reference, day.date) <= 6).reduce((sum, day) => sum + day.jumps, 0);
  const chronicWeekly = round2(recent.reduce((sum, day) => sum + day.jumps, 0) / 4);
  if (chronicWeekly === 0) throw new Error("chronic load is zero");
  const ratio = round2(acute / chronicWeekly);
  if (ratio < 0.8) {
    return {
      acute,
      chronicWeekly,
      ratio,
      zone: ratio < 0.7 ? "BAJA CARGA" : "PRECAUCIÓN",
      color: ratio < 0.7 ? "crimson" : "amber",
      recommendation: "Sube la carga gradualmente para evitar el rebote lesivo.",
    };
  }
  if (ratio <= 1.3) {
    return { acute, chronicWeekly, ratio, zone: "ÓPTIMA", color: "emerald", recommendation: "Mantén la progresión actual." };
  }
  if (ratio <= 1.5) {
    return { acute, chronicWeekly, ratio, zone: "FATIGA ACUMULADA", color: "amber", recommendation: "Reduce 20-30% los saltos y prioriza recuperación." };
  }
  return {
    acute,
    chronicWeekly,
    ratio,
    zone: "PELIGRO",
    color: "crimson",
    recommendation: "Riesgo de tendinopatía rotuliana y manguito rotador. Descarga ya.",
  };
}

/* ----------------------------------------------------------------- utils */

export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

/* --------------------------------------------------------------- module 13 */

export type AttackZone = "zone_4" | "zone_2" | "pipe_6" | "quick_3";
export type BlockScheme = "line" | "cross";

export interface BlockShadowInput {
  attackZone: AttackZone;
  blockers: number;
  scheme: BlockScheme;
  blockX?: number;
  blockDepth: number;
}

export interface ShadowPoint {
  x: number;
  y: number;
}

export interface DefenderSpot extends ShadowPoint {
  role: string;
  movedCm: number;
  insideShadow: boolean;
}

export interface BlockShadowReport {
  attackZone: AttackZone;
  scheme: BlockScheme;
  blockers: number;
  blockCenterX: number;
  shadowPolygon: ShadowPoint[];
  shadowAreaM2: number;
  coveragePct: number;
  defenders: DefenderSpot[];
  uncoveredWidthM: number;
  message: string;
}

const ATTACK_TARGET_X: Record<AttackZone, number> = { zone_4: 1.5, zone_2: 7.5, pipe_6: 4.5, quick_3: 3 };
const DEFENDER_BASE: Record<string, [number, number]> = {
  Z5: [1.6, 2.8],
  Z6: [4.5, 5.4],
  Z1: [7.4, 2.8],
  FREE: [5.8, 1.6],
};
const COURT_WIDTH = 9;
const HALF_COURT = 9;

function polygonArea(points: Array<[number, number]>): number {
  let total = 0;
  points.forEach(([x1, y1], index) => {
    const [x2, y2] = points[(index + 1) % points.length] as [number, number];
    total += x1 * y2 - x2 * y1;
  });
  return Math.abs(total) / 2;
}

function insidePolygon(x: number, y: number, polygon: Array<[number, number]>): boolean {
  let inside = false;
  let j = polygon.length - 1;
  polygon.forEach(([xi, yi], i) => {
    const [xj, yj] = polygon[j] as [number, number];
    if (yi > y !== yj > y) {
      const edgeX = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < edgeX) inside = !inside;
    }
    j = i;
  });
  return inside;
}

function shadowHalfWidth(y: number, baseHalf: number, spread: number): number {
  return baseHalf + (spread * y) / HALF_COURT;
}

function ejectFromShadow(x: number, centerX: number, baseHalf: number, spread: number): number {
  const half = shadowHalfWidth(5, baseHalf, spread);
  const left = Math.max(0.4, centerX - half - 0.4);
  const right = Math.min(COURT_WIDTH - 0.4, centerX + half + 0.4);
  if (x < centerX) return left;
  return right;
}

export function computeBlockShadow(input: BlockShadowInput): BlockShadowReport {
  const targetX = ATTACK_TARGET_X[input.attackZone];
  let center: number;
  if (input.blockX === undefined) {
    const shift = input.scheme === "line" ? (targetX < 4.5 ? 0.6 : -0.6) : targetX < 4.5 ? -1.1 : 1.1;
    center = Math.max(0.8, Math.min(COURT_WIDTH - 0.8, targetX + shift));
  } else {
    center = input.blockX;
  }
  const baseHalf = 0.45 * input.blockers;
  const spread = (input.scheme === "line" ? 0.34 : 0.52) * input.blockers;
  const farY = input.attackZone === "quick_3" ? 4.2 : 6.4;
  const farHalf = shadowHalfWidth(farY, baseHalf, spread);
  const polygon: Array<[number, number]> = [
    [Math.max(0, center - baseHalf), input.blockDepth],
    [Math.min(COURT_WIDTH, center + baseHalf), input.blockDepth],
    [Math.min(COURT_WIDTH, center + farHalf), Math.min(HALF_COURT, farY)],
    [Math.max(0, center - farHalf), Math.min(HALF_COURT, farY)],
  ];
  const area = round2(polygonArea(polygon));
  const defenders = Object.entries(DEFENDER_BASE).map(([role, base]): DefenderSpot => {
    let [x, y] = base;
    let moved = 0;
    if (insidePolygon(x, y, polygon)) {
      const newX = ejectFromShadow(x, center, baseHalf, spread);
      if (insidePolygon(newX, y, polygon)) {
        y = Math.min(HALF_COURT - 0.4, farY + 0.6);
      }
      moved = round2(Math.abs(newX - x) * 100);
      x = round2(newX);
    }
    return { role, x, y, movedCm: moved, insideShadow: insidePolygon(x, y, polygon) };
  });
  const coverage = round2((area / (COURT_WIDTH * HALF_COURT)) * 100);
  return {
    attackZone: input.attackZone,
    scheme: input.scheme,
    blockers: input.blockers,
    blockCenterX: round2(center),
    shadowPolygon: polygon.map(([x, y]) => ({ x: round2(x), y: round2(y) })),
    shadowAreaM2: area,
    coveragePct: coverage,
    defenders,
    uncoveredWidthM: round2(Math.max(0, COURT_WIDTH - baseHalf * 2)),
    message: `Sombra de ${input.blockers} bloqueador(es) cubre ${coverage}% del campo propio.`,
  };
}

/* --------------------------------------------------------------- module 14 */

export type SeamFormation = "line3" | "line4";
export type ServeType = "jump_spin" | "jump_float" | "short_drop";

export interface SeamRadarInput {
  formation: SeamFormation;
  rotation: number;
  serveOrigin: "1" | "5" | "6";
  serveType: ServeType;
  landingX: number;
  landingY: number;
  attackerReleaseAngle: number;
}

export interface ReceiverSpot extends ShadowPoint {
  id: string;
  zone: number;
  distanceM: number;
  profileDeg: number;
}

export interface SeamRadarReport {
  formation: SeamFormation;
  serveType: ServeType;
  primaryReceiver: string;
  seamOwner: string;
  seamX: number;
  seamY: number;
  gapCm: number;
  receivers: ReceiverSpot[];
  drill: string;
  priority: "CRITICAL" | "HIGH" | "NORMAL";
  message: string;
}

function seamPositions(formation: SeamFormation): Array<[string, number, number, number]> {
  if (formation === "line3") {
    return [
      ["R5", 5, 1.3, 6.2],
      ["R6", 6, 4.5, 5.7],
      ["R1", 1, 7.3, 6.2],
    ];
  }
  return [
    ["R5", 5, 1.1, 6.4],
    ["R4", 4, 2.9, 4.9],
    ["R6", 6, 4.7, 5.8],
    ["R1", 1, 7.2, 5.9],
  ];
}

function angleAt(a: ShadowPoint, b: ShadowPoint, c: ShadowPoint): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n1 = Math.hypot(v1.x, v1.y);
  const n2 = Math.hypot(v2.x, v2.y);
  if (n1 === 0 || n2 === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (n1 * n2)));
  return round2((Math.acos(cosine) * 180) / Math.PI);
}

function seamDrill(serveType: ServeType, formation: SeamFormation, owner: string): string {
  if (serveType === "short_drop") {
    return `${owner} ataca la pelota corta y R6 cubre la costura central. Drill 3x10 cortas desde ${formation}.`;
  }
  if (serveType === "jump_float") {
    return `${owner} toma la costura con perfil abierto; el vecino libera y llama la pelota. Drill 4x8 flotantes.`;
  }
  return `${owner} cierra la costura con plataforma firme y paso lateral. Drill 4x10 spin a la línea.`;
}

export function computeSeam(input: SeamRadarInput): SeamRadarReport {
  const landing = { x: input.landingX, y: input.landingY };
  const net = { x: 4.5, y: 0 };
  const receivers = seamPositions(input.formation).map(([id, zone, x, y]): ReceiverSpot => ({
    id,
    zone,
    x,
    y,
    distanceM: round2(Math.hypot(x - landing.x, y - landing.y)),
    profileDeg: angleAt(landing, { x, y }, net),
  }));
  const ordered = [...receivers].sort((left, right) => left.distanceM - right.distanceM);
  const primary = ordered[0] as ReceiverSpot;
  const partner = ordered[1] as ReceiverSpot;
  const seamX = round2((primary.x + partner.x) / 2);
  const seamY = round2((primary.y + partner.y) / 2);
  const gapCm = round2(Math.hypot(primary.x - partner.x, primary.y - partner.y) * 100);
  const preferred = 45 + input.attackerReleaseAngle / 4;
  const owner =
    Math.abs(primary.profileDeg - preferred) <= Math.abs(partner.profileDeg - preferred) ? primary : partner;
  const priority = gapCm > 260 ? "CRITICAL" : gapCm > 180 ? "HIGH" : "NORMAL";
  return {
    formation: input.formation,
    serveType: input.serveType,
    primaryReceiver: primary.id,
    seamOwner: owner.id,
    seamX,
    seamY,
    gapCm,
    receivers,
    drill: seamDrill(input.serveType, input.formation, owner.id),
    priority,
    message: `${primary.id} recibe, ${owner.id} cierra la costura de ${gapCm} cm ante ${input.serveType}.`,
  };
}

/* --------------------------------------------------------------- module 15 */

export const SET_TARGETS = ["Z4", "Z3-Quick", "Z2-Back", "Pipe-Z6", "Setter-Dump"] as const;
export type SetTarget = (typeof SET_TARGETS)[number];
export type SetQuality = "#" | "+" | "!" | "-";

export interface SetDistribution {
  rotation: number;
  quality: SetQuality;
  target: SetTarget;
  count: number;
}

export interface TargetShare {
  target: SetTarget;
  count: number;
  sharePct: number;
}

export interface SetterIQReport {
  totalSets: number;
  unpredictability: number;
  hhi: number;
  bias: SetTarget | null;
  biasSharePct: number | null;
  targets: TargetShare[];
  byRotation: Record<string, Record<SetTarget, number>>;
  recommendations: string[];
  message: string;
}

export function computeSetterIQ(distributions: SetDistribution[]): SetterIQReport {
  const total = distributions.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) throw new Error("at least one set is required");
  const counts = Object.fromEntries(SET_TARGETS.map((target) => [target, 0])) as Record<SetTarget, number>;
  const byRotation: Record<string, Record<SetTarget, number>> = {};
  for (let rotation = 1; rotation <= 6; rotation += 1) {
    byRotation[`R${rotation}`] = Object.fromEntries(SET_TARGETS.map((target) => [target, 0])) as Record<SetTarget, number>;
  }
  distributions.forEach((item) => {
    counts[item.target] += item.count;
    const rotation = byRotation[`R${item.rotation}`];
    if (rotation) rotation[item.target] += item.count;
  });
  const shares = Object.fromEntries(
    SET_TARGETS.map((target) => [target, counts[target] / total]),
  ) as Record<SetTarget, number>;
  const hhi = round2(SET_TARGETS.reduce((sum, target) => sum + shares[target] ** 2, 0) * 100);
  const floor = 1 / SET_TARGETS.length;
  const unpredictability = Math.max(0, Math.min(100, round2(((1 - hhi / 100) / (1 - floor)) * 100)));
  const plus = distributions.filter((item) => item.quality === "+");
  const plusTotal = plus.reduce((sum, item) => sum + item.count, 0);
  let bias: SetTarget | null = null;
  let biasSharePct: number | null = null;
  if (plusTotal > 0) {
    const plusCounts = Object.fromEntries(SET_TARGETS.map((target) => [target, 0])) as Record<SetTarget, number>;
    plus.forEach((item) => {
      plusCounts[item.target] += item.count;
    });
    const leader = SET_TARGETS.reduce((best, target) =>
      plusCounts[target] > plusCounts[best] ? target : best,
    );
    const share = round2((plusCounts[leader] / plusTotal) * 100);
    if (share > 65) {
      bias = leader;
      biasSharePct = share;
    }
  }
  const targetRows = SET_TARGETS.map((target) => ({
    target,
    count: counts[target],
    sharePct: round2(shares[target] * 100),
  }));
  const perRotation: Record<string, Record<SetTarget, number>> = {};
  Object.entries(byRotation).forEach(([rotation, row]) => {
    const rotationTotal = SET_TARGETS.reduce((sum, target) => sum + row[target], 0);
    if (rotationTotal === 0) return;
    perRotation[rotation] = Object.fromEntries(
      SET_TARGETS.map((target) => [target, round2((row[target] / rotationTotal) * 100)]),
    ) as Record<SetTarget, number>;
  });
  const recommendations: string[] = [];
  if (unpredictability < 45) recommendations.push("Distribución predecible: entrena Pipe y Setter-Dump con pase '+'.");
  if (bias) recommendations.push(`El rival puede cargar el bloqueo a ${bias}: ${biasSharePct}% de los pases '+' van allí.`);
  if (targetRows.filter((row) => row.count === 0).length >= 2) {
    recommendations.push("Dos salidas sin uso: introduce Quick y Back para abrir el bloqueo.");
  }
  if (recommendations.length === 0) recommendations.push("Distribución sana: mantén la dispersión y revisa por rotación.");
  return {
    totalSets: total,
    unpredictability,
    hhi,
    bias,
    biasSharePct,
    targets: targetRows,
    byRotation: perRotation,
    recommendations,
    message: `Índice de imprevisibilidad ${unpredictability}/100 con ${total} armados.`,
  };
}

/* --------------------------------------------------------------- module 16 */

export const LINEUP_ROLES = ["setter", "outside1", "middle1", "opposite", "outside2", "middle2"] as const;
export type LineupRole = (typeof LINEUP_ROLES)[number];
export type LineupNumbers = Record<LineupRole, number>;

export interface LineupSlipInput extends LineupNumbers {
  rotationStart: number;
  libero: number;
}

export interface LineupSlot {
  roman: string;
  zone: number;
  role: LineupRole;
  number: number;
  row: "front" | "back";
}

export interface LiberoWindow {
  rotation: number;
  zone: number;
  middleNumber: number;
  note: string;
}

export interface LineupSlipReport {
  rotationStart: number;
  lineup: LineupSlot[];
  serviceOrder: number[];
  checks: string[];
  valid: true;
  liberoEntry: LiberoWindow;
  liberoWindows: LiberoWindow[];
  message: string;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const PAIRS: Array<[LineupRole, LineupRole]> = [
  ["setter", "opposite"],
  ["outside1", "outside2"],
  ["middle1", "middle2"],
];

export function buildLineupSlip(input: LineupSlipInput): LineupSlipReport {
  const shirts = [input.setter, input.opposite, input.outside1, input.outside2, input.middle1, input.middle2, input.libero];
  if (new Set(shirts).size !== shirts.length) throw new Error("shirt numbers must be unique, including the libero");
  const base = LINEUP_ROLES.map((role) => input[role]);
  const shift = input.rotationStart - 1;
  const shifted = shift > 0 ? [...base.slice(-shift), ...base.slice(0, 6 - shift)] : base;
  const lineup = shifted.map((number, index): LineupSlot => {
    const zone = index + 1;
    return {
      roman: ROMAN[index] as string,
      zone,
      role: LINEUP_ROLES[index] as LineupRole,
      number,
      row: zone >= 2 && zone <= 4 ? "front" : "back",
    };
  });
  const checks = PAIRS.map(([left, right]) => {
    const gap = Math.abs(shifted.indexOf(input[left]) - shifted.indexOf(input[right]));
    if (gap !== 3) throw new Error(`${left}/${right} must be exactly three service positions apart`);
    return `${left}/${right}: 3 posiciones exactas`;
  });
  const liberoWindows = lineup
    .filter((slot) => (slot.role === "middle1" || slot.role === "middle2") && [1, 5, 6].includes(slot.zone))
    .map((slot): LiberoWindow => ({
      rotation: slot.zone,
      zone: slot.zone,
      middleNumber: slot.number,
      note: `Líbero #${input.libero} entra por central #${slot.number} en Z${slot.zone} antes del saque.`,
    }));
  if (liberoWindows.length === 0) throw new Error("this rotation leaves both middles in the front row; the libero cannot enter");
  return {
    rotationStart: input.rotationStart,
    lineup,
    serviceOrder: lineup.map((slot) => slot.number),
    checks,
    valid: true,
    liberoEntry: liberoWindows[0] as LiberoWindow,
    liberoWindows,
    message: `Boleta I-VI válida para arrancar en R${input.rotationStart}.`,
  };
}

/* --------------------------------------------------------------- module 17 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface SealReport {
  seal: string;
  sha256: string;
  canonical: string;
  message: string;
}

export interface VerifySealReport {
  tampered: boolean;
  expectedSeal: string;
  providedSeal: string;
  changedFields: string[];
  message: string;
}

export const INTEGRITY_SEAL_SECRET = "volleyos-integrity-dev";

export function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] as JsonValue)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

async function sha256(message: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message)));
}

export async function buildSeal(payload: JsonValue): Promise<SealReport> {
  const canonical = canonicalJson(payload);
  const digest = await hmacSha256(canonical, INTEGRITY_SEAL_SECRET);
  return {
    seal: `VOS-SEAL-${digest.slice(0, 32).toUpperCase()}`,
    sha256: await sha256(canonical),
    canonical,
    message: "Sello HMAC-SHA256 emitido sobre JSON canónico ordenado.",
  };
}

function changedFields(original: JsonValue, current: JsonValue, prefix = ""): string[] {
  if (
    original !== null &&
    current !== null &&
    typeof original === "object" &&
    typeof current === "object" &&
    !Array.isArray(original) &&
    !Array.isArray(current)
  ) {
    const keys = new Set([...Object.keys(original), ...Object.keys(current)]);
    return Array.from(keys)
      .sort()
      .flatMap((key) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (!(key in original) || !(key in current)) return [path];
        return changedFields(original[key] as JsonValue, current[key] as JsonValue, path);
      });
  }
  return JSON.stringify(original) === JSON.stringify(current) ? [] : [prefix || "payload"];
}

export async function verifySeal(
  payload: JsonValue,
  seal: string,
  original?: JsonValue,
): Promise<VerifySealReport> {
  const report = await buildSeal(payload);
  const provided = seal.trim().toUpperCase();
  const tampered = report.seal !== provided;
  const changed = original === undefined ? [] : changedFields(original, payload);
  return {
    tampered,
    expectedSeal: report.seal,
    providedSeal: provided,
    changedFields: tampered && changed.length === 0 ? ["payload"] : changed,
    message: tampered ? "Acta alterada: el sello no coincide." : "Sello válido: el acta conserva su integridad.",
  };
}

/* --------------------------------------------------------------- module 18 */

export const CAPSULE_VERSION = 2;
export const CAPSULE_KEYS = ["format", "version", "created_at", "title", "checksum", "data"] as const;

export interface CapsuleReport {
  action: "export" | "import";
  filename: string;
  capsule: string;
  checksum: string;
  bytes: number;
  title: string;
  data: JsonValue;
  message: string;
}

function capsuleFilename(title: string): string {
  const slug = title.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `${slug || "volleyos"}.volleyos`;
}

export async function exportCapsule(title: string, data: JsonValue): Promise<CapsuleReport> {
  const checksum = await sha256(canonicalJson(data));
  const envelope: JsonValue = {
    format: "volleyos.capsule",
    version: CAPSULE_VERSION,
    created_at: new Date().toISOString(),
    title,
    checksum,
    data,
  };
  const capsule = canonicalJson(envelope);
  return {
    action: "export",
    filename: capsuleFilename(title),
    capsule,
    checksum,
    bytes: new TextEncoder().encode(capsule).length,
    title,
    data,
    message: "Cápsula .volleyos sellada con SHA-256. Compártela offline.",
  };
}

export async function importCapsule(text: string): Promise<CapsuleReport> {
  let envelope: JsonValue;
  try {
    envelope = JSON.parse(text) as JsonValue;
  } catch {
    throw new Error("capsule is not valid JSON");
  }
  if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new Error("capsule must be a JSON object");
  }
  const keys = Object.keys(envelope).sort().join(",");
  if (keys !== [...CAPSULE_KEYS].sort().join(",")) throw new Error("capsule envelope has missing or unknown fields");
  if (envelope.format !== "volleyos.capsule") throw new Error("unsupported capsule format");
  if (envelope.version !== CAPSULE_VERSION) throw new Error("unsupported capsule version");
  const data = envelope.data;
  if (data === undefined || data === null || typeof data !== "object") throw new Error("capsule data must be an object");
  const checksum = await sha256(canonicalJson(data));
  if (checksum !== envelope.checksum) throw new Error("capsule checksum mismatch: file was modified");
  const title = typeof envelope.title === "string" ? envelope.title : "VolleyOS Capsule";
  return {
    action: "import",
    filename: capsuleFilename(title),
    capsule: text,
    checksum,
    bytes: new TextEncoder().encode(text).length,
    title,
    data,
    message: "Cápsula importada y verificada: checksum SHA-256 válido.",
  };
}

/* --------------------------------------------------------------- module 19 */

export type CardKind =
  | "WARNING_YELLOW"
  | "PENALTY_RED"
  | "EXPULSION_JOINT"
  | "DISQUALIFICATION_SEPARATE"
  | "DELAY_WARNING"
  | "DELAY_PENALTY";

export interface RefereeEvent {
  team: Side;
  player?: number;
  kind: CardKind;
}

export interface RefereeInput {
  events: RefereeEvent[];
  scoreA?: number;
  scoreB?: number;
  serving?: Side;
}

export interface RefereeSanction {
  index: number;
  team: Side;
  player: number | null;
  requested: CardKind;
  applied: CardKind;
  escalated: boolean;
  scoreA: number;
  scoreB: number;
  serving: Side;
  playerOutSet: boolean;
  playerOutMatch: boolean;
  text: string;
}

export interface RefereeReport {
  sanctions: RefereeSanction[];
  scoreA: number;
  scoreB: number;
  serving: Side;
  warnings: number;
  penalties: number;
  expulsions: number;
  disqualifications: number;
  delayWarnings: number;
  delayPenalties: number;
  serveSeconds: number;
  timeoutSeconds: number;
  message: string;
}

const CARD_TEXT: Record<CardKind, string> = {
  WARNING_YELLOW: "Amonestacion: sin consecuencia en el marcador (FIVB 21.1).",
  PENALTY_RED: "Castigo: punto y saque al rival (FIVB 21.2).",
  EXPULSION_JOINT: "Expulsion: sale por el resto del set (FIVB 21.3).",
  DISQUALIFICATION_SEPARATE: "Descalificacion: sale por todo el partido (FIVB 21.4).",
  DELAY_WARNING: "Primera demora del equipo: advertencia (FIVB 21.5).",
  DELAY_PENALTY: "Demora repetida: punto y saque al rival (FIVB 21.6).",
};

export function refereeReport(input: RefereeInput): RefereeReport {
  const score = { A: input.scoreA ?? 0, B: input.scoreB ?? 0 };
  let serving: Side = input.serving ?? "A";
  const warned = new Set<string>();
  const delays = { A: 0, B: 0 };
  const sanctions: RefereeSanction[] = [];
  let warnings = 0;
  let penalties = 0;
  let expulsions = 0;
  let disqualifications = 0;
  let delayWarnings = 0;
  let delayPenalties = 0;

  input.events.forEach((event, index) => {
    if (event.kind !== "DELAY_WARNING" && event.kind !== "DELAY_PENALTY" && event.player === undefined) {
      throw new Error("individual conduct cards require a player number");
    }
    let applied = event.kind;
    let escalated = false;
    if (event.kind === "WARNING_YELLOW" && event.player !== undefined) {
      const key = `${event.team}:${event.player}`;
      if (warned.has(key)) {
        applied = "PENALTY_RED";
        escalated = true;
      } else {
        warned.add(key);
      }
    }
    if (event.kind === "DELAY_WARNING" || event.kind === "DELAY_PENALTY") {
      delays[event.team] += 1;
      if (delays[event.team] > 1) {
        applied = "DELAY_PENALTY";
        escalated = event.kind === "DELAY_WARNING";
      }
    }
    if (applied === "PENALTY_RED" || applied === "DELAY_PENALTY") {
      const rival: Side = event.team === "A" ? "B" : "A";
      score[rival] += 1;
      serving = rival;
    }
    if (applied === "WARNING_YELLOW") warnings += 1;
    if (applied === "PENALTY_RED") penalties += 1;
    if (applied === "EXPULSION_JOINT") expulsions += 1;
    if (applied === "DISQUALIFICATION_SEPARATE") disqualifications += 1;
    if (applied === "DELAY_WARNING") delayWarnings += 1;
    if (applied === "DELAY_PENALTY") delayPenalties += 1;
    sanctions.push({
      index: index + 1,
      team: event.team,
      player: event.player ?? null,
      requested: event.kind,
      applied,
      escalated,
      scoreA: score.A,
      scoreB: score.B,
      serving,
      playerOutSet: applied === "EXPULSION_JOINT" || applied === "DISQUALIFICATION_SEPARATE",
      playerOutMatch: applied === "DISQUALIFICATION_SEPARATE",
      text: CARD_TEXT[applied],
    });
  });

  return {
    sanctions,
    scoreA: score.A,
    scoreB: score.B,
    serving,
    warnings,
    penalties,
    expulsions,
    disqualifications,
    delayWarnings,
    delayPenalties,
    serveSeconds: 8,
    timeoutSeconds: 30,
    message: `${sanctions.length} sanciones. Marcador ${score.A}-${score.B}, saque ${serving}.`,
  };
}

/* --------------------------------------------------------------- module 20 */

export interface SubEvent {
  team: Side;
  outNumber: number;
  inNumber: number;
  position: number;
  exceptional?: boolean;
}

export interface SubResult {
  index: number;
  team: Side;
  position: number;
  outNumber: number;
  inNumber: number;
  status: "LEGAL" | "ILLEGAL_SUBSTITUTION";
  reason: string;
  remainingSubs: number;
  exceptional: boolean;
}

export interface SubPair {
  team: Side;
  position: number;
  starter: number;
  substitute: number;
  status: "open" | "closed";
}

export interface SubReport {
  events: SubResult[];
  pairs: SubPair[];
  remainingSubs: Record<Side, number>;
  message: string;
}

interface TeamSubState {
  subs: number;
  pairs: Map<number, SubPair>;
  substitutes: Set<number>;
  reentered: Set<number>;
}

function emptySubState(): TeamSubState {
  return { subs: 0, pairs: new Map(), substitutes: new Set(), reentered: new Set() };
}

export function trackSubstitutions(events: SubEvent[]): SubReport {
  const teams: Record<Side, TeamSubState> = { A: emptySubState(), B: emptySubState() };
  const results: SubResult[] = [];

  events.forEach((event, index) => {
    const team = teams[event.team];
    let status: SubResult["status"] = "LEGAL";
    let reason = "substitution registered";
    const pair = team.pairs.get(event.position);
    if (event.outNumber === event.inNumber) {
      status = "ILLEGAL_SUBSTITUTION";
      reason = "a player cannot substitute themself";
    } else if (event.exceptional) {
      if (team.substitutes.has(event.inNumber)) {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "substitute cannot re-enter the same set";
      } else if (pair?.status === "closed") {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "pair is already closed for this position";
      } else {
        team.pairs.set(event.position, {
          team: event.team,
          position: event.position,
          starter: pair?.starter ?? event.outNumber,
          substitute: event.inNumber,
          status: "closed",
        });
        team.substitutes.add(event.inNumber);
        reason = "exceptional injury substitution does not consume the limit";
      }
    } else if (team.subs >= 6) {
      status = "ILLEGAL_SUBSTITUTION";
      reason = "team already used its six substitutions this set";
    } else if (pair) {
      if (pair.status === "closed") {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "pair is closed; substitute cannot re-enter the same set";
      } else if (event.outNumber === pair.substitute && event.inNumber === pair.starter) {
        pair.status = "closed";
        team.reentered.add(pair.starter);
        team.subs += 1;
        reason = "starter re-enters once for the same substitute";
      } else {
        status = "ILLEGAL_SUBSTITUTION";
        reason = `position ${event.position} is bound to #${pair.starter}/#${pair.substitute}`;
      }
    } else {
      const existing = [...team.pairs.values()].find((item) => item.substitute === event.outNumber);
      if (existing || team.substitutes.has(event.outNumber)) {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "pair is bound to another position; substitute cannot re-enter";
      } else if (team.substitutes.has(event.inNumber)) {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "substitute cannot re-enter the same set";
      } else if (team.reentered.has(event.outNumber)) {
        status = "ILLEGAL_SUBSTITUTION";
        reason = "starter already used their one re-entry this set";
      } else {
        team.pairs.set(event.position, {
          team: event.team,
          position: event.position,
          starter: event.outNumber,
          substitute: event.inNumber,
          status: "open",
        });
        team.substitutes.add(event.inNumber);
        team.subs += 1;
        reason = "substitution inside the FIVB limit";
      }
    }
    results.push({
      index: index + 1,
      team: event.team,
      position: event.position,
      outNumber: event.outNumber,
      inNumber: event.inNumber,
      status,
      reason,
      remainingSubs: 6 - team.subs,
      exceptional: event.exceptional ?? false,
    });
  });

  return {
    events: results,
    pairs: [...teams.A.pairs.values(), ...teams.B.pairs.values()],
    remainingSubs: { A: 6 - teams.A.subs, B: 6 - teams.B.subs },
    message: `${results.length} cambios procesados. Quedan ${6 - teams.A.subs} A y ${6 - teams.B.subs} B.`,
  };
}

/* --------------------------------------------------------------- module 21 */

export interface SplitAttendee {
  name: string;
  deposit?: number;
  discountPct?: number;
}

export interface SplitInput {
  mode: "pickup" | "tournament";
  courtCost?: number;
  extrasCost?: number;
  thirdHalfCost?: number;
  attendees?: SplitAttendee[];
  paymentAlias?: string;
  paymentHolder?: string;
  currency?: string;
  teams?: number;
  teamFee?: number;
  refereeCost?: number;
  prizesCost?: number;
}

export interface SplitRow {
  name: string;
  weight: number;
  discountPct: number;
  shareCents: number;
  depositCents: number;
  balanceCents: number;
  share: string;
  deposit: string;
  balance: string;
  status: "pay" | "refund" | "settled";
}

export interface SplitTransfer {
  payer: string;
  payee: string;
  amount: string;
  concept: string;
}

export interface PickupSplit {
  totalCents: number;
  total: string;
  rows: SplitRow[];
  transfers: SplitTransfer[];
  whatsapp: string;
  currency: string;
}

export interface TournamentSplit {
  teams: number;
  revenueCents: number;
  costsCents: number;
  profitCents: number;
  revenue: string;
  costs: string;
  profit: string;
  marginPct: number;
  breakEvenTeams: number;
  currency: string;
}

export interface SplitReport {
  mode: "pickup" | "tournament";
  pickup: PickupSplit | null;
  tournament: TournamentSplit | null;
  message: string;
}

const cents = (value: number): number => Math.round(value * 100);
const money = (value: number): string => (value / 100).toFixed(2);

function pickupSplit(input: SplitInput): PickupSplit {
  const attendees = input.attendees ?? [];
  if (attendees.length === 0) throw new Error("at least one attendee is required");
  const currency = input.currency ?? "ARS";
  const totalCents = cents(input.courtCost ?? 0) + cents(input.extrasCost ?? 0) + cents(input.thirdHalfCost ?? 0);
  const weights = attendees.map((attendee) => 100 - (attendee.discountPct ?? 0));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) throw new Error("discounts leave no payable share");
  const shares = weights.map((weight) => Math.round((totalCents * weight) / weightSum));
  shares[0] = (shares[0] as number) + (totalCents - shares.reduce((sum, share) => sum + share, 0));
  const holder = input.paymentHolder ?? "Tesoreria";
  const rows: SplitRow[] = [];
  const transfers: SplitTransfer[] = [];
  attendees.forEach((attendee, index) => {
    const shareCents = shares[index] as number;
    const depositCents = cents(attendee.deposit ?? 0);
    const balanceCents = shareCents - depositCents;
    if (balanceCents > 0) {
      transfers.push({
        payer: attendee.name,
        payee: holder,
        amount: money(balanceCents),
        concept: "cuota de cancha",
      });
    } else if (balanceCents < 0) {
      transfers.push({
        payer: holder,
        payee: attendee.name,
        amount: money(-balanceCents),
        concept: "devolucion de sena",
      });
    }
    rows.push({
      name: attendee.name,
      weight: (weights[index] as number) / 100,
      discountPct: attendee.discountPct ?? 0,
      shareCents,
      depositCents,
      balanceCents,
      share: money(shareCents),
      deposit: money(depositCents),
      balance: money(balanceCents),
      status: balanceCents > 0 ? "pay" : balanceCents < 0 ? "refund" : "settled",
    });
  });
  const lines = [
    "🏐 *La Vaquita - VolleyOS*",
    `Cancha + luz + tercer tiempo: *${currency} ${money(totalCents)}*`,
    `Entre ${rows.length} personas.`,
    "",
    "💸 *Pagar por transferencia*",
    ...transfers.map(
      (transfer) =>
        `• ${transfer.payer} -> ${transfer.payee}: ${currency} ${transfer.amount} (${transfer.concept})`,
    ),
  ];
  if (input.paymentAlias) {
    lines.push("", `🏦 Alias/CVU: *${input.paymentAlias}*`, `Titular: ${holder}`);
  }
  lines.push("", "Sello VolleyOS: cuentas exactas al centavo, sin telemetria.");
  return {
    totalCents,
    total: money(totalCents),
    rows,
    transfers,
    whatsapp: lines.join("\n"),
    currency,
  };
}

function tournamentSplit(input: SplitInput): TournamentSplit {
  const teams = input.teams ?? 0;
  const fee = cents(input.teamFee ?? 0);
  if (teams <= 0 || fee <= 0) throw new Error("teams and teamFee must be greater than zero");
  const revenueCents = teams * fee;
  const costsCents = cents(input.courtCost ?? 0) + cents(input.refereeCost ?? 0) + cents(input.prizesCost ?? 0);
  const profitCents = revenueCents - costsCents;
  return {
    teams,
    revenueCents,
    costsCents,
    profitCents,
    revenue: money(revenueCents),
    costs: money(costsCents),
    profit: money(profitCents),
    marginPct: Math.round((profitCents / revenueCents) * 10000) / 100,
    breakEvenTeams: Math.ceil(costsCents / fee),
    currency: input.currency ?? "ARS",
  };
}

export function splitCosts(input: SplitInput): SplitReport {
  if (input.mode === "pickup") {
    const pickup = pickupSplit(input);
    return {
      mode: "pickup",
      pickup,
      tournament: null,
      message: `Vaquita de ${pickup.currency} ${pickup.total} repartida al centavo.`,
    };
  }
  const tournament = tournamentSplit(input);
  return {
    mode: "tournament",
    pickup: null,
    tournament,
    message: `Torneo con ${tournament.profit} de resultado y break-even en ${tournament.breakEvenTeams} equipos.`,
  };
}

/* --------------------------------------------------------------- module 22 */

export type RefereeGesture =
  | "two_fingers_up"
  | "forearm_touch"
  | "crossed_arms"
  | "four_fingers"
  | "hands_twirling"
  | "touch_top_net"
  | "point_court_line"
  | "thumbs_up_out";

export interface GestureInfo {
  gesture: RefereeGesture;
  call: Record<Locale, string>;
  why: Record<Locale, string>;
  example: Record<Locale, string>;
  rule: string;
}

export const REFEREE_GESTURES: Record<RefereeGesture, GestureInfo> = {
  two_fingers_up: {
    gesture: "two_fingers_up",
    call: { es: "Doble contacto", en: "Double contact", pt: "Dois toques" },
    why: {
      es: "El mismo jugador toco la pelota dos veces seguidas.",
      en: "The same player touched the ball twice in a row.",
      pt: "O mesmo jogador tocou a bola duas vezes seguidas.",
    },
    example: {
      es: "El armador corrige su pase y vuelve a tocarla.",
      en: "The setter fixes the pass and touches it again.",
      pt: "O levantador corrige o passe e toca de novo.",
    },
    rule: "FIVB 9.3.3",
  },
  forearm_touch: {
    gesture: "forearm_touch",
    call: { es: "Balon tocado", en: "Ball touched", pt: "Bola tocada" },
    why: {
      es: "El balon rozo el brazo y salio fuera.",
      en: "The ball brushed an arm and went out.",
      pt: "A bola raspou o braco e saiu.",
    },
    example: {
      es: "El bloqueo desvia la pelota.",
      en: "The block deflects the ball.",
      pt: "O bloqueio desvia a bola.",
    },
    rule: "FIVB 9.1",
  },
  crossed_arms: {
    gesture: "crossed_arms",
    call: { es: "Fin de set", en: "End of set", pt: "Fim do set" },
    why: {
      es: "El set llego a 25 con dos de diferencia o 15 en el tie-break.",
      en: "The set reached 25 with a two-point lead or 15 in the tie-break.",
      pt: "O set chegou a 25 com dois de vantagem ou 15 no tie-break.",
    },
    example: {
      es: "25-23 y se cambia de lado.",
      en: "25-23 and teams switch sides.",
      pt: "25-23 e as equipes trocam de lado.",
    },
    rule: "FIVB 6.2",
  },
  four_fingers: {
    gesture: "four_fingers",
    call: { es: "Cuatro toques", en: "Four touches", pt: "Quatro toques" },
    why: {
      es: "El equipo toco la pelota cuatro veces.",
      en: "The team touched the ball four times.",
      pt: "A equipe tocou a bola quatro vezes.",
    },
    example: {
      es: "Recepcion, armado, ataque y bloqueo propio.",
      en: "Pass, set, attack and an own block.",
      pt: "Passe, levantamento, ataque e bloqueio proprio.",
    },
    rule: "FIVB 9.3.1",
  },
  hands_twirling: {
    gesture: "hands_twirling",
    call: { es: "Cambio de cancha", en: "Change of courts", pt: "Troca de quadra" },
    why: {
      es: "Los equipos cambian de lado antes del siguiente set.",
      en: "Teams switch sides before the next set.",
      pt: "As equipes trocam de lado antes do proximo set.",
    },
    example: {
      es: "El arbitro gira los antebrazos.",
      en: "The referee rotates their forearms.",
      pt: "O arbitro gira os antebracos.",
    },
    rule: "FIVB 18.2",
  },
  touch_top_net: {
    gesture: "touch_top_net",
    call: { es: "Toque de red", en: "Net touch", pt: "Toque na rede" },
    why: {
      es: "Un jugador toco la banda superior o la antena.",
      en: "A player touched the top band or antenna.",
      pt: "Um jogador tocou a faixa superior ou a antena.",
    },
    example: {
      es: "El bloqueador roza la malla.",
      en: "The blocker brushes the net.",
      pt: "O bloqueador roca a rede.",
    },
    rule: "FIVB 11.3.1",
  },
  point_court_line: {
    gesture: "point_court_line",
    call: { es: "Balon dentro", en: "Ball in", pt: "Bola dentro" },
    why: {
      es: "La pelota toco el piso dentro de las lineas.",
      en: "The ball touched the floor inside the lines.",
      pt: "A bola tocou o piso dentro das linhas.",
    },
    example: {
      es: "El juez senala la linea.",
      en: "The referee points at the line.",
      pt: "O arbitro aponta para a linha.",
    },
    rule: "FIVB 8.4.1",
  },
  thumbs_up_out: {
    gesture: "thumbs_up_out",
    call: { es: "Balon fuera", en: "Ball out", pt: "Bola fora" },
    why: {
      es: "La pelota cayo fuera o toco la antena.",
      en: "The ball landed out or hit the antenna.",
      pt: "A bola caiu fora ou tocou a antena.",
    },
    example: {
      es: "El remate pasa fuera de la antena.",
      en: "The spike passes outside the antenna.",
      pt: "O ataque passa fora da antena.",
    },
    rule: "FIVB 8.4.3",
  },
};

export interface FanQuestion {
  id: number;
  question: Record<Locale, string>;
  options: Record<Locale, string[]>;
  correct: number;
  explanation: Record<Locale, string>;
  rule: string;
}

export const FAN_QUESTIONS: FanQuestion[] = [
  {
    id: 1,
    question: {
      es: "¿Se puede salvar la pelota con el pie?",
      en: "Can a player save the ball with a foot?",
      pt: "Pode-se salvar a bola com o pe?",
    },
    options: {
      es: ["Si, cualquier parte del cuerpo", "No, solo manos", "Solo el libero"],
      en: ["Yes, any part of the body", "No, hands only", "Libero only"],
      pt: ["Sim, qualquer parte do corpo", "Nao, so as maos", "So o libero"],
    },
    correct: 0,
    explanation: {
      es: "Cualquier parte del cuerpo puede tocar la pelota en defensa.",
      en: "Any part of the body may contact the ball in defence.",
      pt: "Qualquer parte do corpo pode tocar a bola na defesa.",
    },
    rule: "FIVB 9.2",
  },
  {
    id: 2,
    question: {
      es: "¿Que pasa si la pelota toca la antena?",
      en: "What happens if the ball touches the antenna?",
      pt: "O que acontece se a bola tocar a antena?",
    },
    options: {
      es: ["Sigue el juego", "Es fuera", "Es punto del bloqueo"],
      en: ["Play continues", "It is out", "Point for the block"],
      pt: ["O jogo continua", "E fora", "Ponto do bloqueio"],
    },
    correct: 1,
    explanation: {
      es: "La antena es parte de la red y el balon queda fuera.",
      en: "The antenna is part of the net and the ball is out.",
      pt: "A antena faz parte da rede e a bola esta fora.",
    },
    rule: "FIVB 8.4.3",
  },
  {
    id: 3,
    question: {
      es: "¿El libero puede sacar?",
      en: "Can the libero serve?",
      pt: "O libero pode sacar?",
    },
    options: {
      es: ["Si, siempre", "No, no puede sacar", "Solo en el tie-break"],
      en: ["Yes, always", "No, the libero cannot serve", "Only in the tie-break"],
      pt: ["Sim, sempre", "Nao, o libero nao pode sacar", "So no tie-break"],
    },
    correct: 1,
    explanation: {
      es: "El libero no puede sacar ni completar un ataque.",
      en: "The libero cannot serve or complete an attack.",
      pt: "O libero nao pode sacar nem completar um ataque.",
    },
    rule: "FIVB 19.3.1",
  },
  {
    id: 4,
    question: {
      es: "¿Un set termina 25-24?",
      en: "Does a set end at 25-24?",
      pt: "Um set termina em 25-24?",
    },
    options: {
      es: ["Si", "No, hacen falta dos de diferencia", "Depende del saque"],
      en: ["Yes", "No, a two-point lead is required", "Depends on serve"],
      pt: ["Sim", "Nao, sao necessarios dois de vantagem", "Depende do saque"],
    },
    correct: 1,
    explanation: {
      es: "El set sigue hasta que un equipo saca dos puntos.",
      en: "The set continues until a team leads by two.",
      pt: "O set continua ate uma equipe abrir dois pontos.",
    },
    rule: "FIVB 6.2",
  },
  {
    id: 5,
    question: {
      es: "¿Cuanto dura el tiempo tecnico indoor?",
      en: "How long is an indoor technical timeout?",
      pt: "Quanto dura o tempo tecnico indoor?",
    },
    options: {
      es: ["30 segundos", "60 segundos", "90 segundos"],
      en: ["30 seconds", "60 seconds", "90 seconds"],
      pt: ["30 segundos", "60 segundos", "90 segundos"],
    },
    correct: 1,
    explanation: {
      es: "El tiempo tecnico FIVB dura 60 segundos.",
      en: "The FIVB technical timeout lasts 60 seconds.",
      pt: "O tempo tecnico da FIVB dura 60 segundos.",
    },
    rule: "FIVB 15.4",
  },
];

export interface FanAnswer {
  id: number;
  answer: number;
  correct: number;
  isCorrect: boolean;
  explanation: Record<Locale, string>;
  rule: string;
}

export interface FanReport {
  decision: GestureInfo | null;
  trivia: {
    questions: FanQuestion[];
    answers: FanAnswer[];
    score: number;
    total: number;
    rank: string;
    message: string;
  } | null;
  message: string;
}

export function fanReport(input: {
  action: "decode" | "trivia";
  gesture?: RefereeGesture;
  answers?: number[];
}): FanReport {
  if (input.action === "decode") {
    if (!input.gesture) throw new Error("gesture is required");
    const decision = REFEREE_GESTURES[input.gesture];
    return {
      decision,
      trivia: null,
      message: `El juez cobro ${decision.call.es} (${decision.rule}).`,
    };
  }
  const answers = input.answers ?? [];
  if (answers.length > FAN_QUESTIONS.length) throw new Error("too many trivia answers");
  const results = answers.map((answer, index): FanAnswer => {
    const question = FAN_QUESTIONS[index] as FanQuestion;
    if (answer < 0 || answer >= (question.options.es as string[]).length) {
      throw new Error("trivia answer is out of range");
    }
    return {
      id: question.id,
      answer,
      correct: question.correct,
      isCorrect: answer === question.correct,
      explanation: question.explanation,
      rule: question.rule,
    };
  });
  const score = results.filter((answer) => answer.isCorrect).length;
  const total = FAN_QUESTIONS.length;
  const rank =
    results.length === 0
      ? "TRIBUNA_NOVATA"
      : score === total
        ? "ORACULO_DE_TRIBUNA"
        : score * 10 >= total * 7
          ? "TRIBUNERO_AVANZADO"
          : score * 5 >= total * 2
            ? "TRIBUNERO"
            : "TRIBUNA_NOVATA";
  const message = `Trivia de tribuna: ${score}/${results.length || total} - ${rank}.`;
  return {
    decision: null,
    trivia: {
      questions: FAN_QUESTIONS,
      answers: results,
      score,
      total,
      rank,
      message,
    },
    message,
  };
}

/* --------------------------------------------------------------- module 23 */

export type SetterGesture =
  | "index_finger"
  | "two_fingers"
  | "three_fingers"
  | "fist"
  | "open_hand"
  | "pinky"
  | "thumb_up";
export type SetterPlay = "A" | "B/Shoot" | "C/7" | "D/Atras" | "Pipe" | "Doble (Cruce)";

export const SETTER_GESTURES: SetterGesture[] = [
  "index_finger",
  "two_fingers",
  "three_fingers",
  "fist",
  "open_hand",
  "pinky",
  "thumb_up",
];

export interface SignalAssignment {
  gesture: SetterGesture;
  play: SetterPlay;
}

export interface SignalSheetReport {
  valid: boolean;
  assignments: Array<{ gesture: SetterGesture; play: SetterPlay; icon: string }>;
  collisions: Array<{ gesture: string; plays: string[] }>;
  duplicatePlays: string[];
  missingGestures: string[];
  sheet: string;
  message: string;
}

const SIGNAL_ICONS: Record<SetterGesture, string> = {
  index_finger: "1",
  two_fingers: "2",
  three_fingers: "3",
  fist: "P",
  open_hand: "5",
  pinky: "Q",
  thumb_up: "+",
};

export function buildSignalSheet(input: {
  team?: string;
  setterName?: string;
  assignments: SignalAssignment[];
}): SignalSheetReport {
  if (input.assignments.length === 0) throw new Error("at least one signal is required");
  const grouped = new Map<SetterGesture, SetterPlay[]>();
  const counts = new Map<SetterPlay, number>();
  for (const assignment of input.assignments) {
    grouped.set(assignment.gesture, [...(grouped.get(assignment.gesture) ?? []), assignment.play]);
    counts.set(assignment.play, (counts.get(assignment.play) ?? 0) + 1);
  }
  const collisions = [...grouped.entries()]
    .filter(([, plays]) => plays.length > 1)
    .map(([gesture, plays]) => ({ gesture, plays }));
  const duplicatePlays = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([play]) => play)
    .sort();
  const ordered = [...input.assignments].sort(
    (left, right) => SETTER_GESTURES.indexOf(left.gesture) - SETTER_GESTURES.indexOf(right.gesture),
  );
  const lines = [
    `# Senas del armador - ${input.team ?? "Mi equipo"}`,
    `Armador: ${input.setterName || "sin nombre"}`,
    "",
    "| Sena | Jugada |",
    "| --- | --- |",
    ...ordered.map((assignment) => `| ${SIGNAL_ICONS[assignment.gesture]} ${assignment.gesture} | ${assignment.play} |`),
  ];
  const valid = collisions.length === 0 && duplicatePlays.length === 0;
  return {
    valid,
    assignments: ordered.map((assignment) => ({
      ...assignment,
      icon: SIGNAL_ICONS[assignment.gesture],
    })),
    collisions,
    duplicatePlays,
    missingGestures: SETTER_GESTURES.filter((gesture) => !grouped.has(gesture)),
    sheet: lines.join("\n"),
    message: valid
      ? "Hoja de senas valida y sin colisiones."
      : `${collisions.length} colisiones y ${duplicatePlays.length} jugadas duplicadas.`,
  };
}

/* --------------------------------------------------------------- module 24 */

export interface MvpPlayer {
  name: string;
  team?: string;
  points?: number;
  blocks?: number;
  aces?: number;
  digs?: number;
  assists?: number;
  errors?: number;
  pressurePoints?: number;
  votes?: number;
  isLibero?: boolean;
}

export interface MvpAward {
  key: "MVP" | "WALL" | "LOCK" | "SNIPER" | "BUILDER" | "ICE";
  label: string;
  emoji: string;
  winner: string;
  team: string;
  metric: string;
  value: string;
  message: string;
}

export interface MvpReport {
  match: string;
  awards: MvpAward[];
  mvpScore: string;
  card: string;
  shareText: string;
  seal: string;
  sha256: string;
  message: string;
}

function mvpScore(player: MvpPlayer): number {
  return (
    (player.points ?? 0) +
    (player.blocks ?? 0) * 1.5 +
    (player.aces ?? 0) * 1.3 +
    (player.digs ?? 0) * 0.6 +
    (player.assists ?? 0) * 0.5 +
    (player.votes ?? 0) * 2 +
    (player.pressurePoints ?? 0) * 1.2 -
    (player.errors ?? 0) * 0.5
  );
}

function mvpMetric(player: MvpPlayer, metric: string): number {
  if (metric === "score") return mvpScore(player);
  if (metric === "blocks") return (player.blocks ?? 0) + (player.isLibero ? 0.1 : 0);
  if (metric === "digs") return (player.digs ?? 0) + (player.isLibero ? 2 : 0);
  if (metric === "aces") return player.aces ?? 0;
  if (metric === "assists") return player.assists ?? 0;
  return player.pressurePoints ?? 0;
}

const MVP_AWARDS: Array<Omit<MvpAward, "winner" | "team" | "value" | "message">> = [
  { key: "MVP", label: "MVP Global", emoji: "🏆", metric: "score" },
  { key: "WALL", label: "El Muro", emoji: "🧱", metric: "blocks" },
  { key: "LOCK", label: "El Candado", emoji: "🛡️", metric: "digs" },
  { key: "SNIPER", label: "Francotirador", emoji: "🎯", metric: "aces" },
  { key: "BUILDER", label: "El Albanil", emoji: "👷", metric: "assists" },
  { key: "ICE", label: "Sangre Fria 24-24", emoji: "🧊", metric: "pressurePoints" },
];

export async function awardMvp(input: { match?: string; players: MvpPlayer[] }): Promise<MvpReport> {
  if (input.players.length === 0) throw new Error("at least one player is required");
  const match = input.match ?? "Partido VolleyOS";
  const awards = MVP_AWARDS.map((award): MvpAward => {
    const winner = [...input.players].sort((left, right) => {
      const delta = mvpMetric(right, award.metric) - mvpMetric(left, award.metric);
      return delta !== 0 ? delta : left.name.localeCompare(right.name);
    })[0] as MvpPlayer;
    return {
      ...award,
      winner: winner.name,
      team: winner.team ?? "Equipo",
      value: mvpMetric(winner, award.metric).toFixed(2),
      message: `${award.label}: ${winner.name} (${winner.team ?? "Equipo"}).`,
    };
  });
  const card = [
    `🏐 ${match}`,
    "",
    ...awards.map((award) => `${award.emoji} ${award.label}: ${award.winner} (${award.team})`),
  ].join("\n");
  const seal = await buildSeal({
    match,
    awards: awards.map((award) => ({
      key: award.key,
      winner: award.winner,
      team: award.team,
      value: award.value,
    })),
  });
  return {
    match,
    awards,
    mvpScore: (awards[0] as MvpAward).value,
    card,
    shareText: `${card}\n\n${seal.seal}`,
    seal: seal.seal,
    sha256: seal.sha256,
    message: `Tarjeta de premios sellada. MVP: ${(awards[0] as MvpAward).winner}.`,
  };
}

/* ------------------------------------------------- scoreboard undo / redo */

export const SCOREBOARD_HISTORY_LIMIT = 50;

export interface ScoreboardHistory {
  past: ScoreboardState[];
  present: ScoreboardState;
  future: ScoreboardState[];
}

const TEAMS_STORAGE_KEY = "volleyos.teams";

export function loadTeams(): TeamRoster[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TEAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamRoster[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTeam(team: TeamRoster): TeamRoster[] {
  if (typeof window === "undefined") return [];
  const teams = loadTeams();
  const idx = teams.findIndex((t) => t.id === team.id);
  if (idx >= 0) teams[idx] = team;
  else teams.push(team);
  try {
    window.localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {}
  return teams;
}

export function deleteTeam(id: string): TeamRoster[] {
  if (typeof window === "undefined") return [];
  const teams = loadTeams().filter((t) => t.id !== id);
  try {
    window.localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {}
  return teams;
}

export function newTeam(name: string, code: string, color = "#e11d48"): TeamRoster {
  return {
    id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    code: code.slice(0, 3).toUpperCase(),
    color,
    players: [],
    starters: [],
    libero: null,
    bench: [],
  };
}

const ROSTER_ROLES = new Set<RosterPlayer["role"]>(["S", "OH", "MB", "OPP", "L"]);

export function parseRosterSheet(text: string): RosterPlayer[] {
  const players: RosterPlayer[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const tokens = line.split(/\s+/);
    const number = Number(tokens[0]);
    const role = tokens[2]?.toUpperCase() as RosterPlayer["role"] | undefined;
    if (!Number.isInteger(number) || number < 1 || number > 99) throw new Error(`Dorsal invalido: ${line}`);
    if (!role || !ROSTER_ROLES.has(role)) throw new Error(`Rol invalido en: ${line}`);
    const flags = tokens.slice(3).map((token) => token.toUpperCase());
    players.push({
      number,
      name: tokens[1] ?? `#${number}`,
      role,
      captain: flags.includes("C"),
    });
  }
  return players;
}

export function validateRosterPlayers(players: RosterPlayer[]): string[] {
  const issues: string[] = [];
  if (players.length < 6 || players.length > 14) issues.push("El plantel debe tener entre 6 y 14 jugadores.");
  const numbers = players.map((player) => player.number);
  if (new Set(numbers).size !== numbers.length) issues.push("Dorsales repetidos.");
  const liberos = players.filter((player) => player.role === "L");
  if (liberos.length > 2) issues.push("Maximo dos liberos.");
  const captains = players.filter((player) => player.captain);
  if (captains.length !== 1) issues.push("Debe haber exactamente un capitan.");
  if (captains[0]?.role === "L") issues.push("El libero no puede ser capitan.");
  if (players.filter((player) => player.role !== "L").length < 6) issues.push("Seis jugadores de cancha como minimo.");
  return issues;
}

export function teamFromRosterSheet(name: string, code: string, text: string, color = "#e11d48"): TeamRoster {
  const players = parseRosterSheet(text);
  const issues = validateRosterPlayers(players);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const courtPlayers = players.filter((player) => player.role !== "L");
  const libero = players.find((player) => player.role === "L");
  return {
    ...newTeam(name, code, color),
    players,
    starters: courtPlayers.slice(0, 6).map((player) => player.number),
    libero: libero?.number ?? null,
    bench: players.filter((player) => !courtPlayers.slice(0, 6).includes(player)).map((player) => player.number),
  };
}

export function newScoreboardHistory(state: ScoreboardState): ScoreboardHistory {
  return { past: [], present: structuredClone(state), future: [] };
}

export function commitScoreboard(
  history: ScoreboardHistory,
  next: ScoreboardState,
): ScoreboardHistory {
  const past = [...history.past, history.present].slice(-SCOREBOARD_HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

export function undoScoreboard(history: ScoreboardHistory): ScoreboardHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoScoreboard(history: ScoreboardHistory): ScoreboardHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present].slice(-SCOREBOARD_HISTORY_LIMIT),
    present: next,
    future: history.future.slice(1),
  };
}

/* --------------------------------------------------------------- module 25 */

export type ChalkReason = "stop_serve_run" | "organize_sideout" | "match_point_defense";

export interface ChalkPoint {
  x: number;
  y: number;
}

export interface ChalkStroke {
  points: ChalkPoint[];
}

export interface ChalkCue {
  code: string;
  text: string;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
}

export interface ChalkStrokeReport {
  points: ChalkPoint[];
  lengthM: number;
  arrowhead: ChalkPoint;
}

export interface ChalkboardReport {
  reason: ChalkReason;
  rotation: number;
  seconds: number;
  cues: ChalkCue[];
  strokes: ChalkStrokeReport[];
  totalLengthM: number;
  message: string;
}

const CHALK_CUES: Record<ChalkReason, ChalkCue[]> = {
  stop_serve_run: [
    { code: "fix_reception", text: "Acorta la recepción: libero al centro y tres receptores en semicírculo.", priority: "HIGH" },
    { code: "serve_short", text: "Saque corto al 1-2 para romper la rotación rival.", priority: "NORMAL" },
  ],
  organize_sideout: [
    { code: "setter_release", text: "Libera al armador del bloqueo y fija el ataque por Z4.", priority: "HIGH" },
    { code: "pin_attack", text: "Ataque de pin con cobertura de Z6 y pipe como segunda opción.", priority: "NORMAL" },
  ],
  match_point_defense: [
    { code: "block_line", text: "Bloqueo a la línea y defensa escalonada en Z5-Z6.", priority: "CRITICAL" },
    { code: "backcourt_cover", text: "Cubre el rebote del bloqueo con Z1 cerrado al centro.", priority: "HIGH" },
  ],
};

export function buildChalkboard(input: {
  reason: ChalkReason;
  rotation?: number;
  scoreA?: number;
  scoreB?: number;
  strokes?: ChalkStroke[];
}): ChalkboardReport {
  const rotation = input.rotation ?? 1;
  if (rotation < 1 || rotation > 6) throw new Error("rotation must be 1-6");
  const strokes = (input.strokes ?? []).map((stroke): ChalkStrokeReport => {
    if (stroke.points.length < 2) throw new Error("a stroke needs at least two points");
    let length = 0;
    for (const point of stroke.points) {
      if (point.x < 0 || point.x > 9 || point.y < 0 || point.y > 18) {
        throw new Error("stroke point outside the 9 x 18 court");
      }
    }
    for (let index = 0; index < stroke.points.length - 1; index += 1) {
      const start = stroke.points[index] as ChalkPoint;
      const end = stroke.points[index + 1] as ChalkPoint;
      length += Math.hypot(end.x - start.x, end.y - start.y);
    }
    return {
      points: stroke.points,
      lengthM: round2(length),
      arrowhead: stroke.points[stroke.points.length - 1] as ChalkPoint,
    };
  });
  const total = strokes.reduce((sum, stroke) => sum + stroke.lengthM, 0);
  return {
    reason: input.reason,
    rotation,
    seconds: 30,
    cues: CHALK_CUES[input.reason],
    strokes,
    totalLengthM: round2(total),
    message: "Pizarra de tiempo muerto lista: 30 s FIVB, dos consignas y trazos validados.",
  };
}

/* --------------------------------------------------------------- module 26 */

export interface MomentumReport {
  team: Side;
  servingNow: Side;
  momentumIndex: number;
  consecutiveBreaks: number;
  opponentRun: number;
  worstRotation: number | null;
  worstRun: number;
  recommendation: "HOLD" | "CALL_TIMEOUT_NOW_3_RUN" | "URGENT_TIMEOUT_OR_SUB_5_RUN";
  message: string;
}

export function analyzeMomentum(input: {
  team?: Side;
  history: Side[];
  rotations?: number[];
}): MomentumReport {
  if (input.history.length === 0) throw new Error("rally history is required");
  const rotations = input.rotations ?? [];
  if (rotations.length > 0 && rotations.length !== input.history.length) {
    throw new Error("rotation history must match rally history");
  }
  const team = input.team ?? "A";
  const opponent: Side = team === "A" ? "B" : "A";
  let opponentRun = 0;
  for (let index = input.history.length - 1; index >= 0; index -= 1) {
    if (input.history[index] !== opponent) break;
    opponentRun += 1;
  }
  let serving: Side = "A";
  let breaks = 0;
  for (const winner of input.history) {
    if (winner !== serving) breaks += 1;
    serving = winner;
  }
  const window = input.history.slice(-6);
  const teamPoints = window.filter((point) => point === team).length;
  const momentumIndex = round2(((teamPoints - (window.length - teamPoints)) * 100) / window.length);
  const pressure = new Map<number, number>();
  if (rotations.length > 0) {
    input.history.forEach((winner, index) => {
      if (winner === team) return;
      const rotation = rotations[index] as number;
      pressure.set(rotation, (pressure.get(rotation) ?? 0) + 1);
    });
  }
  let worstRotation: number | null = null;
  let worstRun = 0;
  for (const [rotation, run] of pressure.entries()) {
    if (run > worstRun) {
      worstRotation = rotation;
      worstRun = run;
    }
  }
  const recommendation =
    opponentRun >= 5 ? "URGENT_TIMEOUT_OR_SUB_5_RUN" : opponentRun >= 3 ? "CALL_TIMEOUT_NOW_3_RUN" : "HOLD";
  return {
    team,
    servingNow: input.history[input.history.length - 1] as Side,
    momentumIndex,
    consecutiveBreaks: breaks,
    opponentRun,
    worstRotation,
    worstRun,
    recommendation,
    message:
      recommendation === "HOLD"
        ? "Sin racha crítica: mantén la rotación y el plan de saque."
        : recommendation === "CALL_TIMEOUT_NOW_3_RUN"
          ? "Racha de 3: pide tiempo muerto ahora."
          : "Racha de 5 o más: tiempo muerto urgente o sustitución.",
  };
}

/* --------------------------------------------------------------- module 27 */

export type DraftRole = "setter" | "outside" | "middle" | "opposite" | "libero";

export interface DraftPlayer {
  name: string;
  role: DraftRole;
  level: number;
}

export interface DraftTeam {
  captain: string;
  players: DraftPlayer[];
  count: number;
  totalLevel: number;
  averageLevel: number;
  departments: Record<string, number>;
  weakestDepartment: string | null;
  balanced: boolean;
}

export interface DraftReport {
  pickOrder: Array<{ pick: number; captain: string; player: DraftPlayer }>;
  teams: DraftTeam[];
  bench: DraftPlayer[];
  totalLevel: number;
  bestBalance: string;
  message: string;
}

const DRAFT_DEPARTMENTS: Record<DraftRole, string> = {
  setter: "setting",
  outside: "reception",
  middle: "attack",
  opposite: "attack",
  libero: "reception",
};

export function snakeDraft(input: { captains: string[]; players: DraftPlayer[] }): DraftReport {
  if (input.captains.length < 2 || input.captains.length > 4) {
    throw new Error("captains must be between 2 and 4");
  }
  if (new Set(input.captains).size !== input.captains.length) throw new Error("captain names must be unique");
  if (input.players.length === 0) throw new Error("at least one player is required");
  for (const player of input.players) {
    if (player.level < 1 || player.level > 5) throw new Error("level must be between 1 and 5");
  }
  const ordered = [...input.players].sort((left, right) => right.level - left.level || left.name.localeCompare(right.name));
  const rosters = new Map(input.captains.map((captain) => [captain, [] as DraftPlayer[]]));
  const pickOrder: DraftReport["pickOrder"] = [];
  let cursor = 0;
  let round = 0;
  while (cursor < ordered.length) {
    const order = input.captains.map((_, index) => index);
    if (round % 2 === 1) order.reverse();
    for (const index of order) {
      if (cursor >= ordered.length) break;
      const captain = input.captains[index] as string;
      const player = ordered[cursor] as DraftPlayer;
      (rosters.get(captain) as DraftPlayer[]).push(player);
      pickOrder.push({ pick: cursor + 1, captain, player });
      cursor += 1;
    }
    round += 1;
  }
  const teams = input.captains.map((captain): DraftTeam => {
    const players = rosters.get(captain) as DraftPlayer[];
    const totalLevel = players.reduce((sum, player) => sum + player.level, 0);
    const departments: Record<string, number> = {};
    for (const player of players) {
      const department = DRAFT_DEPARTMENTS[player.role];
      departments[department] = (departments[department] ?? 0) + 1;
    }
    const weakest = ["setting", "reception", "attack"].find((department) => (departments[department] ?? 0) === 0) ?? null;
    return {
      captain,
      players,
      count: players.length,
      totalLevel,
      averageLevel: round2(players.length ? totalLevel / players.length : 0),
      departments,
      weakestDepartment: weakest,
      balanced: weakest === null,
    };
  });
  const best = teams.find((team) => team.balanced) ?? (teams[0] as DraftTeam);
  return {
    pickOrder,
    teams,
    bench: ordered.slice(cursor),
    totalLevel: ordered.reduce((sum, player) => sum + player.level, 0),
    bestBalance: best.captain,
    message: "Draft serpiente generado con auditoría por departamento.",
  };
}

/* --------------------------------------------------------------- module 28 */

export interface RosterPlayerInput {
  name: string;
  number: number;
  role: DraftRole;
  isCaptain?: boolean;
  isLibero?: boolean;
}

export interface RosterReport {
  team: string;
  tournament: string;
  captain: string;
  liberos: number;
  passCode: string;
  seal: string;
  sha256: string;
  checks: string[];
  message: string;
}

export async function buildRosterPass(input: {
  team: string;
  tournament?: string;
  players: RosterPlayerInput[];
}): Promise<RosterReport> {
  if (input.players.length < 6 || input.players.length > 14) throw new Error("roster needs 6-14 players");
  const numbers = input.players.map((player) => player.number);
  if (new Set(numbers).size !== numbers.length) throw new Error("jersey numbers must be unique");
  const liberos = input.players.filter((player) => player.isLibero).length;
  if (liberos > 2) throw new Error("at most two liberos");
  const captains = input.players.filter((player) => player.isCaptain);
  if (captains.length !== 1) throw new Error("exactly one captain is required");
  if (captains[0]?.isLibero) throw new Error("the captain cannot be the libero");
  const ordered = [...input.players].sort((left, right) => left.number - right.number);
  const payload: JsonValue = {
    team: input.team,
    tournament: input.tournament ?? "",
    players: ordered.map((player) => ({
      name: player.name,
      number: player.number,
      role: player.role,
      is_captain: player.isCaptain ?? false,
      is_libero: player.isLibero ?? false,
    })),
  };
  const seal = await buildSeal(payload);
  const digest = seal.seal.replace("VOS-SEAL-", "");
  return {
    team: input.team,
    tournament: input.tournament ?? "",
    captain: captains[0]?.name ?? "",
    liberos,
    passCode: `VOS-ROSTER-${digest.slice(0, 24)}`,
    seal: seal.seal,
    sha256: seal.sha256,
    checks: ["dorsales_unicos", "maximo_dos_liberos", "capitan_unico", "capitan_no_libero"],
    message: "Pase de plantel verificado y listo para mesa.",
  };
}

export async function verifyRosterPass(
  input: { team: string; tournament?: string; players: RosterPlayerInput[] },
  passCode: string,
): Promise<boolean> {
  const report = await buildRosterPass(input);
  return report.passCode === passCode.trim().toUpperCase();
}

/* --------------------------------------------------------------- module 29 */

export type EquipmentCategory =
  | "men_indoor"
  | "women_indoor"
  | "mixed_recreational"
  | "u18_boys"
  | "u18_girls"
  | "newcom_senior";

export interface EquipmentReport {
  category: EquipmentCategory;
  surface: "indoor" | "beach";
  expectedCm: number;
  centerDeviationCm: number;
  maxDeviationCm: number;
  netOk: boolean;
  pressureKgf: number;
  pressurePsi: number;
  pressureKpa: number;
  ballStatus: string;
  ballOk: boolean;
  ballsStacked: number;
  status: "OK" | "NET_OUT_OF_TOLERANCE" | "BALL_OUT_OF_RANGE";
  message: string;
}

const EQUIPMENT_HEIGHTS: Record<EquipmentCategory, number> = {
  men_indoor: 243,
  women_indoor: 224,
  mixed_recreational: 235,
  u18_boys: 235,
  u18_girls: 218,
  newcom_senior: 243,
};

const PRESSURE_RANGES: Record<"indoor" | "beach", [number, number]> = {
  indoor: [0.3, 0.325],
  beach: [0.175, 0.225],
};

export function inspectEquipment(input: {
  category: EquipmentCategory;
  centerHeightCm: number;
  sideAHeightCm: number;
  sideBHeightCm: number;
  ballPressureKgfCm2: number;
  surface?: "indoor" | "beach";
}): EquipmentReport {
  const surface = input.surface ?? "indoor";
  if (input.centerHeightCm < 100 || input.centerHeightCm > 400) throw new Error("height outside 100-400 cm");
  const expected = EQUIPMENT_HEIGHTS[input.category];
  const centerDeviation = Math.abs(input.centerHeightCm - expected);
  const maxDeviation = Math.max(
    Math.abs(input.sideAHeightCm - input.centerHeightCm),
    Math.abs(input.sideBHeightCm - input.centerHeightCm),
  );
  const netOk = maxDeviation <= 2 && centerDeviation <= 2;
  const [low, high] = PRESSURE_RANGES[surface];
  const ballOk = input.ballPressureKgfCm2 >= low && input.ballPressureKgfCm2 <= high;
  const ballStatus =
    input.ballPressureKgfCm2 < low
      ? "Desinflada"
      : input.ballPressureKgfCm2 > high
        ? "Demasiado dura (rebote descontrolado)"
        : "Óptima FIVB";
  const status = !netOk ? "NET_OUT_OF_TOLERANCE" : !ballOk ? "BALL_OUT_OF_RANGE" : "OK";
  return {
    category: input.category,
    surface,
    expectedCm: expected,
    centerDeviationCm: round2(centerDeviation),
    maxDeviationCm: round2(maxDeviation),
    netOk,
    pressureKgf: round2(input.ballPressureKgfCm2),
    pressurePsi: round2(input.ballPressureKgfCm2 * 14.2233),
    pressureKpa: round2(input.ballPressureKgfCm2 * 98.0665),
    ballStatus,
    ballOk,
    ballsStacked: round2(input.centerHeightCm / 21),
    status,
    message:
      status === "OK"
        ? "Red y balón conformes: equipo listo."
        : status === "NET_OUT_OF_TOLERANCE"
          ? "Red fuera de tolerancia: corrige la tensión."
          : "Balón fuera de rango: ajusta la presión.",
  };
}

/* --------------------------------------------------------------- module 30 */

export type PosterTheme = "obsidian" | "crimson" | "volt";

export interface PosterReport {
  width: number;
  height: number;
  svg: string;
  filename: string;
  roomMatrix: string[];
  seal: string;
  sha256: string;
  message: string;
}

const POSTER_THEMES: Record<PosterTheme, [string, string, string]> = {
  obsidian: ["#0B0B0F", "#FF3B5C", "#F5F5F7"],
  crimson: ["#2A0A12", "#FF3355", "#FFF4F6"],
  volt: ["#0A0F0A", "#C6FF00", "#F4FFE0"],
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function buildMatchPoster(input: {
  homeTeam: string;
  awayTeam: string;
  setsHome?: number;
  setsAway?: number;
  periods: Array<{ home: number; away: number }>;
  tournament?: string;
  mvp?: string;
  roomId?: string;
  theme?: PosterTheme;
  format?: "story" | "feed";
}): Promise<PosterReport> {
  if (input.periods.length < 1 || input.periods.length > 5) throw new Error("poster needs 1-5 periods");
  const format = input.format ?? "story";
  const theme = input.theme ?? "obsidian";
  const width = 1080;
  const height = format === "story" ? 1920 : 1080;
  const [background, accent, text] = POSTER_THEMES[theme];
  const home = escapeXml(input.homeTeam);
  const away = escapeXml(input.awayTeam);
  const tournament = escapeXml(input.tournament || "VOLLEYOS ARENA");
  const mvp = escapeXml(input.mvp || "MVP DEL PARTIDO");
  const room = escapeXml(input.roomId || "VOS-ROOM");
  const seal = await buildSeal({
    home_team: input.homeTeam,
    away_team: input.awayTeam,
    sets_home: input.setsHome ?? 0,
    sets_away: input.setsAway ?? 0,
    periods: input.periods.map((period) => ({ home: period.home, away: period.away })),
    tournament: input.tournament ?? "",
    mvp: input.mvp ?? "",
    room_id: input.roomId ?? "",
    theme,
    format,
  });
  const digest = await sha256(input.roomId || seal.sha256);
  const roomMatrix = [...digest.slice(0, 25)].map((character) => (parseInt(character, 16) % 2).toString());
  const periods = input.periods.map((period) => `${period.home}-${period.away}`).join("  ");
  const cells = roomMatrix
    .map((cell, index) => {
      const x = 120 + (index % 5) * 46;
      const y = 950 + Math.floor(index / 5) * 46;
      return `<rect x="${x}" y="${y}" width="34" height="34" rx="6" fill="${accent}" opacity="${0.25 + Number(cell) * 0.55}"/>`;
    })
    .join("");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    `<title>${home} vs ${away}</title>`,
    `<rect width="${width}" height="${height}" fill="${background}"/>`,
    `<text x="90" y="150" fill="${accent}" font-family="Arial, sans-serif" font-size="34" letter-spacing="8">${tournament}</text>`,
    `<text x="90" y="330" fill="${text}" font-family="Arial, sans-serif" font-size="62" font-weight="700">${home}</text>`,
    `<text x="90" y="430" fill="${accent}" font-family="Arial, sans-serif" font-size="46" font-weight="700">SETS ${input.setsHome ?? 0} - ${input.setsAway ?? 0}</text>`,
    `<text x="90" y="530" fill="${text}" font-family="Arial, sans-serif" font-size="62" font-weight="700">${away}</text>`,
    `<text x="90" y="720" fill="${text}" font-family="Arial, sans-serif" font-size="48" letter-spacing="6">${periods}</text>`,
    `<rect x="90" y="790" width="900" height="120" rx="24" fill="${accent}" opacity="0.18"/>`,
    `<text x="120" y="865" fill="${text}" font-family="Arial, sans-serif" font-size="38" font-weight="700">MVP ${mvp}</text>`,
    `<text x="90" y="910" fill="${text}" font-family="Arial, sans-serif" font-size="30">SALA ${room}</text>`,
    cells,
    `<text x="90" y="${height - 110}" fill="${accent}" font-family="Arial, sans-serif" font-size="28" letter-spacing="4">VOLLEYOS // MATCH POSTER</text>`,
    `<text x="90" y="${height - 60}" fill="${text}" opacity="0.72" font-family="Arial, sans-serif" font-size="24">${seal.seal}</text>`,
    "</svg>",
  ].join("");
  return {
    width,
    height,
    svg,
    filename: `volleyos-match-poster-${format}.svg`,
    roomMatrix,
    seal: seal.seal,
    sha256: seal.sha256,
    message: "Poster SVG generado con nombres escapados, sello HMAC y matriz de sala.",
  };
}

/* --------------------------------------------------------------- module 31 */

export type ServeClass =
  | "FLOAT_TACTICAL"
  | "HYBRID_FAST"
  | "POWER_JUMP_SERVE"
  | "WORLD_CLASS_BOMB";

export interface ServeRadarReport {
  horizontalDistanceM: number;
  arcDistanceM: number;
  averageSpeedMps: number;
  initialSpeedKmh: number;
  classification: ServeClass;
  reactionMarginMs: number;
  message: string;
}

export function serveRadar(input: {
  originXm: number;
  originYm: number;
  targetXm: number;
  targetYm: number;
  flightTimeMs: number;
}): ServeRadarReport {
  if (input.flightTimeMs < 250 || input.flightTimeMs > 3000) throw new Error("flight time outside 250-3000 ms");
  const dx = input.targetXm - input.originXm;
  const dy = input.targetYm - input.originYm;
  const horizontal = Math.sqrt(dx * dx + dy * dy);
  const arc = Math.sqrt(horizontal * horizontal + 2.43 * 2.43);
  const average = arc / (input.flightTimeMs / 1000);
  const initial = average * 1.18 * 3.6;
  const classification: ServeClass =
    initial < 65
      ? "FLOAT_TACTICAL"
      : initial < 90
        ? "HYBRID_FAST"
        : initial < 115
          ? "POWER_JUMP_SERVE"
          : "WORLD_CLASS_BOMB";
  const labels: Record<ServeClass, string> = {
    FLOAT_TACTICAL: "flotado tactico",
    HYBRID_FAST: "hibrido rapido",
    POWER_JUMP_SERVE: "jump serve de poder",
    WORLD_CLASS_BOMB: "bomba de clase mundial",
  };
  const reactionMarginMs = Math.max(0, input.flightTimeMs - 250);
  return {
    horizontalDistanceM: round2(horizontal),
    arcDistanceM: round2(arc),
    averageSpeedMps: round2(average),
    initialSpeedKmh: round2(initial),
    classification,
    reactionMarginMs,
    message: `Saque ${labels[classification]} a ${round2(initial)} km/h; margen ${reactionMarginMs} ms.`,
  };
}

/* --------------------------------------------------------------- module 32 */

export interface MatchupReport {
  matrix: number[][];
  bestStartingRotation: string;
  opponentAlignment: string;
  bestDifferential: number;
  worstStartingRotation: string;
  worstDifferential: number;
  topAttackerIndex: number;
  bestVsTopAttacker: string;
  neutralizationMargin: number;
  message: string;
}

export function matchupMatrix(input: {
  opponentAttack: number[];
  ownBlock: number[];
}): MatchupReport {
  if (input.opponentAttack.length !== 6 || input.ownBlock.length !== 6) throw new Error("six values required");
  if ([...input.opponentAttack, ...input.ownBlock].some((value) => value < 0 || value > 100)) {
    throw new Error("power values must be 0-100");
  }
  const matrix = Array.from({ length: 6 }, (_, own) =>
    Array.from({ length: 6 }, (_, rival) => {
      let total = 0;
      for (let index = 0; index < 6; index += 1) {
        total += (input.ownBlock[(own + index) % 6] ?? 0) - (input.opponentAttack[(rival + index) % 6] ?? 0);
      }
      return round2(total / 6);
    }),
  );
  let bestOwn = 0;
  let bestRival = 0;
  let worstOwn = 0;
  for (let own = 0; own < 6; own += 1) {
    for (let rival = 0; rival < 6; rival += 1) {
      if ((matrix[own]?.[rival] ?? 0) > (matrix[bestOwn]?.[bestRival] ?? 0)) {
        bestOwn = own;
        bestRival = rival;
      }
    }
    if (Math.min(...(matrix[own] ?? [])) < Math.min(...(matrix[worstOwn] ?? []))) worstOwn = own;
  }
  const topAttackerIndex = input.opponentAttack.indexOf(Math.max(...input.opponentAttack));
  let bestVsTop = 0;
  for (let own = 1; own < 6; own += 1) {
    if ((input.ownBlock[(own + topAttackerIndex) % 6] ?? 0) > (input.ownBlock[(bestVsTop + topAttackerIndex) % 6] ?? 0)) {
      bestVsTop = own;
    }
  }
  const margin = (input.ownBlock[(bestVsTop + topAttackerIndex) % 6] ?? 0) - (input.opponentAttack[topAttackerIndex] ?? 0);
  return {
    matrix,
    bestStartingRotation: `R${bestOwn + 1}`,
    opponentAlignment: `R${bestRival + 1}`,
    bestDifferential: matrix[bestOwn]?.[bestRival] ?? 0,
    worstStartingRotation: `R${worstOwn + 1}`,
    worstDifferential: Math.min(...(matrix[worstOwn] ?? [])),
    topAttackerIndex,
    bestVsTopAttacker: `R${bestVsTop + 1}`,
    neutralizationMargin: round2(margin),
    message: `Inicia en R${bestOwn + 1}; evita R${worstOwn + 1}. Bloqueo top: R${bestVsTop + 1}.`,
  };
}

/* --------------------------------------------------------------- module 33 */

export type BlockoutDecision =
  | "HIGH_OUTSIDE_HAND_WIPE"
  | "SEAM_SPLIT"
  | "SOFT_RECYCLE_OFF_HANDS"
  | "CROSS_COURT_ROLL_SHOT";

export interface BlockoutOption {
  decision: BlockoutDecision;
  probabilityPct: number;
  ev: number;
  note: string;
}

export interface BlockoutReport {
  zone: "zone_4" | "zone_2";
  setDistance: "tight_0_3m" | "normal_1_0m" | "off_net_2_5m";
  blockClosure: "double_closed" | "seam_open" | "late_outside_hand";
  options: BlockoutOption[];
  recommended: BlockoutDecision;
  wristAngleDeg: number;
  message: string;
}

const BLOCKOUT_BASE: Record<BlockoutDecision, number> = {
  HIGH_OUTSIDE_HAND_WIPE: 52,
  SEAM_SPLIT: 45,
  SOFT_RECYCLE_OFF_HANDS: 62,
  CROSS_COURT_ROLL_SHOT: 48,
};
const BLOCKOUT_VALUE: Record<BlockoutDecision, number> = {
  HIGH_OUTSIDE_HAND_WIPE: 1,
  SEAM_SPLIT: 1.15,
  SOFT_RECYCLE_OFF_HANDS: 0.95,
  CROSS_COURT_ROLL_SHOT: 0.9,
};
const BLOCKOUT_ZONE: Record<"zone_4" | "zone_2", Record<BlockoutDecision, number>> = {
  zone_4: { HIGH_OUTSIDE_HAND_WIPE: 8, SEAM_SPLIT: -4, SOFT_RECYCLE_OFF_HANDS: 2, CROSS_COURT_ROLL_SHOT: 4 },
  zone_2: { HIGH_OUTSIDE_HAND_WIPE: -6, SEAM_SPLIT: 6, SOFT_RECYCLE_OFF_HANDS: 0, CROSS_COURT_ROLL_SHOT: -2 },
};
const BLOCKOUT_DISTANCE: Record<"tight_0_3m" | "normal_1_0m" | "off_net_2_5m", Record<BlockoutDecision, number>> = {
  tight_0_3m: { HIGH_OUTSIDE_HAND_WIPE: -8, SEAM_SPLIT: -10, SOFT_RECYCLE_OFF_HANDS: 12, CROSS_COURT_ROLL_SHOT: -6 },
  normal_1_0m: { HIGH_OUTSIDE_HAND_WIPE: 2, SEAM_SPLIT: 2, SOFT_RECYCLE_OFF_HANDS: 2, CROSS_COURT_ROLL_SHOT: 2 },
  off_net_2_5m: { HIGH_OUTSIDE_HAND_WIPE: 6, SEAM_SPLIT: 8, SOFT_RECYCLE_OFF_HANDS: -8, CROSS_COURT_ROLL_SHOT: 10 },
};
const BLOCKOUT_CLOSURE: Record<"double_closed" | "seam_open" | "late_outside_hand", Record<BlockoutDecision, number>> = {
  double_closed: { HIGH_OUTSIDE_HAND_WIPE: 12, SEAM_SPLIT: -18, SOFT_RECYCLE_OFF_HANDS: 8, CROSS_COURT_ROLL_SHOT: -10 },
  seam_open: { HIGH_OUTSIDE_HAND_WIPE: -6, SEAM_SPLIT: 20, SOFT_RECYCLE_OFF_HANDS: 4, CROSS_COURT_ROLL_SHOT: 6 },
  late_outside_hand: { HIGH_OUTSIDE_HAND_WIPE: 16, SEAM_SPLIT: 4, SOFT_RECYCLE_OFF_HANDS: -4, CROSS_COURT_ROLL_SHOT: -8 },
};
const BLOCKOUT_WRIST: Record<BlockoutDecision, number> = {
  HIGH_OUTSIDE_HAND_WIPE: 35,
  SEAM_SPLIT: 10,
  SOFT_RECYCLE_OFF_HANDS: -20,
  CROSS_COURT_ROLL_SHOT: -35,
};

export function evaluateBlockout(input: {
  zone: "zone_4" | "zone_2";
  setDistance: "tight_0_3m" | "normal_1_0m" | "off_net_2_5m";
  blockClosure: "double_closed" | "seam_open" | "late_outside_hand";
  attackerReachCm: number;
  blockReachCm: number;
}): BlockoutReport {
  const reachDelta = (input.attackerReachCm - input.blockReachCm) / 10;
  const decisions = Object.keys(BLOCKOUT_BASE) as BlockoutDecision[];
  const options = decisions.map((decision) => {
    let probability =
      BLOCKOUT_BASE[decision] + BLOCKOUT_ZONE[input.zone][decision] +
      BLOCKOUT_DISTANCE[input.setDistance][decision] + BLOCKOUT_CLOSURE[input.blockClosure][decision];
    if (decision === "HIGH_OUTSIDE_HAND_WIPE" || decision === "SEAM_SPLIT") probability += reachDelta;
    else if (decision === "CROSS_COURT_ROLL_SHOT") probability += reachDelta / 4;
    else probability -= reachDelta / 2;
    probability = Math.max(5, Math.min(95, probability));
    const ev = (probability / 100) * BLOCKOUT_VALUE[decision];
    return {
      decision,
      probabilityPct: round1(probability),
      ev: round3(ev),
      note: `${round1(probability)}% de exito; EV ${round3(ev)}.`,
    };
  });
  const recommended = options.reduce((best, option) => (option.ev > best.ev ? option : best));
  let angle = BLOCKOUT_WRIST[recommended.decision];
  if (input.zone === "zone_2") angle = -angle;
  if (input.setDistance === "tight_0_3m") angle += 5;
  else if (input.setDistance === "off_net_2_5m") angle -= 5;
  return {
    zone: input.zone,
    setDistance: input.setDistance,
    blockClosure: input.blockClosure,
    options,
    recommended: recommended.decision,
    wristAngleDeg: round1(angle),
    message: `${recommended.decision} con EV ${recommended.ev}; muneca ${round1(angle)} grados.`,
  };
}

/* --------------------------------------------------------------- module 34 */

export type PracticeFocus = "k1_reception" | "block_defense_transition" | "serve_pressure" | "setter_tempo";

export interface PracticeBlock {
  label: string;
  startMin: number;
  endMin: number;
  minutes: number;
  groups: number[];
  objective: string;
  drill: string;
  scoringTarget: string;
}

export interface PracticeReport {
  players: number;
  durationMin: number;
  focus: PracticeFocus;
  groups: number[];
  activeCourts: number;
  blocks: PracticeBlock[];
  message: string;
}

const PRACTICE_TEMPLATES: Record<60 | 90 | 120, Array<[string, number]>> = {
  60: [["Activacion", 10], ["Tecnica", 15], ["Tactica", 15], ["Juego", 15], ["Cierre", 5]],
  90: [["Activacion", 12], ["Tecnica", 23], ["Tactica", 25], ["Juego", 25], ["Cierre", 5]],
  120: [["Activacion", 15], ["Tecnica", 30], ["Tactica", 35], ["Juego", 35], ["Cierre", 5]],
};
const PRACTICE_FOCUS: Record<PracticeFocus, [string, string, string]> = {
  k1_reception: ["Estabilizar K1", "Servicio dirigido a zonas 1/5", "3 recepciones positivas"],
  block_defense_transition: ["Cerrar bloqueo y reciclar", "Bloqueo de dos y cobertura", "2 bloqueos-untos"],
  serve_pressure: ["Presionar saque bajo fatiga", "Series cortas y profundas", "70% dentro"],
  setter_tempo: ["Acelerar decision del armador", "Quick-shoot-pipe", "5 ataques en tempo"],
};

export function planPractice(input: {
  players: number;
  durationMin: 60 | 90 | 120;
  focus: PracticeFocus;
}): PracticeReport {
  if (input.players < 4 || input.players > 24) throw new Error("players outside 4-24");
  const courts = Math.ceil(input.players / 6);
  const base = Math.floor(input.players / courts);
  const remainder = input.players % courts;
  const groups = [
    ...Array.from({ length: remainder }, () => base + 1),
    ...Array.from({ length: courts - remainder }, () => base),
  ];
  const [objective, drill, scoringTarget] = PRACTICE_FOCUS[input.focus];
  let start = 0;
  const blocks = (PRACTICE_TEMPLATES[input.durationMin] ?? []).map(([label, minutes]) => {
    const block = { label, startMin: start, endMin: start + minutes, minutes, groups, objective, drill, scoringTarget };
    start += minutes;
    return block;
  });
  return {
    players: input.players,
    durationMin: input.durationMin,
    focus: input.focus,
    groups,
    activeCourts: groups.length,
    blocks,
    message: `Plan de ${input.durationMin} min para ${input.players} jugadores en ${groups.length} grupos.`,
  };
}

/* --------------------------------------------------------------- module 35 */

export type MatchEventKind = "point" | "timeout" | "substitution" | "card" | "set_end";

export interface MatchEvent {
  kind: MatchEventKind;
  team: "home" | "away";
  player?: string;
  scoreHome: number;
  scoreAway: number;
  setNumber: number;
}

export interface FeedEntry {
  index: number;
  kind: MatchEventKind;
  team: "home" | "away";
  score: string;
  headline: string;
  commentary: string;
  clutch: boolean;
  leadChange: boolean;
}

export interface PlayByPlayReport {
  feed: FeedEntry[];
  clutchPoints: number;
  leadChanges: number;
  finalScore: string;
  summary: { es: string; en: string; pt: string };
}

export function buildPlayByPlay(input: {
  homeTeam: string;
  awayTeam: string;
  events: MatchEvent[];
}): PlayByPlayReport {
  if (input.events.length === 0) throw new Error("events required");
  let lastLeader: "home" | "away" | null = null;
  let clutchPoints = 0;
  let leadChanges = 0;
  const feed = input.events.map((event, index) => {
    const teamName = event.team === "home" ? input.homeTeam : input.awayTeam;
    const clutch = event.kind === "point" && event.scoreHome >= 20 && event.scoreAway >= 20;
    if (clutch) clutchPoints += 1;
    const leader = event.scoreHome > event.scoreAway ? "home" : event.scoreAway > event.scoreHome ? "away" : null;
    const leadChange = leader !== null && lastLeader !== null && leader !== lastLeader;
    if (leadChange) leadChanges += 1;
    if (leader !== null) lastLeader = leader;
    const score = `${event.scoreHome}-${event.scoreAway}`;
    const actor = event.player ? ` ${event.player}` : "";
    const headline =
      event.kind === "point" ? (clutch ? "PUNTO CLUTCH" : `Punto para ${teamName}`) :
      event.kind === "timeout" ? `Tiempo muerto de ${teamName}` :
      event.kind === "substitution" ? `Cambio en ${teamName}` :
      event.kind === "card" ? `Tarjeta para ${teamName}` : `Fin del set ${event.setNumber}`;
    const commentary =
      event.kind === "point" ? `${clutch ? "Punto clutch" : "Punto"} de${actor} (${teamName}). ${score}.` :
      event.kind === "timeout" ? `${teamName} pide tiempo muerto con ${score}.` :
      event.kind === "substitution" ? `${teamName} mueve el banco: entra${actor}. ${score}.` :
      event.kind === "card" ? `Tarjeta para${actor}. ${score}.` : `Cierra el set ${event.setNumber} con ${score}.`;
    return { index: index + 1, kind: event.kind, team: event.team, score, headline, commentary, clutch, leadChange };
  });
  const last = input.events[input.events.length - 1];
  if (!last) throw new Error("events required");
  const finalScore = `${last.scoreHome}-${last.scoreAway}`;
  return {
    feed,
    clutchPoints,
    leadChanges,
    finalScore,
    summary: {
      es: `${input.homeTeam} ${finalScore} ${input.awayTeam}. ${clutchPoints} clutch y ${leadChanges} cambios.`,
      en: `${input.homeTeam} ${finalScore} ${input.awayTeam}. ${clutchPoints} clutch points and ${leadChanges} lead changes.`,
      pt: `${input.homeTeam} ${finalScore} ${input.awayTeam}. ${clutchPoints} clutch e ${leadChanges} viradas.`,
    },
  };
}

/* --------------------------------------------------------------- module 36 */

export interface CareerMeasurement {
  period: string;
  verticalJumpCm: number;
  attackReachCm: number;
  serveSpeedKmh: number;
  attackEfficiencyPct: number;
  receptionPct: number;
}

export interface CareerReport {
  player: string;
  firstPeriod: string;
  lastPeriod: string;
  deltas: {
    jumpCm: number;
    reachCm: number;
    serveKmh: number;
    attackPct: number;
    receptionPct: number;
  };
  evolutionIndex: number;
  category: "DEVELOPMENT" | "COMPETITIVE" | "ELITE" | "WORLD_CLASS";
  nextCategory: string;
  gapToNext: number;
  bottleneck: "jump" | "reach" | "serve" | "attack" | "reception";
  message: string;
}

export function buildCareerReport(input: {
  player: string;
  measurements: CareerMeasurement[];
}): CareerReport {
  if (input.measurements.length < 2) throw new Error("two measurements required");
  const first = input.measurements[0];
  const last = input.measurements[input.measurements.length - 1];
  if (!first || !last) throw new Error("two measurements required");
  const deltas = {
    jumpCm: round1(last.verticalJumpCm - first.verticalJumpCm),
    reachCm: round1(last.attackReachCm - first.attackReachCm),
    serveKmh: round1(last.serveSpeedKmh - first.serveSpeedKmh),
    attackPct: round1(last.attackEfficiencyPct - first.attackEfficiencyPct),
    receptionPct: round1(last.receptionPct - first.receptionPct),
  };
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const scores = {
    jump: clamp((last.verticalJumpCm / 80) * 100),
    reach: clamp(((last.attackReachCm - 250) / 100) * 100),
    serve: clamp((last.serveSpeedKmh / 120) * 100),
    attack: clamp(last.attackEfficiencyPct),
    reception: clamp(last.receptionPct),
  };
  const absolute = Object.values(scores).reduce((total, value) => total + value, 0) / 5;
  const progress = clamp(50 + deltas.jumpCm * 2 + deltas.reachCm + deltas.serveKmh + deltas.attackPct * 1.5 + deltas.receptionPct);
  const evolutionIndex = round1(clamp(absolute * 0.7 + progress * 0.3));
  const category =
    evolutionIndex < 40 ? "DEVELOPMENT" :
    evolutionIndex < 60 ? "COMPETITIVE" :
    evolutionIndex < 80 ? "ELITE" : "WORLD_CLASS";
  const nextCategory = category === "WORLD_CLASS" ? "WORLD_CLASS" : category === "ELITE" ? "WORLD_CLASS" : category === "COMPETITIVE" ? "ELITE" : "COMPETITIVE";
  const gap = evolutionIndex < 40 ? 40 - evolutionIndex : evolutionIndex < 60 ? 60 - evolutionIndex : evolutionIndex < 80 ? 80 - evolutionIndex : 0;
  const bottleneck = (Object.keys(scores) as Array<keyof typeof scores>).reduce((lowest, key) => (scores[key] < scores[lowest] ? key : lowest));
  return {
    player: input.player,
    firstPeriod: first.period,
    lastPeriod: last.period,
    deltas,
    evolutionIndex,
    category,
    nextCategory,
    gapToNext: round1(gap),
    bottleneck,
    message: `${input.player}: indice ${evolutionIndex}/100. Cuello: ${bottleneck}.`,
  };
}

/* --------------------------------------------------------------- modules 37-48 */

export type AeroRegime = "FLYING_FLOAT_CRISIS" | "MAGNUS_DESCENT" | "STABLE_DRIVE";

export function analyzeAerodynamics(input: {
  speedKmh: number;
  spinRps: number;
  launchAngleDeg: number;
  impactHeightM: number;
}): {
  reynoldsNumber: number;
  regime: AeroRegime;
  lateralDeviationCm: number;
  verticalDropCm: number;
  landingDistanceM: number;
  landsInCourt: boolean;
  message: string;
} {
  if (input.speedKmh < 52 || input.speedKmh > 140) throw new Error("speed outside 52-140 km/h");
  if (input.spinRps < 0 || input.spinRps > 15) throw new Error("spin outside 0-15 rps");
  const speedMps = input.speedKmh / 3.6;
  const reynoldsNumber = Math.round((speedMps * 0.21) / 0.000015);
  const regime: AeroRegime =
    input.speedKmh >= 52 && input.speedKmh <= 74 && input.spinRps <= 1.2
      ? "FLYING_FLOAT_CRISIS"
      : input.spinRps >= 5
        ? "MAGNUS_DESCENT"
        : "STABLE_DRIVE";
  const angle = (input.launchAngleDeg * Math.PI) / 180;
  const horizontal = speedMps * Math.cos(angle);
  const vertical = speedMps * Math.sin(angle);
  const flight = (vertical + Math.sqrt(vertical * vertical + 2 * 9.81 * input.impactHeightM)) / 9.81;
  const landing = horizontal * flight;
  const lateral =
    regime === "FLYING_FLOAT_CRISIS"
      ? 8 + (74 - input.speedKmh) * 0.9 + (1.2 - input.spinRps) * 6
      : regime === "MAGNUS_DESCENT"
        ? input.spinRps * 3
        : (140 - input.speedKmh) * 0.05;
  const drop = 0.5 * 9.81 * flight * flight * 100 + (regime === "MAGNUS_DESCENT" ? input.spinRps * 4 : 0);
  return {
    reynoldsNumber,
    regime,
    lateralDeviationCm: round2(lateral),
    verticalDropCm: round2(drop),
    landingDistanceM: round2(landing),
    landsInCourt: landing > 0 && landing <= 18,
    message: `${regime} con Re=${reynoldsNumber}; desvio ${round2(lateral)} cm.`,
  };
}

export type ClipSkill = "spike" | "block" | "ace" | "dig";
export interface RallyClip {
  startSec: number;
  endSec: number;
  playerNumber: number;
  skill: ClipSkill;
  outcome: string;
}

export function buildClipPlan(input: {
  rallies: RallyClip[];
  playerNumber: number;
  minDurationSec: number;
}): {
  selected: RallyClip[];
  netPlaySec: number;
  deadTimeSec: number;
  netPlayPct: number;
  chapters: string[];
  ffmpegCommand: string;
  edl: string[];
  message: string;
} {
  if (input.rallies.length === 0) throw new Error("at least one rally required");
  for (const rally of input.rallies) {
    if (rally.endSec <= rally.startSec) throw new Error("end must be after start");
  }
  const selected = input.rallies.filter(
    (rally) => rally.playerNumber === input.playerNumber && rally.endSec - rally.startSec >= input.minDurationSec,
  );
  const start = Math.min(...input.rallies.map((rally) => rally.startSec));
  const end = Math.max(...input.rallies.map((rally) => rally.endSec));
  const span = Math.max(0, end - start);
  const net = selected.reduce((total, rally) => total + rally.endSec - rally.startSec, 0);
  const mmss = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const chapters: string[] = [];
  let chapterCursor = 0;
  selected.forEach((rally, index) => {
    if (index === 0) chapters.push("00:00");
    else chapters.push(mmss(chapterCursor));
    chapterCursor += rally.endSec - rally.startSec;
  });
  const commands: string[] = [];
  const edl: string[] = [];
  let edlCursor = 0;
  selected.forEach((rally, index) => {
    commands.push(`ffmpeg -ss ${round2(rally.startSec)} -to ${round2(rally.endSec)} -i input.mp4 -c copy clip_${String(index + 1).padStart(3, "0")}.mp4`);
    const from = mmss(edlCursor);
    edlCursor += rally.endSec - rally.startSec;
    edl.push(`${String(index + 1).padStart(3, "0")}  ${from} ${mmss(edlCursor)}  V  C  ${rally.playerNumber} ${rally.skill}`);
  });
  return {
    selected,
    netPlaySec: round2(net),
    deadTimeSec: round2(Math.max(0, span - net)),
    netPlayPct: span > 0 ? round2((net / span) * 100) : 0,
    chapters,
    ffmpegCommand: commands.join("\n"),
    edl,
    message: `${selected.length} jugadas del jugador ${input.playerNumber}; ${round2(net)} s netos.`,
  };
}

export interface RecruitInput {
  graduationYear: number;
  position: "outside" | "opposite" | "middle" | "setter" | "libero";
  heightCm: number;
  reachOneHandCm: number;
  reachTwoHandCm: number;
  verticalJumpCm: number;
  attackReachCm: number;
  kills: number;
  attackEfficiencyPct: number;
}

export async function buildRecruitingDossier(input: RecruitInput): Promise<{
  score: number;
  tier: "DIV_I" | "DIV_II" | "NATIONAL" | "U21";
  strengths: string[];
  gaps: string[];
  seal: string;
  message: string;
}> {
  if (input.graduationYear < 2026 || input.graduationYear > 2032) throw new Error("graduation year outside 2026-2032");
  if (input.heightCm < 150 || input.heightCm > 220) throw new Error("height outside 150-220 cm");
  const norm = (value: number, low: number, high: number): number => Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
  const score = Math.round(
    norm(input.heightCm, 150, 220) * 0.15 +
      norm(input.attackReachCm, 250, 380) * 0.25 +
      norm(input.verticalJumpCm, 20, 120) * 0.2 +
      Math.max(0, Math.min(100, input.attackEfficiencyPct)) * 0.25 +
      norm(input.kills, 0, 500) * 0.15,
  );
  const tier = score >= 85 ? "NATIONAL" : score >= 70 ? "DIV_I" : score >= 55 ? "DIV_II" : "U21";
  const strengths: string[] = [];
  const gaps: string[] = [];
  if (input.heightCm >= 190) strengths.push("Altura de elite para bloqueo y ataque.");
  if (input.verticalJumpCm >= 80) strengths.push("Salto explosivo con buen tiempo de ataque.");
  if (input.attackEfficiencyPct >= 45) strengths.push("Eficiencia de ataque superior a la media.");
  if (input.kills >= 250) strengths.push("Volumen de puntos probado.");
  if (input.heightCm < 180) gaps.push("Altura limitada: proyectar a defensa y recepcion.");
  if (input.verticalJumpCm < 50) gaps.push("Salto bajo: plan de fuerza y pliometria.");
  if (input.attackEfficiencyPct < 25) gaps.push("Eficiencia baja: revisar seleccion de golpe.");
  if (!strengths.length) strengths.push("Perfil equilibrado sin rasgo dominante.");
  if (!gaps.length) gaps.push("Sin brechas criticas.");
  const digest = await hmacSha256(canonicalJson(input as unknown as JsonValue), INTEGRITY_SEAL_SECRET);
  const seal = `VOS-SEAL-${digest.slice(0, 16).toUpperCase()}`;
  return { score, tier, strengths, gaps, seal, message: `Dossier ${tier} ${score}/100; sello ${seal}.` };
}

export type SystemName = "4-2" | "6-2" | "5-1";

export function analyzeSystem(input: {
  setters: number;
  pureHitters: number;
  transitionReadGrade: number;
  rotation: number;
}): {
  systems: Array<{ name: SystemName; frontAttackersByRotation: number[]; description: string }>;
  recommended: SystemName;
  infiltrationMap: Record<string, string>;
  message: string;
} {
  if (input.setters < 0 || input.setters > 2) throw new Error("setters outside 0-2");
  if (input.transitionReadGrade < 1 || input.transitionReadGrade > 10) throw new Error("read grade outside 1-10");
  let recommended: SystemName = input.setters >= 1 && input.pureHitters >= 4 ? "5-1" : input.setters >= 2 && input.pureHitters >= 3 ? "6-2" : "4-2";
  if (input.transitionReadGrade <= 4) recommended = input.setters >= 2 ? "6-2" : "4-2";
  const systems: Array<{ name: SystemName; frontAttackersByRotation: number[]; description: string }> = [
    { name: "4-2", frontAttackersByRotation: [2, 2, 2, 2, 2, 2], description: "Dos armadores alternan delantera y zaga." },
    { name: "6-2", frontAttackersByRotation: [3, 3, 3, 3, 3, 3], description: "Armador zaguero penetra; tres atacantes al frente." },
    { name: "5-1", frontAttackersByRotation: [3, 3, 3, 2, 2, 2], description: "Armador fijo; tres atacantes en R1-R3." },
  ];
  const infiltrationMap: Record<string, string> = {};
  for (let index = 0; index < 6; index += 1) {
    infiltrationMap[`R${index + 1}`] = `${recommended}: ${systems.find((system) => system.name === recommended)?.description ?? ""}`;
  }
  return { systems, recommended, infiltrationMap, message: `Sistema recomendado ${recommended}.` };
}

export function readDeception(input: {
  approachSpeedKmh: number;
  elbowHeightCm: number;
  ballFrontOffsetCm: number;
  setterFrontZoneJump: boolean;
  blockersCommitted: number;
}): {
  hardSwingPct: number;
  offSpeedTipPct: number;
  setterDumpPct: number;
  primaryDefender: "left_back" | "middle_back" | "right_back" | "libero";
  message: string;
} {
  const norm = (value: number, low: number, high: number): number => ((value - low) / (high - low)) * 100;
  const speed = norm(input.approachSpeedKmh, 5, 30);
  const elbow = norm(input.elbowHeightCm, 80, 220);
  const offset = norm(input.ballFrontOffsetCm, -40, 40);
  const blockers = input.blockersCommitted;
  const hard = 35 + speed * 0.3 + elbow * 0.1 + offset * 0.1;
  const tip = 25 + (100 - elbow) * 0.1 + blockers * 4 + (100 - offset) * 0.05;
  const dump = 5 + (input.setterFrontZoneJump ? 10 : 0) + blockers * 4 + (100 - speed) * 0.05;
  const total = hard + tip + dump;
  const hardPct = round1(Math.max(0, Math.min(100, (hard / total) * 100)));
  const tipPct = round1(Math.max(0, Math.min(100, (tip / total) * 100)));
  const dumpPct = round1(100 - hardPct - tipPct);
  const primaryDefender =
    input.setterFrontZoneJump && blockers <= 1
      ? "libero"
      : input.ballFrontOffsetCm < -10
        ? "left_back"
        : input.ballFrontOffsetCm > 10
          ? "right_back"
          : "middle_back";
  return { hardSwingPct: hardPct, offSpeedTipPct: tipPct, setterDumpPct: dumpPct, primaryDefender, message: `Swing ${hardPct}% / tip ${tipPct}% / dump ${dumpPct}%.` };
}

export type AdaptiveMode = "mini_2v2" | "mini_3v3" | "mini_4v4" | "sitting";

export function buildAdaptiveRulebook(input: {
  mode: AdaptiveMode;
  sex: "male" | "female";
  players: number;
}): {
  mode: AdaptiveMode;
  courtLengthM: number;
  courtWidthM: number;
  netHeightM: number;
  attackLineM: number | null;
  minPlayers: number;
  maxPlayers: number;
  servingLegal: boolean;
  blockServeLegal: boolean;
  pelvisContactRequired: boolean;
  rules: string[];
  message: string;
} {
  if (input.players < 2 || input.players > 12) throw new Error("players outside 2-12");
  if (input.mode === "sitting") {
    const netHeightM = input.sex === "male" ? 1.15 : 1.05;
    return {
      mode: input.mode,
      courtLengthM: 10,
      courtWidthM: 6,
      netHeightM,
      attackLineM: 2,
      minPlayers: 2,
      maxPlayers: 6,
      servingLegal: true,
      blockServeLegal: false,
      pelvisContactRequired: true,
      rules: ["Contacto de pelvis con el suelo.", "Bloqueo del saque prohibido.", "Linea de ataque a 2.00 m."],
      message: `Sitting: 10.00 x 6.00 m, red ${netHeightM} m.`,
    };
  }
  const court = input.mode === "mini_4v4" ? [14, 7, 2.1, 4, 8] : input.mode === "mini_3v3" ? [12, 6, 2.05, 3, 6] : [9, 4.5, 2, 2, 4];
  return {
    mode: input.mode,
    courtLengthM: court[0] ?? 9,
    courtWidthM: court[1] ?? 4.5,
    netHeightM: court[2] ?? 2,
    attackLineM: null,
    minPlayers: court[3] ?? 2,
    maxPlayers: court[4] ?? 4,
    servingLegal: true,
    blockServeLegal: false,
    pelvisContactRequired: false,
    rules: ["Saque bajo el hombro.", "Rotacion obligatoria.", "Todos atacan y rotan."],
    message: `${input.mode}: ${court[0]} x ${court[1]} m.`,
  };
}

export type EloResult = "3-0" | "3-1" | "3-2" | "2-3" | "1-3" | "0-3";

export function calculateElo(input: {
  teamARating: number;
  teamBRating: number;
  kWeight: number;
  result: EloResult;
}): { expectedA: number; scoreA: number; marginFactor: number; deltaA: number; deltaB: number; message: string } {
  const ratio = Math.pow(10, (input.teamBRating - input.teamARating) / 400);
  const expectedA = round4(1 / (1 + ratio));
  const scoreA = input.result.startsWith("3") ? 1 : input.result.startsWith("0") ? 0 : 0.5;
  const marginFactor = input.result === "3-0" || input.result === "0-3" ? 1 : input.result === "3-1" || input.result === "1-3" ? 0.9 : 0.8;
  const deltaA = round2(input.kWeight * marginFactor * (scoreA - expectedA));
  return { expectedA, scoreA, marginFactor, deltaA, deltaB: -deltaA, message: `Elo A ${deltaA > 0 ? "+" : ""}${deltaA}.` };
}

export function buildTreasury(input: {
  jerseyCostTotal: number;
  monthlyFeePerPlayer: number;
  months: number;
  ballFund: number;
  registrationFee: number;
  players: Array<{ name: string; paid: number }>;
}): {
  perPlayer: Array<{ name: string; due: number; paid: number; balance: number; status: "PAID_IN_FULL" | "PARTIAL_DEBT" | "CREDIT_FAVOR" }>;
  totalDue: number;
  totalPaid: number;
  collectionPct: number;
  whatsappText: string;
  excelRows: string[][];
  message: string;
} {
  if (input.players.length < 2) throw new Error("at least two players required");
  const count = input.players.length;
  const due = round2(input.jerseyCostTotal / count + input.monthlyFeePerPlayer * input.months + (input.ballFund + input.registrationFee) / count);
  const perPlayer = input.players.map((player) => {
    const paid = round2(player.paid);
    const balance = round2(due - paid);
    const status: "PAID_IN_FULL" | "PARTIAL_DEBT" | "CREDIT_FAVOR" = balance === 0 ? "PAID_IN_FULL" : balance > 0 ? "PARTIAL_DEBT" : "CREDIT_FAVOR";
    return { name: player.name, due, paid, balance, status };
  });
  const totalDue = round2(perPlayer.reduce((total, player) => total + player.due, 0));
  const totalPaid = round2(perPlayer.reduce((total, player) => total + player.paid, 0));
  const collectionPct = totalDue > 0 ? round2((totalPaid / totalDue) * 100) : 0;
  return {
    perPlayer,
    totalDue,
    totalPaid,
    collectionPct,
    whatsappText: `TESORERIA VOLLEYOS\n${perPlayer.map((player) => `${player.name}: ${player.balance}`).join("\n")}\nRecaudacion ${collectionPct}%`,
    excelRows: [["Jugador", "Cuota", "Pagado", "Saldo", "Estado"], ...perPlayer.map((player) => [player.name, String(player.due), String(player.paid), String(player.balance), player.status])],
    message: `${totalPaid} de ${totalDue} recaudado (${collectionPct}%).`,
  };
}

export function validateHouseRules(input: {
  format: "mixed_6v6" | "relojito" | "short_sets";
  teamAGenders: Array<"M" | "F">;
  teamBGenders: Array<"M" | "F">;
  benchOrder: string[];
  scoreA: number;
  scoreB: number;
}): {
  valid: boolean;
  violations: string[];
  rotationPlan: string[];
  targetScore: number;
  goldenPointRequired: boolean;
  minContactsPerGender: number;
  message: string;
} {
  const violations: string[] = [];
  let minContactsPerGender = 0;
  if (input.format === "mixed_6v6") {
    minContactsPerGender = 2;
    for (const [label, genders] of [["A", input.teamAGenders], ["B", input.teamBGenders]] as const) {
      if (genders.length !== 6) violations.push(`Equipo ${label}: seis jugadores.`);
      if (genders.filter((gender) => gender === "M").length < 2 || genders.filter((gender) => gender === "F").length < 2) {
        violations.push(`Equipo ${label}: minimo 2 M y 2 F.`);
      }
    }
  }
  if (input.format === "relojito" && (input.teamAGenders.length < 7 || input.teamAGenders.length > 10)) {
    violations.push("Relojito: roster de 7 a 10.");
  }
  const rotationPlan = Array.from({ length: 6 }, (_, index) => `Z6->${input.benchOrder[index % Math.max(1, input.benchOrder.length)] ?? `ROT${index + 1}`}`);
  return {
    valid: violations.length === 0,
    violations,
    rotationPlan,
    targetScore: input.format === "short_sets" ? 15 : 25,
    goldenPointRequired: input.format === "short_sets" && input.scoreA === 14 && input.scoreB === 14,
    minContactsPerGender,
    message: violations.length === 0 ? "Reglas validas." : `${violations.length} violaciones.`,
  };
}

export type ArenaEvent = "MONSTER_BLOCK" | "SUPER_SPIKE" | "ACE_SIREN" | "VIDEO_CHALLENGE_SUSPENSE" | "SET_POINT_HEARTBEAT";

export function buildArenaCue(input: { event: ArenaEvent }): {
  event: ArenaEvent;
  frequenciesHz: number[];
  durationsMs: number[];
  waveform: "square" | "sawtooth" | "sine" | "triangle";
  visualBannerText: Record<"es" | "en" | "pt", string>;
  intensity: number;
  message: string;
} {
  const table: Record<ArenaEvent, { frequenciesHz: number[]; durationsMs: number[]; waveform: "square" | "sawtooth" | "sine" | "triangle"; visualBannerText: Record<"es" | "en" | "pt", string>; intensity: number }> = {
    MONSTER_BLOCK: { frequenciesHz: [110, 82, 55], durationsMs: [180, 180, 260], waveform: "square", visualBannerText: { es: "MURO TOTAL", en: "WALL OF STEEL", pt: "MURO TOTAL" }, intensity: 5 },
    SUPER_SPIKE: { frequenciesHz: [330, 440, 660], durationsMs: [120, 120, 200], waveform: "sawtooth", visualBannerText: { es: "REVISA EL TECHO", en: "CHECK THE ROOF", pt: "OLHA O TETO" }, intensity: 4 },
    ACE_SIREN: { frequenciesHz: [660, 880, 1320], durationsMs: [150, 150, 300], waveform: "sine", visualBannerText: { es: "ACE DIRECTO", en: "ACE INCOMING", pt: "ACE DIRETO" }, intensity: 4 },
    VIDEO_CHALLENGE_SUSPENSE: { frequenciesHz: [220, 220, 220], durationsMs: [220, 220, 440], waveform: "triangle", visualBannerText: { es: "OJO DE HALCON", en: "HAWK EYE REVIEW", pt: "OLHO DE FALCAO" }, intensity: 3 },
    SET_POINT_HEARTBEAT: { frequenciesHz: [60, 55, 60], durationsMs: [180, 120, 260], waveform: "sine", visualBannerText: { es: "BALON DE SET", en: "SET POINT", pt: "BOLA DE SET" }, intensity: 5 },
  };
  return { ...table[input.event], event: input.event, message: `Cue ${input.event}.` };
}

const SLANG_TERMS: Record<string, { translations: Record<string, string>; technicalMeaning: string; usageExample: string; relatedTerms: string[] }> = {
  mate: { translations: { AR: "mate", ES: "remate", MX: "mate", BR: "mate", US: "kill" }, technicalMeaning: "Remate que cierra el punto.", usageExample: "Que mate!", relatedTerms: ["remate", "ace"] },
  pase: { translations: { AR: "pase", ES: "pase", MX: "pase", BR: "passe", US: "pass" }, technicalMeaning: "Primer contacto al armador.", usageExample: "Pase perfecto.", relatedTerms: ["recepcion", "armador"] },
  remate: { translations: { AR: "remate", ES: "remate", MX: "remate", BR: "cortada", US: "spike" }, technicalMeaning: "Ataque aereo sobre la red.", usageExample: "Remate cruzado.", relatedTerms: ["mate", "bloqueo"] },
  bloqueo: { translations: { AR: "bloqueo", ES: "bloqueo", MX: "bloqueo", BR: "bloqueio", US: "block" }, technicalMeaning: "Defensa en la red.", usageExample: "Buen bloqueo.", relatedTerms: ["defensa", "tool"] },
  armador: { translations: { AR: "armador", ES: "colocador", MX: "armador", BR: "levantador", US: "setter" }, technicalMeaning: "Organiza el ataque.", usageExample: "El armador abrio la red.", relatedTerms: ["pase", "pipe"] },
  punta: { translations: { AR: "punta", ES: "receptor", MX: "punta", BR: "ponteiro", US: "outside hitter" }, technicalMeaning: "Atacante de zona 4.", usageExample: "El punta ataco la linea.", relatedTerms: ["remate", "pase"] },
  pipe: { translations: { AR: "pipe", ES: "pipe", MX: "pipe", BR: "pipe", US: "pipe" }, technicalMeaning: "Ataque de zaguero por zona 6.", usageExample: "Pipe en transicion.", relatedTerms: ["armador", "remate"] },
  tool: { translations: { AR: "mano afuera", ES: "mano y afuera", MX: "mano afuera", BR: "explorar bloqueio", US: "tool" }, technicalMeaning: "Usar el bloqueo para salir fuera.", usageExample: "Pidio el tool.", relatedTerms: ["remate", "bloqueo"] },
};

export function translateSlang(input: { term: string; origin: "AR" | "ES" | "MX" | "BR" | "US" }): {
  term: string;
  origin: string;
  translations: Record<string, string>;
  technicalMeaning: string;
  usageExample: string;
  relatedTerms: string[];
  message: string;
} {
  const entry = SLANG_TERMS[input.term.trim().toLowerCase()];
  if (!entry) throw new Error(`termino no soportado: ${input.term}`);
  return { term: input.term, origin: input.origin, ...entry, message: `${input.term} traducido AR/ES/MX/BR/US.` };
}

export async function buildQrSync(input: {
  kind: "match" | "rotation" | "player";
  payload: Record<string, string | number | boolean>;
  matrixSize: 21 | 29;
}): Promise<{
  token: string;
  signature: string;
  checksum: string;
  matrixSize: number;
  svg: string;
  byteLength: number;
  message: string;
}> {
  const keys = Object.keys(input.payload);
  if (keys.length > 30) throw new Error("payload exceeds 30 keys");
  const canonical = canonicalJson(input.payload as JsonValue);
  const signature = (await hmacSha256(canonical, INTEGRITY_SEAL_SECRET)).slice(0, 12);
  const checksum = await sha256(canonical);
  const token = btoa(`${canonical}|${signature}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const size = input.matrixSize;
  const seed = await sha256(`${canonical}|${signature}`);
  const cells: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const finder = (row < 7 && col < 7) || (row < 7 && col >= size - 7) || (row >= size - 7 && col < 7);
      const localRow = row < 7 ? row : row - (size - 7);
      const localCol = col < 7 ? col : col - (size - 7);
      const finderOn = finder && (localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6 || (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4));
      const bit = finderOn || (!finder && parseInt(seed[(row * size + col) % seed.length] ?? "0", 16) % 2 === 0);
      if (bit) cells.push(`<rect x="${16 + col * 8}" y="${16 + row * 8}" width="8" height="8"/>`);
    }
  }
  const pixels = size * 8 + 32;
  return {
    token,
    signature,
    checksum,
    matrixSize: size,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${pixels} ${pixels}" role="img"><title>VolleyOS QR sync</title><rect width="${pixels}" height="${pixels}" fill="#fff"/><g fill="#000">${cells.join("")}</g></svg>`,
    byteLength: token.length,
    message: `QR ${input.kind} ${size}x${size} firmado HMAC.`,
  };
}

/* --------------------------------------------------------------- module 51 */

export interface TelestrationPoint {
  x: number;
  y: number;
}

export interface TelestrationInput {
  frameWidth: number;
  frameHeight: number;
  strokes: TelestrationPoint[][];
  scaleCmPerPx?: number;
  takeoff?: TelestrationPoint;
  apex?: TelestrationPoint;
}

export interface TelestrationReport {
  strokeCount: number;
  totalLengthPx: number;
  totalLengthCm: number;
  meanAngleDeg: number;
  maxAngleDeg: number;
  jumpHeightCm: number | null;
  metrics: Array<{ index: number; lengthPx: number; lengthCm: number; angleDeg: number }>;
  warnings: string[];
  message: string;
}

export function analyzeTelestration(input: TelestrationInput): TelestrationReport {
  const scale = input.scaleCmPerPx ?? 0.5;
  if (input.frameWidth <= 0 || input.frameHeight <= 0) throw new Error("frame dimensions must be positive");
  if (input.strokes.length === 0) throw new Error("at least one stroke is required");
  const warnings: string[] = [];
  const metrics = input.strokes.map((points, index) => {
    if (points.length < 2) throw new Error("a stroke needs two points");
    for (const point of points) {
      if (point.x < 0 || point.y < 0 || point.x > input.frameWidth || point.y > input.frameHeight) {
        throw new Error("stroke point outside the video frame");
      }
    }
    let lengthPx = 0;
    let angleSum = 0;
    for (let part = 0; part < points.length - 1; part += 1) {
      const start = points[part] as TelestrationPoint;
      const end = points[part + 1] as TelestrationPoint;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      lengthPx += Math.hypot(dx, dy);
      angleSum += (Math.atan2(Math.abs(dy), dx) * 180) / Math.PI;
    }
    if (lengthPx === 0) warnings.push(`Trazado ${index + 1} sin desplazamiento.`);
    return {
      index,
      lengthPx: round2(lengthPx),
      lengthCm: round2(lengthPx * scale),
      angleDeg: round2(angleSum / (points.length - 1)),
    };
  });
  let jumpHeightCm: number | null = null;
  if (input.takeoff && input.apex) {
    if (input.apex.y > input.takeoff.y) throw new Error("apex must be above takeoff in video coordinates");
    jumpHeightCm = round2((input.takeoff.y - input.apex.y) * scale);
  }
  const totalLengthPx = round2(metrics.reduce((sum, metric) => sum + metric.lengthPx, 0));
  return {
    strokeCount: metrics.length,
    totalLengthPx,
    totalLengthCm: round2(metrics.reduce((sum, metric) => sum + metric.lengthCm, 0)),
    meanAngleDeg: round2(metrics.reduce((sum, metric) => sum + metric.angleDeg, 0) / metrics.length),
    maxAngleDeg: Math.max(...metrics.map((metric) => metric.angleDeg)),
    jumpHeightCm,
    metrics,
    warnings,
    message: `${metrics.length} trazados y ${round2(totalLengthPx * scale)} cm analizados sin subir el video.`,
  };
}

/* --------------------------------------------------------------- module 52 */

export type PlaybookPhaseName = "serve" | "transition" | "attack";

export interface PlaybookPlayer {
  number: number;
  x: number;
  y: number;
}

export interface PlaybookPhaseInput {
  phase: PlaybookPhaseName;
  durationMs: number;
  targetZone: number;
  players: PlaybookPlayer[];
}

export interface PlaybookReport {
  totalDurationMs: number;
  keyframes: number;
  phases: Array<{
    order: number;
    phase: PlaybookPhaseName;
    startMs: number;
    endMs: number;
    targetZone: number;
    vectors: Array<{ number: number; dx: number; dy: number; distance: number }>;
  }>;
  message: string;
}

export function buildPlaybookAnimation(phases: PlaybookPhaseInput[]): PlaybookReport {
  const order = phases.map((phase) => phase.phase).join(",");
  if (order !== "serve,transition,attack") throw new Error("phases must be serve, transition and attack in order");
  let cursor = 0;
  let previous: Map<number, PlaybookPlayer> | null = null;
  const frames = phases.map((phase, index) => {
    if (phase.durationMs <= 0) throw new Error("phase duration must be positive");
    if (phase.targetZone < 1 || phase.targetZone > 9) throw new Error("target zone must be 1-9");
    const seen = new Set<number>();
    for (const player of phase.players) {
      if (seen.has(player.number)) throw new Error(`duplicate player #${player.number} in ${phase.phase}`);
      seen.add(player.number);
      if (player.x < 0 || player.x > 100 || player.y < 0 || player.y > 100) throw new Error("player outside court");
    }
    const vectors = previous
      ? phase.players.flatMap((player) => {
          const before = previous?.get(player.number);
          if (!before) return [];
          const dx = round2(player.x - before.x);
          const dy = round2(player.y - before.y);
          return [{ number: player.number, dx, dy, distance: round2(Math.hypot(dx, dy)) }];
        })
      : [];
    const frame = {
      order: index + 1,
      phase: phase.phase,
      startMs: cursor,
      endMs: cursor + phase.durationMs,
      targetZone: phase.targetZone,
      vectors,
    };
    cursor += phase.durationMs;
    previous = new Map(phase.players.map((player) => [player.number, player]));
    return frame;
  });
  return {
    totalDurationMs: cursor,
    keyframes: phases.reduce((sum, phase) => sum + phase.players.length, 0),
    phases: frames,
    message: `Jugada de ${cursor} ms en 3 fases lista para reproducir sin conexion.`,
  };
}

/* --------------------------------------------------------------- module 53 */

export type ShotResult = "kill" | "error" | "blocked" | "in_play";

export interface ShotHeatmapInput {
  shots: Array<{ x: number; y: number; result?: ShotResult }>;
}

export interface ShotHeatmapReport {
  total: number;
  kills: number;
  errors: number;
  blocked: number;
  efficiencyPct: number;
  hotZone: number;
  cells: Array<{ zone: number; count: number; sharePct: number }>;
  message: string;
}

export function buildShotHeatmap(input: ShotHeatmapInput): ShotHeatmapReport {
  if (input.shots.length === 0) throw new Error("at least one shot is required");
  const counts = Array.from({ length: 9 }, () => 0);
  for (const shot of input.shots) {
    if (shot.x < 0 || shot.x > 100 || shot.y < 0 || shot.y > 100) throw new Error("shot outside court");
    const zone = Math.min(2, Math.floor((shot.y * 3) / 100)) * 3 + Math.min(2, Math.floor((shot.x * 3) / 100)) + 1;
    counts[zone - 1] = (counts[zone - 1] ?? 0) + 1;
  }
  const total = input.shots.length;
  const kills = input.shots.filter((shot) => (shot.result ?? "kill") === "kill").length;
  const errors = input.shots.filter((shot) => shot.result === "error").length;
  const blocked = input.shots.filter((shot) => shot.result === "blocked").length;
  let hotZone = 1;
  for (let zone = 2; zone <= 9; zone += 1) {
    if ((counts[zone - 1] ?? 0) > (counts[hotZone - 1] ?? 0)) hotZone = zone;
  }
  return {
    total,
    kills,
    errors,
    blocked,
    efficiencyPct: round2(((kills - errors - blocked) * 100) / total),
    hotZone,
    cells: counts.map((count, index) => ({ zone: index + 1, count, sharePct: round2((count * 100) / total) })),
    message: `Zona caliente ${hotZone} con ${counts[hotZone - 1]} de ${total} remates.`,
  };
}

/* --------------------------------------------------------------- modules 54-60 */

export interface NutritionInput {
  weightKg: number;
  matches?: number;
  minutesPerMatch?: number;
  tempC?: number;
  sweatRateLh?: number;
}

export interface NutritionReport {
  carbsG: number;
  fluidMl: number;
  sodiumMg: number;
  carbsPerHour: number;
  fluidPerHourMl: number;
  heatNote: string;
  message: string;
}

export function planMatchNutrition(input: NutritionInput): NutritionReport {
  if (!(input.weightKg > 0 && input.weightKg <= 200)) throw new Error("weight must be 0-200 kg");
  const matches = (input.matches ?? 1) | 0;
  const minutesPerMatch = input.minutesPerMatch ?? 90;
  const tempC = input.tempC ?? 24;
  const sweatRateLh = input.sweatRateLh ?? 0.8;
  if (matches < 1 || matches > 6) throw new Error("matches must be 1-6");
  if (minutesPerMatch < 10 || minutesPerMatch > 300) throw new Error("minutes must be 10-300");
  if (!(sweatRateLh > 0 && sweatRateLh <= 3)) throw new Error("sweat rate must be 0-3 L/h");
  const totalMinutes = minutesPerMatch * matches;
  const carbsG = round2(input.weightKg * 1.2 * matches);
  const fluidMl = round2((sweatRateLh * totalMinutes) / 60 * 1000 + 500 * matches);
  const hours = Math.max(1 / 60, totalMinutes / 60);
  const heatNote = tempC >= 30 ? "Calor alto: suma 300 ml y electrolitos." : "Clima templado: plan base.";
  return {
    carbsG,
    fluidMl,
    sodiumMg: round2((fluidMl / 1000) * 500),
    carbsPerHour: round2(carbsG / hours),
    fluidPerHourMl: round2(fluidMl / hours),
    heatNote,
    message: `${matches} partidos: ${carbsG} g de carbohidratos y ${fluidMl} ml de liquido.`,
  };
}

export interface PrehabInput {
  weeklyJumps: number;
  weeklySpikes: number;
  sleepHours: number;
  kneePain?: number;
  shoulderPain?: number;
  priorInjury?: boolean;
}

export interface PrehabReport {
  riskScore: number;
  risk: string;
  jumpLimit: number;
  drills: string[];
  message: string;
}

export function assessPrehab(input: PrehabInput): PrehabReport {
  if (input.weeklyJumps < 0 || input.weeklyJumps > 1000) throw new Error("jumps must be 0-1000");
  if (input.weeklySpikes < 0 || input.weeklySpikes > 1500) throw new Error("spikes must be 0-1500");
  if (input.sleepHours < 0 || input.sleepHours > 14) throw new Error("sleep must be 0-14 h");
  const kneePain = input.kneePain ?? 0;
  const shoulderPain = input.shoulderPain ?? 0;
  if (kneePain < 0 || kneePain > 10 || shoulderPain < 0 || shoulderPain > 10) throw new Error("pain must be 0-10");
  let score = 100;
  if (input.weeklyJumps > 300) score -= Math.min(25, Math.floor((input.weeklyJumps - 300) / 10));
  if (input.weeklySpikes > 150) score -= Math.min(20, Math.floor((input.weeklySpikes - 150) / 15));
  if (input.sleepHours < 7) score -= round2((7 - input.sleepHours) * 4);
  score -= kneePain * 6 + shoulderPain * 6;
  if (input.priorInjury) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const drills = ["Movilidad de tobillo y cadera", "Face pull y rotadores externos"];
  if (kneePain >= 3) drills.push("Isometrico de cuadriceps y control de aterrizaje");
  if (shoulderPain >= 3) drills.push("Scapular push-up y sleeper stretch");
  const risk = score >= 80 ? "BAJO" : score >= 55 ? "MEDIO" : "ALTO";
  const jumpLimit = Math.max(0, 350 - Math.floor(input.weeklyJumps / 20));
  return { riskScore: round2(score), risk, jumpLimit, drills, message: `Riesgo ${risk}: score ${round2(score)}/100. Limite sugerido ${jumpLimit} saltos.` };
}

export interface TiebreakInput {
  scoreA: number;
  scoreB: number;
  serving: Side;
  bestOf?: 3 | 5;
  goldenPoint?: boolean;
}

export interface TiebreakReport {
  target: number;
  phase: string;
  matchPoint: boolean;
  sideSwitchDue: boolean;
  recommendation: string;
  message: string;
}

export function commandTiebreak(input: TiebreakInput): TiebreakReport {
  const bestOf = input.bestOf ?? 3;
  if (bestOf !== 3 && bestOf !== 5) throw new Error("best_of must be 3 or 5");
  const { scoreA, scoreB, serving } = input;
  if (scoreA < 0 || scoreA > 99 || scoreB < 0 || scoreB > 99) throw new Error("scores must be 0-99");
  const tied = scoreA === scoreB;
  const phase = tied && scoreA >= 14 && (input.goldenPoint ?? false) ? "golden_point" : "normal";
  const target = 15;
  const own = serving === "A" ? scoreA : scoreB;
  const rival = serving === "A" ? scoreB : scoreA;
  const matchPoint = own >= target - 1 && own > rival;
  const sideSwitchDue = scoreA + scoreB === 8;
  const recommendation =
    phase === "golden_point"
      ? `Punto de oro: saque agresivo de ${serving} y bloqueo 1-1.`
      : matchPoint
        ? `Match point ${serving}: saque al mejor receptor y cobertura lista.`
        : "Jugar saque seguro, cerrar con pipe y defender la diagonal.";
  return { target, phase, matchPoint, sideSwitchDue, recommendation, message: `${scoreA}-${scoreB} desde 15, fase ${phase}.` };
}

export interface BracketInput {
  teams: string[];
}

export interface BracketMatch {
  slot: number;
  home: string | null;
  away: string | null;
  bye: boolean;
}

export interface BracketReport {
  bracketSize: number;
  byes: number;
  rounds: Array<{ name: string; matches: BracketMatch[] }>;
  message: string;
}

export function buildBracket(input: BracketInput): BracketReport {
  const teams = input.teams.map((team) => team.trim());
  if (teams.length < 4 || teams.length > 32) throw new Error("brackets need 4 to 32 teams");
  if (teams.some((team) => team.length === 0)) throw new Error("team names cannot be blank");
  if (new Set(teams).size !== teams.length) throw new Error("team names must be unique");
  let size = 4;
  while (size < teams.length) size *= 2;
  const byes = size - teams.length;
  const first: BracketMatch[] = [];
  for (let index = 0; index < size / 2; index += 1) {
    const awayIndex = size - 1 - index;
    const home = index < teams.length ? teams[index]! : null;
    const away = awayIndex < teams.length ? teams[awayIndex]! : null;
    first.push({ slot: index + 1, home, away, bye: home === null || away === null });
  }
  const rounds: Array<{ name: string; matches: BracketMatch[] }> = [{ name: "R1", matches: first }];
  let remaining = size / 2;
  let roundIndex = 2;
  while (remaining > 1) {
    const matches: BracketMatch[] = [];
    for (let slot = 0; slot < remaining / 2; slot += 1) {
      matches.push({ slot: slot + 1, home: null, away: null, bye: false });
    }
    rounds.push({ name: `R${roundIndex}`, matches });
    remaining /= 2;
    roundIndex += 1;
  }
  return { bracketSize: size, byes, rounds, message: `Llave de ${size} con ${byes} byes y ${rounds.length} rondas.` };
}

export interface SponsorInput {
  impressions: number;
  reach: number;
  cpm: number;
  engagementPct?: number;
  currency?: string;
}

export interface SponsorReport {
  value: number;
  effectiveCpm: number;
  engagementValue: number;
  tier: string;
  message: string;
}

export function buildSponsorDeck(input: SponsorInput): SponsorReport {
  if (input.impressions < 0 || input.reach < 0 || input.cpm < 0) throw new Error("values must be non negative");
  const engagementPct = input.engagementPct ?? 0;
  if (engagementPct < 0 || engagementPct > 100) throw new Error("engagement must be 0-100%");
  const value = round2((input.impressions / 1000) * input.cpm);
  const effectiveCpm = input.reach > 0 ? round2(value / (input.reach / 1000)) : 0;
  const engagementValue = round2((value * engagementPct) / 100);
  const tier = value >= 1000 ? "ORO" : value >= 400 ? "PLATA" : "BRONCE";
  const currency = input.currency ?? "USD";
  return { value, effectiveCpm, engagementValue, tier, message: `Deck ${tier}: ${currency} ${value} por ${input.impressions} impresiones.` };
}

export interface HeadToHeadInput {
  teamA: string;
  teamB: string;
  matches: Array<{ setsA: number; setsB: number }>;
}

export interface HeadToHeadReport {
  winsA: number;
  winsB: number;
  setsA: number;
  setsB: number;
  leader: string;
  streak: string;
  message: string;
}

export function buildHeadToHead(input: HeadToHeadInput): HeadToHeadReport {
  if (input.teamA.trim().length === 0 || input.teamB.trim().length === 0) throw new Error("both team names are required");
  if (input.matches.length === 0) throw new Error("at least one match is required");
  for (const match of input.matches) {
    if (match.setsA < 0 || match.setsA > 5 || match.setsB < 0 || match.setsB > 5) throw new Error("sets must be 0-5");
  }
  const winsA = input.matches.filter((match) => match.setsA > match.setsB).length;
  const winsB = input.matches.filter((match) => match.setsB > match.setsA).length;
  const setsA = input.matches.reduce((sum, match) => sum + match.setsA, 0);
  const setsB = input.matches.reduce((sum, match) => sum + match.setsB, 0);
  const leader = winsA >= winsB ? input.teamA : input.teamB;
  const last = input.matches[input.matches.length - 1]!;
  const streakTeam = last.setsA > last.setsB ? input.teamA : input.teamB;
  let streak = 1;
  for (let index = input.matches.length - 2; index >= 0; index -= 1) {
    const match = input.matches[index]!;
    const winner = match.setsA > match.setsB ? input.teamA : input.teamB;
    if (winner !== streakTeam) break;
    streak += 1;
  }
  return {
    winsA,
    winsB,
    setsA,
    setsB,
    leader,
    streak: `${streakTeam} x${streak}`,
    message: `${leader} lidera ${Math.max(winsA, winsB)}-${Math.min(winsA, winsB)} en ${input.matches.length} partidos.`,
  };
}

export interface ReflexInput {
  timesMs: number[];
}

export interface ReflexReport {
  meanMs: number;
  bestMs: number;
  spreadMs: number;
  consistencyPct: number;
  rating: string;
  message: string;
}

export function scoreReflex(input: ReflexInput): ReflexReport {
  if (input.timesMs.length === 0 || input.timesMs.length > 50) throw new Error("1 to 50 reaction times");
  for (const value of input.timesMs) {
    if (value < 80 || value > 1200) throw new Error("reaction times must be between 80 and 1200 ms");
  }
  const mean = input.timesMs.reduce((sum, value) => sum + value, 0) / input.timesMs.length;
  const spread = Math.max(...input.timesMs) - Math.min(...input.timesMs);
  const consistency = Math.max(0, Math.min(100, 100 - (spread * 100) / mean));
  const rating = mean <= 220 && consistency >= 85 ? "ELITE" : mean <= 280 ? "ALTO" : "MEDIO";
  return {
    meanMs: round2(mean),
    bestMs: Math.min(...input.timesMs),
    spreadMs: spread,
    consistencyPct: round2(consistency),
    rating,
    message: `${input.timesMs.length} tests: ${round2(mean)} ms y consistencia ${round2(consistency)}%.`,
  };
}

export interface WhiteLabelInput {
  club: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface WhiteLabelReport {
  club: string;
  cssVars: Record<string, string>;
  textOnPrimary: string;
  readable: boolean;
  message: string;
}

function hexBrightness(color: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("colors must be #rrggbb");
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000;
}

export function buildWhiteLabel(input: WhiteLabelInput): WhiteLabelReport {
  const club = input.club.trim();
  if (club.length < 2 || club.length > 40) throw new Error("club name must be 2-40 characters");
  for (const color of [input.primary, input.secondary, input.accent]) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("colors must be #rrggbb");
  }
  const brightness = hexBrightness(input.primary);
  const textOnPrimary = brightness >= 140 ? "#070709" : "#f7f6f4";
  const readable = brightness >= 140 || brightness <= 80;
  const quality = readable ? "valido" : "ajustable";
  return {
    club,
    cssVars: {
      "--club-primary": input.primary,
      "--club-secondary": input.secondary,
      "--club-accent": input.accent,
      "--club-text": textOnPrimary,
    },
    textOnPrimary,
    readable,
    message: `Tema de ${club} listo con contraste ${quality}.`,
  };
}

export interface GymScreenPayload {
  title?: string;
  scoreA?: number;
  scoreB?: number;
  setA?: number;
  setB?: number;
  serving?: Side;
  timer?: string;
  setter?: string;
}

export interface GymScreenPayloadReport {
  title: string;
  scoreA: number;
  scoreB: number;
  setA: number;
  setB: number;
  serving: Side;
  timer: string;
  setter: string;
  fullScreen: boolean;
  message: string;
}

export function buildGymScreenPayload(input: GymScreenPayload): GymScreenPayloadReport {
  const title = input.title ?? "Gym Scoreboard";
  const scoreA = input.scoreA ?? 0;
  const scoreB = input.scoreB ?? 0;
  const setA = input.setA ?? 0;
  const setB = input.setB ?? 0;
  const serving = input.serving ?? "A";
  const timer = input.timer ?? "00:00";
  const setter = input.setter ?? "";
  if (scoreA < 0 || scoreA > 99 || scoreB < 0 || scoreB > 99) throw new Error("scores must be 0-99");
  if (setA < 0 || setA > 3 || setB < 0 || setB > 3) throw new Error("sets must be 0-3");
  if (timer.split(":").length !== 2) throw new Error("timer must be mm:ss");
  return {
    title,
    scoreA,
    scoreB,
    setA,
    setB,
    serving,
    timer,
    setter,
    fullScreen: true,
    message: `${title}: ${scoreA}-${scoreB} set ${setA}-${setB}.`,
  };
}

