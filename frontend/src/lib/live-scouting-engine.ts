import { atomicLoad, atomicSave } from "@/lib/security-shield";
import { round2, type Locale, type Side } from "@/lib/local-engines";
import { t } from "@/lib/i18n";

/* ------------------------------------------------------------------ v10.0.0
 * Live micro-scouting engine — the "Athlete's Edge" desk coach that sits on
 * top of the ⏱️ Cancha scoreboard.
 *
 *  K1 (Side-Out %):  rallies received (opponent serving) converted into a point.
 *  K2 (Break-Point %): rallies on own serve held for the point.
 *  Attack efficiency: (Kills - Errors) / Total Attempts (DataVolley style).
 *  Bleeding alert: a rotation whose K1 drops under 35% after 3+ attempts, or
 *  that concedes a run of 3+ straight points.
 *
 * The engine is pure: the ScoreboardStation feeds it one record per scored
 * point and everything else (box score, alert, heatmap coordinates) derives
 * from the recorded events. Points and tags undo/redo together with the
 * scoreboard history.
 * -------------------------------------------------------------------------- */

const SESSION_KEY = "voleyos_live_scout_session_v1";
const SHOTS_KEY = "voleyos_live_scout_shots_v1";
const SESSION_VERSION = 1 as const;

export const SCOUT_ACTIONS = ["attack", "block", "ace", "set", "error"] as const;
export type ScoutAction = (typeof SCOUT_ACTIONS)[number];

export interface ScoutTag {
  action: ScoutAction;
  originZone: number | null;
  targetZone: number | null;
  scorer: string | null;
}

export interface ScoutEvent {
  id: number;
  setNumber: number;
  scoredBy: Side;
  servingBefore: Side;
  sideOut: boolean;
  rotationA: number;
  rotationB: number;
  tag: ScoutTag | null;
}

export interface ScoutSession {
  v: typeof SESSION_VERSION;
  nextId: number;
  events: ScoutEvent[];
  undone: ScoutEvent[];
}

/** Zone-preset taps of the 1-tap tagger: origin/target live on our/opponent court. */
export interface ZonePreset {
  id: "z4z5" | "z2z1" | "z3short" | "pipez6";
  originZone: number;
  targetZone: number;
}

export const ZONE_PRESETS: ZonePreset[] = [
  { id: "z4z5", originZone: 4, targetZone: 5 },
  { id: "z2z1", originZone: 2, targetZone: 1 },
  { id: "z3short", originZone: 3, targetZone: 3 },
  { id: "pipez6", originZone: 6, targetZone: 6 },
];

export function newScoutSession(): ScoutSession {
  return { v: SESSION_VERSION, nextId: 1, events: [], undone: [] };
}

function isSide(value: unknown): value is Side {
  return value === "A" || value === "B";
}

function isScoutTag(value: unknown): value is ScoutTag {
  if (typeof value !== "object" || value === null) return false;
  const tag = value as Partial<ScoutTag>;
  if (typeof tag.action !== "string" || !(SCOUT_ACTIONS as readonly string[]).includes(tag.action)) {
    return false;
  }
  const zoneOk = (zone: unknown): boolean => zone === null || (typeof zone === "number" && zone >= 1 && zone <= 9);
  return zoneOk(tag.originZone) && zoneOk(tag.targetZone) && (tag.scorer === null || typeof tag.scorer === "string");
}

function isScoutEvent(value: unknown): value is ScoutEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<ScoutEvent>;
  if (typeof event.id !== "number" || typeof event.setNumber !== "number") return false;
  if (!isSide(event.scoredBy) || !isSide(event.servingBefore)) return false;
  if (typeof event.sideOut !== "boolean") return false;
  if (typeof event.rotationA !== "number" || typeof event.rotationB !== "number") return false;
  if (event.tag !== null && !isScoutTag(event.tag)) return false;
  return true;
}

/** Deterministic ingestion: unknown/corrupt fields are dropped, never trusted. */
function coerceSession(value: unknown): ScoutSession {
  const fallback = newScoutSession();
  if (typeof value !== "object" || value === null) return fallback;
  const raw = value as Partial<ScoutSession>;
  if (!Array.isArray(raw.events)) return fallback;
  const events = raw.events.filter(isScoutEvent);
  const undone = Array.isArray(raw.undone) ? raw.undone.filter(isScoutEvent) : [];
  const maxId = events.reduce((max, event) => Math.max(max, event.id), 0);
  return {
    v: SESSION_VERSION,
    nextId: typeof raw.nextId === "number" && raw.nextId > maxId ? raw.nextId : maxId + 1,
    events,
    undone,
  };
}

