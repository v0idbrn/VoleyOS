/* ------------------------------------------------------------------ v10.0.0
 * Ball Radar Engine — live speed gun (km/h) + reaction-time drill.
 *
 *  Speed: the coach arms the gun when the ball leaves the hand and stops it
 *  at the gate; km/h = distance × 3600 / elapsed ms. Sessions accumulate the
 *  shots so the station can show last / best / average and a tier badge.
 *
 *  Reaction: a false-start-safe state machine (idle → waiting → stimulus →
 *  result). The component supplies the clock (Date.now) and the random delay
 *  so every path is deterministic under test; valid 80–1200 ms taps feed the
 *  existing `scoreReflex` report (mean / best / rating).
 * -------------------------------------------------------------------------- */

import { round2, scoreReflex, type ReflexReport } from "@/lib/local-engines";

/** Constant-speed estimate over a measured gate distance. 0 when unusable. */
export function flightSpeedKmh(distanceM: number, timeMs: number): number {
  if (!(distanceM > 0) || !(timeMs > 0)) return 0;
  return round2((distanceM * 3600) / timeMs);
}

export interface RadarGate {
  id: "3m" | "9m" | "18m";
  distanceM: number;
}

export const RADAR_GATES: RadarGate[] = [
  { id: "3m", distanceM: 3 },
  { id: "9m", distanceM: 9 },
  { id: "18m", distanceM: 18 },
];

export interface RadarShot {
  id: number;
  distanceM: number;
  timeMs: number;
  speedKmh: number;
}

export interface RadarSession {
  nextId: number;
  shots: RadarShot[];
}

export function newRadarSession(): RadarSession {
  return { nextId: 1, shots: [] };
}

/**
 * Records one gate pass. Sub-30ms taps are fingers, not balls; anything over
 * 10s means the coach missed the pass — both are ignored (identity return).
 */
export function recordRadarShot(
  session: RadarSession,
  input: { distanceM: number; timeMs: number },
): RadarSession {
  if (!(input.distanceM > 0) || !(input.timeMs >= 30) || input.timeMs > 10_000) return session;
  const shot: RadarShot = {
    id: session.nextId,
    distanceM: round2(input.distanceM),
    timeMs: Math.round(input.timeMs),
    speedKmh: flightSpeedKmh(input.distanceM, input.timeMs),
  };
  return { nextId: session.nextId + 1, shots: [...session.shots, shot] };
}

export function undoRadarShot(session: RadarSession): RadarSession {
  if (session.shots.length === 0) return session;
  return { ...session, shots: session.shots.slice(0, -1) };
}

export interface RadarStats {
  count: number;
  bestKmh: number;
  avgKmh: number;
  lastKmh: number | null;
}

export function radarStats(session: RadarSession): RadarStats {
  if (session.shots.length === 0) return { count: 0, bestKmh: 0, avgKmh: 0, lastKmh: null };
  let total = 0;
  let best = 0;
  for (const shot of session.shots) {
    total += shot.speedKmh;
    if (shot.speedKmh > best) best = shot.speedKmh;
  }
  const last = session.shots[session.shots.length - 1];
  return {
    count: session.shots.length,
    bestKmh: round2(best),
    avgKmh: round2(total / session.shots.length),
    lastKmh: last ? last.speedKmh : null,
  };
}

export type RadarTier = "base" | "club" | "elite" | "pro";

/** Tier badges for the best measured serve/gate speed. */
export function speedTier(kmh: number): RadarTier {
  if (kmh >= 110) return "pro";
  if (kmh >= 90) return "elite";
  if (kmh >= 70) return "club";
  return "base";
}

/* ------------------------------------------------------- reaction drill */

export const REACTION_MIN_MS = 80;
export const REACTION_MAX_MS = 1200;
export const REACTION_DELAY_MIN_MS = 800;
export const REACTION_DELAY_MAX_MS = 2200;

export type ReactionFlag = "ok" | "early" | "late" | "jumped" | null;

export interface ReactionDrill {
  status: "idle" | "waiting" | "stimulus" | "result";
  /** Clock reading of the stimulus onset (null unless lit or armed). */
  stimulusAt: number | null;
  lastMs: number | null;
  flag: ReactionFlag;
  /** Valid 80–1200 ms taps only — safe to hand to scoreReflex. */
  times: number[];
}

export function newReactionDrill(): ReactionDrill {
  return { status: "idle", stimulusAt: null, lastMs: null, flag: null, times: [] };
}

/** Random hide-delay so anticipation is impossible; injectable for tests. */
export function reactionDelayMs(random: () => number = Math.random): number {
  const raw = REACTION_DELAY_MIN_MS + random() * (REACTION_DELAY_MAX_MS - REACTION_DELAY_MIN_MS);
  return Math.round(Math.min(REACTION_DELAY_MAX_MS, Math.max(REACTION_DELAY_MIN_MS, raw)));
}

/** Arms the drill: the stimulus is scheduled for nowMs + delayMs. */
export function startReaction(drill: ReactionDrill, nowMs: number, delayMs: number): ReactionDrill {
  return { ...drill, status: "waiting", stimulusAt: nowMs + delayMs, lastMs: null, flag: null };
}

/** The stimulus timer fired: the pad is now live (never before its cue). */
export function fireReaction(drill: ReactionDrill, nowMs: number): ReactionDrill {
  if (drill.status !== "waiting" || drill.stimulusAt === null || nowMs < drill.stimulusAt) return drill;
  return { ...drill, status: "stimulus", stimulusAt: nowMs, lastMs: null, flag: null };
}

/**
 * The athlete tapped the pad:
 *  - waiting  → false start ("jumped"), round voided;
 *  - stimulus → measured: under 80ms discounted, over 1200ms too slow,
 *               otherwise recorded and the round reports the result.
 */
export function tapReaction(drill: ReactionDrill, nowMs: number): ReactionDrill {
  if (drill.status === "waiting") {
    return { ...drill, status: "idle", stimulusAt: null, lastMs: null, flag: "jumped" };
  }
  if (drill.status !== "stimulus" || drill.stimulusAt === null) return drill;
  const ms = Math.max(0, Math.round(nowMs - drill.stimulusAt));
  if (ms < REACTION_MIN_MS) {
    return { ...drill, status: "idle", stimulusAt: null, lastMs: ms, flag: "early" };
  }
  if (ms > REACTION_MAX_MS) {
    return { ...drill, status: "idle", stimulusAt: null, lastMs: ms, flag: "late" };
  }
  return { ...drill, status: "result", stimulusAt: null, lastMs: ms, flag: "ok", times: [...drill.times, ms] };
}

/** Nobody tapped while the stimulus was live — round voided as "late". */
export function missReaction(drill: ReactionDrill): ReactionDrill {
  if (drill.status !== "stimulus") return drill;
  return { ...drill, status: "idle", stimulusAt: null, lastMs: null, flag: "late" };
}

/** Mean/best/rating over the valid taps (null before the first read). */
export function reactionSummary(times: number[]): ReflexReport | null {
  if (times.length === 0) return null;
  try {
    return scoreReflex({ timesMs: times });
  } catch {
    return null;
  }
}
