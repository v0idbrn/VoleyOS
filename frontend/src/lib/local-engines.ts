/**
 * Offline-first TypeScript mirror of the 12 VolleyOS Python engines.
 * Runs in the browser with zero network and zero telemetry.
 */

export type Locale = "es" | "en" | "pt";
export type Profile = "players" | "coaches" | "court" | "tournaments";
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
}

export interface PointResult {
  state: ScoreboardState;
  rotated: boolean;
  setFinished: boolean;
  matchFinished: boolean;
  sideSwitchDue: boolean;
  message: string;
}

export function newScoreboard(teamA = "Tiburones", teamB = "Cóndores", bestOf = 3): ScoreboardState {
  return {
    teamA,
    teamB,
    bestOf,
    setNumber: 1,
    scoreA: 0,
    scoreB: 0,
    setsA: 0,
    setsB: 0,
    serving: "A",
    firstServing: "A",
    lineupA: [1, 2, 3, 4, 5, 6],
    lineupB: [7, 8, 9, 10, 11, 12],
    streak: 1,
    status: "live",
    winner: null,
  };
}

export function rotateLineup(lineup: number[]): number[] {
  return [lineup[1] as number, lineup[2] as number, lineup[3] as number, lineup[4] as number, lineup[5] as number, lineup[0] as number];
}

export function awardIndoorPoint(state: ScoreboardState, team: Side): PointResult {
  if (state.status !== "live") throw new Error("match is not live");
  const next: ScoreboardState = structuredClone(state);
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

  const decider = next.setNumber === next.bestOf;
  const target = decider ? 15 : 25;
  const own = team === "A" ? next.scoreA : next.scoreB;
  const rival = team === "A" ? next.scoreB : next.scoreA;
  const setFinished = own >= target && own - rival >= 2;
  let matchFinished = false;
  let message = `Punto ${team} — ${next.scoreA}-${next.scoreB}`;

  if (setFinished) {
    if (team === "A") next.setsA += 1;
    else next.setsB += 1;
    matchFinished = next.setsA > Math.floor(next.bestOf / 2) || next.setsB > Math.floor(next.bestOf / 2);
    if (matchFinished) {
      next.status = "finished";
      next.winner = team;
      message = `Partido para ${team} (${next.setsA}-${next.setsB}).`;
    } else {
      next.setNumber += 1;
      next.scoreA = 0;
      next.scoreB = 0;
      next.firstServing = next.firstServing === "A" ? "B" : "A";
      next.serving = next.firstServing;
      next.streak = 1;
      message = `Set para ${team}. Nuevo set ${next.setNumber}.`;
    }
  }
  const sideSwitchDue = decider && !setFinished && next.scoreA + next.scoreB === 8;
  return { state: next, rotated: sideOut, setFinished, matchFinished, sideSwitchDue, message };
}

/* ---------------------------------------------------------------- module 5 */

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

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}