export function loadScoutSession(): ScoutSession {
  return coerceSession(atomicLoad<unknown>(SESSION_KEY, null));
}

export function saveScoutSession(session: ScoutSession): void {
  atomicSave(SESSION_KEY, session);
}

export function clearScoutSession(): void {
  atomicSave(SESSION_KEY, newScoutSession());
}

export interface ScoutPointInput {
  setNumber: number;
  scoredBy: Side;
  servingBefore: Side;
  sideOut: boolean;
  rotationA: number;
  rotationB: number;
}

/** Records one scored point. Call after every `awardIndoorPoint` commit. */
export function recordScoutPoint(session: ScoutSession, input: ScoutPointInput): ScoutSession {
  const event: ScoutEvent = { id: session.nextId, tag: null, ...input };
  return {
    ...session,
    v: SESSION_VERSION,
    nextId: session.nextId + 1,
    events: [...session.events, event],
    undone: [],
  };
}

/** Pops the last point(s) so scouting stays in lockstep with the undo pill. */
export function undoScoutPoint(session: ScoutSession, count = 1): ScoutSession {
  let events = [...session.events];
  const moved: ScoutEvent[] = [];
  for (let index = 0; index < count && events.length > 0; index += 1) {
    const event = events.pop();
    if (event) moved.push(event);
  }
  if (moved.length === 0) return session;
  return { ...session, events, undone: [...moved.reverse(), ...session.undone] };
}

export function redoScoutPoint(session: ScoutSession, count = 1): ScoutSession {
  let undone = [...session.undone];
  const moved: ScoutEvent[] = [];
  for (let index = 0; index < count && undone.length > 0; index += 1) {
    const event = undone.shift();
    if (event) moved.push(event);
  }
  if (moved.length === 0) return session;
  return { ...session, events: [...session.events, ...moved], undone };
}

export function resetScoutSession(): ScoutSession {
  return newScoutSession();
}

function lastEvent(session: ScoutSession): ScoutEvent | null {
  return session.events.length > 0 ? (session.events[session.events.length - 1] as ScoutEvent) : null;
}

/** Replaces the tag of the point just scored (1-tap: action alone is a full tag). */
export function tagLastScoutPoint(session: ScoutSession, tag: ScoutTag): ScoutSession {
  const event = lastEvent(session);
  if (!event) return session;
  const events = [...session.events];
  events[events.length - 1] = { ...event, tag };
  return { ...session, events };
}

/** Merges zone/scorer chips into the existing tag of the last point. */
export function amendLastScoutTag(session: ScoutSession, patch: Partial<ScoutTag>): ScoutSession {
  const event = lastEvent(session);
  if (!event || !event.tag) return session;
  const events = [...session.events];
  events[events.length - 1] = { ...event, tag: { ...event.tag, ...patch } };
  return { ...session, events };
}

/* -------------------------------------------------------------- box score */

export interface RotationStats {
  /** 1..6 per rotation, 0 for the whole-match total. */
  rotation: number;
  sideOutAttempts: number;
  sideOutWins: number;
  breakAttempts: number;
  breakWins: number;
  k1Pct: number;
  k2Pct: number;
  attempts: number;
  kills: number;
  errors: number;
  efficiency: number;
  aces: number;
  blocks: number;
}

function emptyRow(rotation: number): RotationStats {
  return {
    rotation,
    sideOutAttempts: 0,
    sideOutWins: 0,
    breakAttempts: 0,
    breakWins: 0,
    k1Pct: 0,
    k2Pct: 0,
    attempts: 0,
    kills: 0,
    errors: 0,
    efficiency: 0,
    aces: 0,
    blocks: 0,
  };
}

