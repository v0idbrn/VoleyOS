import { describe, expect, it } from "vitest";

import {
  buildCareerReport,
  buildPlayByPlay,
  evaluateBlockout,
  matchupMatrix,
  planPractice,
  serveRadar,
} from "./local-engines";

describe("serveRadar", () => {
  it("classifies a fast jump serve", () => {
    const report = serveRadar({ originXm: 0, originYm: 0, targetXm: 9, targetYm: 9, flightTimeMs: 400 });
    expect(report.classification).toBe("WORLD_CLASS_BOMB");
    expect(report.reactionMarginMs).toBe(150);
  });

  it("rejects short flights", () => {
    expect(() => serveRadar({ originXm: 0, originYm: 0, targetXm: 1, targetYm: 1, flightTimeMs: 200 })).toThrow();
  });
});

describe("matchupMatrix", () => {
  it("builds 6x6 and picks rotations", () => {
    const report = matchupMatrix({
      opponentAttack: [90, 72, 64, 58, 46, 38],
      ownBlock: [52, 58, 64, 70, 76, 82],
    });
    expect(report.matrix).toHaveLength(6);
    expect(report.bestStartingRotation).toMatch(/^R[1-6]$/);
    expect(report.topAttackerIndex).toBe(0);
  });
});

describe("evaluateBlockout", () => {
  it("recommends a decision with EV", () => {
    const report = evaluateBlockout({
      zone: "zone_4",
      setDistance: "tight_0_3m",
      blockClosure: "double_closed",
      attackerReachCm: 342,
      blockReachCm: 326,
    });
    expect(report.options).toHaveLength(4);
    expect(report.recommended).toBe("SOFT_RECYCLE_OFF_HANDS");
    expect(report.options.every((option) => option.probabilityPct >= 5 && option.probabilityPct <= 95)).toBe(true);
  });
});

describe("planPractice", () => {
  it("splits 9 players into 2 groups", () => {
    const report = planPractice({ players: 9, durationMin: 90, focus: "k1_reception" });
    expect(report.groups).toEqual([5, 4]);
    expect(report.blocks[report.blocks.length - 1]?.endMin).toBe(90);
  });
});

describe("buildPlayByPlay", () => {
  it("counts clutch points and lead changes", () => {
    const report = buildPlayByPlay({
      homeTeam: "Tiburones",
      awayTeam: "Condores",
      events: [
        { kind: "point", team: "home", player: "Valentina", scoreHome: 1, scoreAway: 0, setNumber: 1 },
        { kind: "point", team: "away", scoreHome: 1, scoreAway: 2, setNumber: 1 },
        { kind: "point", team: "home", scoreHome: 3, scoreAway: 2, setNumber: 1 },
        { kind: "point", team: "home", scoreHome: 21, scoreAway: 20, setNumber: 3 },
      ],
    });
    expect(report.leadChanges).toBe(2);
    expect(report.clutchPoints).toBe(1);
    expect(report.summary.pt).toContain("viradas");
  });
});

describe("buildCareerReport", () => {
  it("computes deltas and bottleneck", () => {
    const report = buildCareerReport({
      player: "Valentina",
      measurements: [
        {
          period: "2026-01",
          verticalJumpCm: 52,
          attackReachCm: 305,
          serveSpeedKmh: 78,
          attackEfficiencyPct: 38,
          receptionPct: 52,
        },
        {
          period: "2026-06",
          verticalJumpCm: 61,
          attackReachCm: 318,
          serveSpeedKmh: 92,
          attackEfficiencyPct: 47,
          receptionPct: 61,
        },
      ],
    });
    expect(report.deltas.jumpCm).toBe(9);
    expect(report.evolutionIndex).toBeGreaterThan(50);
    expect(["jump", "reach", "serve", "attack", "reception"]).toContain(report.bottleneck);
  });
});
