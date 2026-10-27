import { beforeEach, describe, expect, it } from "vitest";

import {
  ATHLETE_RECORDS_CAP,
  ATHLETE_RECORDS_KEY,
  careerCardStats,
  clearAthleteRecords,
  flightTimeJump,
  loadAthleteRecords,
  recordsSparkline,
  saveAthleteRecord,
} from "@/lib/athlete-records";
import { verticalJumpCm } from "@/lib/local-engines";

describe("flight-time vertical jump physics", () => {
  it("matches h = 1/8·g·t²·100 with the canonical engine", () => {
    const report = flightTimeJump(0.6);
    expect(report).not.toBeNull();
    expect(report?.heightCm).toBe(verticalJumpCm(0, 600));
    expect(report?.heightCm).toBe(44.15);
    // v0 = 1/2·g·Δt
    expect(report?.takeoffVelocityMs).toBeCloseTo(2.943, 3);
    expect(report?.flightSeconds).toBe(0.6);
  });

  it("rates hang time into the four bands", () => {
    expect(flightTimeJump(0.4)?.rating).toBe("warm");
    expect(flightTimeJump(0.5)?.rating).toBe("club");
    expect(flightTimeJump(0.6)?.rating).toBe("explosive");
    expect(flightTimeJump(0.8)?.rating).toBe("elite");
  });

  it("rejects degenerate timings", () => {
    expect(flightTimeJump(0)).toBeNull();
    expect(flightTimeJump(-0.2)).toBeNull();
    expect(flightTimeJump(Number.NaN)).toBeNull();
    expect(flightTimeJump(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("personal jump record book", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAthleteRecords();
  });

  it("persists records and reads them back in order", () => {
    expect(loadAthleteRecords()).toEqual([]);
    saveAthleteRecord({ date: "2026-10-27", flightMs: 440, heightCm: 44.15 });
    const next = saveAthleteRecord({ date: "2026-10-28", flightMs: 520, heightCm: 58.15 });
    expect(next).toHaveLength(2);
    expect(window.localStorage.getItem(ATHLETE_RECORDS_KEY)).toContain("44.15");
    expect(loadAthleteRecords().map((record) => record.date)).toEqual(["2026-10-27", "2026-10-28"]);
  });

  it("caps the book at the documented limit", () => {
    for (let index = 0; index < ATHLETE_RECORDS_CAP + 5; index += 1) {
      saveAthleteRecord({ date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`, flightMs: 400 + index, heightCm: 40 + index });
    }
    expect(loadAthleteRecords()).toHaveLength(ATHLETE_RECORDS_CAP);
    expect(loadAthleteRecords().at(-1)?.heightCm).toBe(40 + ATHLETE_RECORDS_CAP + 4);
  });

  it("survives corrupted or hostile storage", () => {
    window.localStorage.setItem(ATHLETE_RECORDS_KEY, "{not json");
    expect(loadAthleteRecords()).toEqual([]);
    window.localStorage.setItem(ATHLETE_RECORDS_KEY, '{"date":"x"}');
    expect(loadAthleteRecords()).toEqual([]);
    window.localStorage.setItem(
      ATHLETE_RECORDS_KEY,
      JSON.stringify([{ date: "2026-10-27", flightMs: 400, heightCm: -5 }, { junk: true }]),
    );
    expect(loadAthleteRecords()).toEqual([]);
    expect(clearAthleteRecords()).toEqual([]);
    expect(loadAthleteRecords()).toEqual([]);
  });

  it("rates an empty career at the floor", () => {
    expect(careerCardStats({ bestJumpCm: null, matchesPlayed: 0, matchesWon: 0, pickupAwards: 0 })).toEqual({
      jmp: 0,
      atk: 20,
      def: 35,
      iq: 30,
      ovr: 21,
    });
  });

  it("rewards jump height, wins and pickup awards", () => {
    expect(careerCardStats({ bestJumpCm: 58, matchesPlayed: 2, matchesWon: 1, pickupAwards: 3 })).toEqual({
      jmp: 70,
      atk: 73,
      def: 65,
      iq: 42,
      ovr: 63,
    });
  });

  it("clamps every career stat into the 0..99 band", () => {
    const stats = careerCardStats({ bestJumpCm: 400, matchesPlayed: 100, matchesWon: 100, pickupAwards: 50 });
    expect(stats).toEqual({ jmp: 99, atk: 99, def: 95, iq: 99, ovr: 98 });
    expect(stats.jmp).toBeLessThanOrEqual(99);
    expect(stats.atk).toBeLessThanOrEqual(99);
    expect(stats.iq).toBeLessThanOrEqual(99);
  });

  it("draws a sparkline over the recorded heights", () => {
    expect(recordsSparkline([])).toBe("");
    const points = recordsSparkline([
      { date: "2026-10-01", flightMs: 400, heightCm: 40 },
      { date: "2026-10-02", flightMs: 500, heightCm: 55 },
      { date: "2026-10-03", flightMs: 460, heightCm: 48 },
    ]);
    const pairs = points.split(" ");
    expect(pairs).toHaveLength(3);
    expect(pairs[0]?.startsWith("0.0,")).toBe(true);
    expect(pairs[2]?.startsWith("120.0,")).toBe(true);
    // Highest value sits at the top of the 28px band.
    expect(pairs[1]?.endsWith(",3.0")).toBe(true);
  });
});