function accumulate(row: RotationStats, event: ScoutEvent, side: Side): void {
  const receiving = event.servingBefore !== side;
  if (receiving) {
    row.sideOutAttempts += 1;
    if (event.scoredBy === side) row.sideOutWins += 1;
  } else {
    row.breakAttempts += 1;
    if (event.scoredBy === side) row.breakWins += 1;
  }
  const tag = event.tag;
  if (!tag) return;
  const attacker = event.scoredBy;
  if ((tag.action === "attack" || tag.action === "set") && attacker === side) {
    row.attempts += 1;
    row.kills += 1;
  }
  if (tag.action === "error" && attacker !== side) {
    row.attempts += 1;
    row.errors += 1;
  }
  if (tag.action === "ace" && attacker === side) row.aces += 1;
  if (tag.action === "block" && attacker === side) row.blocks += 1;
}

function finalize(row: RotationStats): RotationStats {
  row.k1Pct = row.sideOutAttempts > 0 ? round2((row.sideOutWins * 100) / row.sideOutAttempts) : 0;
  row.k2Pct = row.breakAttempts > 0 ? round2((row.breakWins * 100) / row.breakAttempts) : 0;
  row.efficiency = row.attempts > 0 ? round2((row.kills - row.errors) / row.attempts) : 0;
  return row;
}

/** K1 / K2 / efficiency rows for R1–R6 of one team. */
export function rotationStats(session: ScoutSession, side: Side): RotationStats[] {
  const rows = Array.from({ length: 6 }, (_, index) => emptyRow(index + 1));
  for (const event of session.events) {
    const rotation = side === "A" ? event.rotationA : event.rotationB;
    const row = rows[rotation - 1];
    if (row) accumulate(row, event, side);
  }
  return rows.map(finalize);
}

/** Whole-match totals (rotation 0 row) for one team. */
export function totalStats(session: ScoutSession, side: Side): RotationStats {
  const row = emptyRow(0);
  for (const event of session.events) accumulate(row, event, side);
  return finalize(row);
}

/* ------------------------------------------------------- tactical alerts */

export type BleedingReason = "k1" | "run";

export interface BleedingAlert {
  side: Side;
  rotation: number;
  reason: BleedingReason;
  k1Wins: number;
  k1Attempts: number;
  k1Pct: number;
  coverZone: number;
  run: number;
}

export const K1_BLEED_THRESHOLD = 35;
export const K1_MIN_ATTEMPTS = 3;
export const RUN_BLEED_THRESHOLD = 3;

/** Heuristic fallback cover zone per rotation when nothing is tagged yet. */
const COVER_FALLBACK: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 1, 5: 2, 6: 3 };

