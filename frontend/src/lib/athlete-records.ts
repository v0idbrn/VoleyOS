/**
 * v9.5 — the Athlete's Edge: flight-time vertical jump physics plus the
 * personal record book persisted in localStorage (`voleyos_athlete_records_v1`).
 *
 * All math reuses the canonical `verticalJumpCm` engine (h = 1/8·g·t²) so the
 * VideoTelestrator calculator, the Biomechanics station and the career
 * VolleyCard agree to the centimetre.
 */

import { safeJsonParse } from "@/lib/security-shield";
import { verticalJumpCm } from "@/lib/local-engines";

export const ATHLETE_RECORDS_KEY = "voleyos_athlete_records_v1";
export const ATHLETE_RECORDS_CAP = 20;
export const GRAVITY_MS2 = 9.81;

export type HangTimeRating = "warm" | "club" | "explosive" | "elite";

export interface AthleteJumpRecord {
  /** YYYY-MM-DD of the attempt. */
  date: string;
  flightMs: number;
  heightCm: number;
}

export interface FlightTimeReport {
  flightSeconds: number;
  heightCm: number;
  /** Take-off velocity v0 = 1/2·g·Δt in m/s. */
  takeoffVelocityMs: number;
  rating: HangTimeRating;
}

/** h = 1/8·g·t² (cm) and v0 = 1/2·g·t (m/s); null for degenerate timings. */
export function flightTimeJump(flightSeconds: number): FlightTimeReport | null {
  if (!Number.isFinite(flightSeconds) || flightSeconds <= 0) return null;
  const heightCm = verticalJumpCm(0, Math.max(1, Math.round(flightSeconds * 1000)));
  const takeoffVelocityMs = 0.5 * GRAVITY_MS2 * flightSeconds;
  const rating: HangTimeRating =
    flightSeconds < 0.45 ? "warm" : flightSeconds < 0.6 ? "club" : flightSeconds < 0.72 ? "explosive" : "elite";
  return { flightSeconds, heightCm, takeoffVelocityMs, rating };
}

function isJumpRecord(entry: unknown): entry is AthleteJumpRecord {
  if (!entry || typeof entry !== "object") return false;
  const value = entry as Partial<AthleteJumpRecord>;
  return (
    typeof value.date === "string" &&
    typeof value.flightMs === "number" &&
    Number.isFinite(value.flightMs) &&
    typeof value.heightCm === "number" &&
    Number.isFinite(value.heightCm) &&
    value.heightCm > 0
  );
}

/** Restores the personal record book (empty when absent or corrupted). */
export function loadAthleteRecords(): AthleteJumpRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(ATHLETE_RECORDS_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown>(raw, null);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isJumpRecord).slice(-ATHLETE_RECORDS_CAP);
  } catch {
    return [];
  }
}

/** Appends a record, caps the book and persists it; returns the new list. */
export function saveAthleteRecord(record: AthleteJumpRecord): AthleteJumpRecord[] {
  const next = [...loadAthleteRecords(), record].slice(-ATHLETE_RECORDS_CAP);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ATHLETE_RECORDS_KEY, JSON.stringify(next));
    }
  } catch {
    /* storage unavailable: the in-memory list still updates */
  }
  return next;
}

/** Clears the personal record book (used by tests and Settings). */
export function clearAthleteRecords(): AthleteJumpRecord[] {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(ATHLETE_RECORDS_KEY);
  } catch {
    /* storage unavailable */
  }
  return [];
}

/** Sparkline `points` string (width×height) over the recorded heights. */
export function recordsSparkline(records: AthleteJumpRecord[], width = 120, height = 28): string {
  if (records.length === 0) return "";
  const values = records.map((record) => record.heightCm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = records.length > 1 ? width / (records.length - 1) : 0;
  return records
    .map((record, index) => {
      const x = index * stepX;
      const y = height - 3 - ((record.heightCm - min) / span) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
