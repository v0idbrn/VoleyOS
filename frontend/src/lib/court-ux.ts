import type { ScoreboardState } from "@/lib/local-engines";
import { speakCourtVoice } from "@/lib/sound-effects";

/** Window event carrying the latest live scoreboard snapshot (sticky bar sync). */
export const LIVE_SCORE_EVENT = "voleyos:live-score";

const LIVE_SCORE_KEY = "volleyos.liveScoreboard";

/** Persists the live scoreboard and broadcasts it to the app shell. */
export function persistLiveScoreboard(state: ScoreboardState): void {
  try {
    window.localStorage.setItem(LIVE_SCORE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(LIVE_SCORE_EVENT, { detail: state }));
}

/** Restores the last live scoreboard across tab changes (null when absent/corrupt). */
export function readLiveScoreboard(): ScoreboardState | null {
  try {
    const raw = window.localStorage.getItem(LIVE_SCORE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const candidate = value as Partial<ScoreboardState>;
    if (
      typeof candidate.teamA !== "string" ||
      typeof candidate.teamB !== "string" ||
      typeof candidate.scoreA !== "number" ||
      typeof candidate.scoreB !== "number" ||
      typeof candidate.setsA !== "number" ||
      typeof candidate.setsB !== "number" ||
      !Array.isArray(candidate.lineupA) ||
      !Array.isArray(candidate.lineupB)
    ) {
      return null;
    }
    return candidate as ScoreboardState;
  } catch {
    return null;
  }
}

/** True while a match has at least one point or set on the board. */
export function isMatchActive(state: ScoreboardState): boolean {
  return state.scoreA > 0 || state.scoreB > 0 || state.setsA > 0 || state.setsB > 0;
}

export interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

function wakeLockApi(): WakeLockLike | null {
  if (typeof navigator === "undefined") return null;
  const candidate = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
  return candidate ?? null;
}

export async function requestCourtWakeLock(): Promise<WakeLockSentinelLike | null> {
  const api = wakeLockApi();
  if (!api) return null;
  try {
    return await api.request("screen");
  } catch {
    return null;
  }
}

export function triggerCourtHaptics(pattern: number | number[] = 25): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * v10.1 — the scoreboard voice rides the universal 4-tier announcer
 * (native TTS ➔ matched Web voice ➔ any Web voice ➔ formant cadence),
 * so no phone is ever silent during a rally.
 */
export function announceScoreTTS(text: string, enabled: boolean, locale = "es-ES"): boolean {
  if (!enabled || typeof window === "undefined" || !text) return false;
  void speakCourtVoice(text, locale.slice(0, 2));
  return true;
}
