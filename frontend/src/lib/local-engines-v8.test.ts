import { describe, expect, it } from "vitest";

import {
  assessPrehab,
  buildBracket,
  buildGymScreenPayload,
  buildHeadToHead,
  buildSponsorDeck,
  buildWhiteLabel,
  commandTiebreak,
  planMatchNutrition,
  scoreReflex,
} from "./local-engines";

describe("local-engines v8 (modules 54-60)", () => {
  it("plans tournament nutrition with heat note and hourly rates", () => {
    const report = planMatchNutrition({ weightKg: 78, matches: 2, minutesPerMatch: 90, tempC: 31, sweatRateLh: 1.1 });
    expect(report.heatNote).toContain("Calor alto");
    expect(report.fluidMl).toBe(4300);
    expect(report.sodiumMg).toBe(2150);
    expect(report.carbsG).toBe(187.2);
    expect(() => planMatchNutrition({ weightKg: 0 })).toThrow("weight");
    expect(() => planMatchNutrition({ weightKg: 78, matches: 9 })).toThrow("matches");
  });

  it("scores prehab risk and suggests a jump limit", () => {
    const report = assessPrehab({ weeklyJumps: 420, weeklySpikes: 260, sleepHours: 6.5, kneePain: 3, priorInjury: true });
    expect(report.risk).toBe("ALTO");
    expect(report.riskScore).toBeLessThan(55);
    expect(report.jumpLimit).toBe(350 - Math.floor(420 / 20));
    expect(report.drills.length).toBe(3);
    expect(() => assessPrehab({ weeklyJumps: 1200, weeklySpikes: 10, sleepHours: 8 })).toThrow("jumps");
  });

  it("commands the decider: match point, golden point and the point-8 switch", () => {
    const matchPoint = commandTiebreak({ scoreA: 14, scoreB: 12, serving: "A", bestOf: 3 });
    expect(matchPoint.matchPoint).toBe(true);
    expect(matchPoint.sideSwitchDue).toBe(false);
    const switchDue = commandTiebreak({ scoreA: 5, scoreB: 3, serving: "B" });
    expect(switchDue.sideSwitchDue).toBe(true);
    const golden = commandTiebreak({ scoreA: 14, scoreB: 14, serving: "A", goldenPoint: true });
    expect(golden.phase).toBe("golden_point");
    expect(golden.recommendation).toContain("Punto de oro");
    expect(() => commandTiebreak({ scoreA: 0, scoreB: 0, serving: "A", bestOf: 4 as unknown as 3 })).toThrow("best_of");
  });

  it("builds a seeded bracket with byes and later rounds", () => {
    const report = buildBracket({ teams: ["Tiburones", "Lobos", "Titanes", "Vinchas", "Piranhas"] });
    expect(report.bracketSize).toBe(8);
    expect(report.byes).toBe(3);
    expect(report.rounds[0]?.matches).toHaveLength(4);
    expect(report.rounds[1]?.matches).toHaveLength(2);
    expect(report.rounds[2]?.matches).toHaveLength(1);
    expect(report.rounds[0]?.matches[0]).toEqual({ slot: 1, home: "Tiburones", away: null, bye: true });
    expect(() => buildBracket({ teams: ["A", "B", "A", "D"] })).toThrow("unique");
  });

  it("values a sponsor deck in tiers", () => {
    const report = buildSponsorDeck({ impressions: 24000, reach: 8000, cpm: 12, engagementPct: 6 });
    expect(report.value).toBe(288);
    expect(report.tier).toBe("BRONCE");
    expect(report.effectiveCpm).toBe(36);
    expect(report.engagementValue).toBe(17.28);
    expect(buildSponsorDeck({ impressions: 200000, reach: 50000, cpm: 15 }).tier).toBe("ORO");
    expect(() => buildSponsorDeck({ impressions: 1, reach: 1, cpm: 1, engagementPct: 150 })).toThrow("engagement");
  });

  it("summarises head-to-head history, streak and leader", () => {
    const report = buildHeadToHead({
      teamA: "Tiburones",
      teamB: "Lobos",
      matches: [{ setsA: 3, setsB: 1 }, { setsA: 2, setsB: 3 }, { setsA: 3, setsB: 0 }, { setsA: 3, setsB: 2 }],
    });
    expect(report.winsA).toBe(3);
    expect(report.winsB).toBe(1);
    expect(report.setsA).toBe(11);
    expect(report.setsB).toBe(6);
    expect(report.leader).toBe("Tiburones");
    expect(report.streak).toBe("Tiburones x2");
    expect(() => buildHeadToHead({ teamA: "  ", teamB: "Lobos", matches: [{ setsA: 3, setsB: 0 }] })).toThrow("required");
  });

  it("rates peripheral reaction latency and consistency", () => {
    const report = scoreReflex({ timesMs: [205, 210, 210, 205, 215] });
    expect(report.bestMs).toBe(205);
    expect(report.meanMs).toBe(209);
    expect(report.rating).toBe("ELITE");
    expect(report.consistencyPct).toBeGreaterThan(85);
    expect(() => scoreReflex({ timesMs: [70] })).toThrow("between 80 and 1200");
  });

  it("validates a club white-label theme and contrast", () => {
    const dark = buildWhiteLabel({ club: "Gladiadores", primary: "#121212", secondary: "#eab308", accent: "#e11d48" });
    expect(dark.textOnPrimary).toBe("#f7f6f4");
    expect(dark.cssVars["--club-primary"]).toBe("#121212");
    const light = buildWhiteLabel({ club: "Gladiadores", primary: "#fafafa", secondary: "#eab308", accent: "#e11d48" });
    expect(light.readable).toBe(true);
    const mid = buildWhiteLabel({ club: "Gladiadores", primary: "#808080", secondary: "#eab308", accent: "#e11d48" });
    expect(mid.readable).toBe(false);
    expect(() => buildWhiteLabel({ club: "G", primary: "#121212", secondary: "#eab308", accent: "#e11d48" })).toThrow("2-40");
    expect(() => buildWhiteLabel({ club: "Goliath", primary: "red", secondary: "#eab308", accent: "#e11d48" })).toThrow("#rrggbb");
  });

  it("mirrors the gym screen scoreboard payload", () => {
    const report = buildGymScreenPayload({ scoreA: 25, scoreB: 21, setA: 1, setB: 0, serving: "A", timer: "12:34" });
    expect(report.fullScreen).toBe(true);
    expect(report.message).toContain("25-21");
    expect(() => buildGymScreenPayload({ timer: "12" })).toThrow("mm:ss");
    expect(() => buildGymScreenPayload({ scoreA: 120 })).toThrow("scores");
  });
});