function modeZone(events: ScoutEvent[], side: Side): number | null {
  const counts = new Map<number, number>();
  for (const event of events) {
    if (event.scoredBy === side) continue;
    const zone = event.tag?.targetZone;
    if (zone === null || zone === undefined) continue;
    counts.set(zone, (counts.get(zone) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [zone, count] of counts) {
    if (count > bestCount) {
      best = zone;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Finds the rotation of `side` that is bleeding: K1 under 35% with at least
 * 3 attempts, or a run of 3+ straight points conceded. Returns null when the
 * team is healthy. Priority goes to the K1 failure (worst percentage first).
 */
export function bleedingRotation(session: ScoutSession, side: Side = "A"): BleedingAlert | null {
  const rows = rotationStats(session, side).filter(
    (row) => row.sideOutAttempts >= K1_MIN_ATTEMPTS && row.k1Pct < K1_BLEED_THRESHOLD,
  );
  let k1Alert: BleedingAlert | null = null;
  for (const row of rows) {
    const worse = !k1Alert || row.k1Pct < k1Alert.k1Pct || (row.k1Pct === k1Alert.k1Pct && row.sideOutAttempts > k1Alert.k1Attempts);
    if (worse) {
      k1Alert = {
        side,
        rotation: row.rotation,
        reason: "k1",
        k1Wins: row.sideOutWins,
        k1Attempts: row.sideOutAttempts,
        k1Pct: row.k1Pct,
        coverZone: modeZone(session.events, side) ?? COVER_FALLBACK[row.rotation] ?? 5,
        run: 0,
      };
    }
  }
  if (k1Alert) return k1Alert;

  // Runs: consecutive points conceded inside one rotation tenure. A rotation
  // only changes when this side scores, so a run never spans two rotations.
  const openRun = new Map<number, number>();
  const maxRun = new Map<number, number>();
  for (const event of session.events) {
    const rotation = side === "A" ? event.rotationA : event.rotationB;
    if (event.scoredBy === side) {
      openRun.set(rotation, 0);
      continue;
    }
    const run = (openRun.get(rotation) ?? 0) + 1;
    openRun.set(rotation, run);
    maxRun.set(rotation, Math.max(maxRun.get(rotation) ?? 0, run));
  }
  let runAlert: BleedingAlert | null = null;
  for (const [rotation, run] of maxRun) {
    if (run < RUN_BLEED_THRESHOLD) continue;
    if (!runAlert || run > runAlert.run || (run === runAlert.run && rotation < runAlert.rotation)) {
      runAlert = {
        side,
        rotation,
        reason: "run",
        k1Wins: 0,
        k1Attempts: 0,
        k1Pct: 0,
        coverZone: modeZone(session.events, side) ?? COVER_FALLBACK[rotation] ?? 5,
        run,
      };
    }
  }
  return runAlert;
}

export function bleedingAlertMessage(alert: BleedingAlert, locale: Locale): string {
  const zone = alert.coverZone;
  if (alert.reason === "run") {
    return t(
      locale,
      `🧠 Alerta Táctica: Rotación R${alert.rotation} sangrando (${alert.run} puntos en contra seguidos). Sugerencia: Cubrir Z${zone} o pedir tiempo muerto.`,
      `🧠 Tactical alert: Rotation R${alert.rotation} bleeding (${alert.run} straight points against). Suggestion: Cover Z${zone} or call a timeout.`,
      `🧠 Alerta Tático: Rotação R${alert.rotation} sangrando (${alert.run} pontos seguidos contra). Sugestão: Cobrir Z${zone} ou pedir tempo.`,
    );
  }
  return t(
    locale,
    `🧠 Alerta Táctica: Rotación R${alert.rotation} sangrando (${alert.k1Wins} de ${alert.k1Attempts} en K1). Sugerencia: Cubrir Z${zone} o pedir tiempo muerto.`,
    `🧠 Tactical alert: Rotation R${alert.rotation} bleeding (${alert.k1Wins} of ${alert.k1Attempts} in K1). Suggestion: Cover Z${zone} or call a timeout.`,
    `🧠 Alerta Tático: Rotação R${alert.rotation} sangrando (${alert.k1Wins} de ${alert.k1Attempts} em K1). Sugestão: Cobrir Z${zone} ou pedir tempo.`,
  );
}

/* ------------------------------------------------------- heatmap hand-off */

export interface HeatShot {
  x: number;
  y: number;
  result: "kill" | "error";
}

/** Center of a 3×3 zone cell on the 0–100 heatmap grid (mirrors court taps). */
export function zoneCellCenter(zone: number): { x: number; y: number } {
  const column = (zone - 1) % 3;
  const row = Math.floor((zone - 1) / 3);
  return { x: round2(column * 33.4 + 16.7), y: round2(row * 33.4 + 16.7) };
}

/**
 * Tagged attack coordinates ready for `buildShotHeatmap` — the automatic
 * hand-off into the 🗺️ ShotHeatmap station (zero double typing).
 */
export function sessionShots(session: ScoutSession): HeatShot[] {
  const shots: HeatShot[] = [];
  for (const event of session.events) {
    const tag = event.tag;
    if (!tag || tag.targetZone === null || tag.targetZone === undefined) continue;
    if (tag.action !== "attack" && tag.action !== "set" && tag.action !== "error") continue;
    const { x, y } = zoneCellCenter(tag.targetZone);
    shots.push({ x, y, result: tag.action === "error" ? "error" : "kill" });
  }
  return shots;
}

export function saveLiveScoutShots(shots: HeatShot[]): void {
  atomicSave(SHOTS_KEY, shots);
}

export function loadLiveScoutShots(): HeatShot[] {
  const parsed = atomicLoad<unknown>(SHOTS_KEY, null);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((shot): shot is HeatShot => {
    if (typeof shot !== "object" || shot === null) return false;
    const candidate = shot as Partial<HeatShot>;
    if (typeof candidate.x !== "number" || typeof candidate.y !== "number") return false;
    if (candidate.result !== "kill" && candidate.result !== "error") return false;
    return candidate.x >= 0 && candidate.x <= 100 && candidate.y >= 0 && candidate.y <= 100;
  });
}

export function clearLiveScoutShots(): void {
  atomicSave(SHOTS_KEY, []);
}