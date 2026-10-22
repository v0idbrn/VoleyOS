import { describe, expect, it } from "vitest";

import {
  analyseFiveFrames,
  awardBeachPoint,
  awardIndoorPoint,
  balanceTeams,
  beachSwitchInterval,
  buildVolleyCard,
  classifyTiming,
  defaultPositions,
  decideVar,
  heatmap,
  jumpLoad,
  newBeach,
  newScoreboard,
  overlayFromScoreboard,
  parsePlay,
  standings,
  tempoWindow,
  validateOverlap,
  verticalJumpCm,
} from "./local-engines";
import { PICKUP_SAMPLE, SCOUT_SAMPLE, TOURNAMENT_MATCHES, TOURNAMENT_TEAMS, acwrSample } from "./samples";

describe("biomechanics", () => {
  it("derives jump height from flight time", () => {
    expect(verticalJumpCm(0, 540)).toBeCloseTo(35.76, 2);
    expect(() => verticalJumpCm(500, 500)).toThrow();
  });

  it("scores five frames and flags the priority frame", () => {
    const good = analyseFiveFrames({ kneeAngle: 120, drawAngle: 85, impactAngle: 175, windowAngle: 25, symmetry: 3 });
    expect(good.score).toBe(100);
    expect(good.priority).toBe(0);
    const bad = analyseFiveFrames({ kneeAngle: 95, drawAngle: 85, impactAngle: 175, windowAngle: 25, symmetry: 3 });
    expect(bad.frames[0]?.status).toBe("TOO_DEEP");
    expect(bad.priority).toBe(1);
    expect(bad.score).toBe(80);
  });
});

describe("rotation", () => {
  it("accepts default formations and rejects an overlap", () => {
    for (let rotation = 1; rotation <= 6; rotation += 1) {
      expect(validateOverlap(defaultPositions(rotation)).valid).toBe(true);
    }
    const broken = defaultPositions(3).map((point) => (point.zone === 2 ? { ...point, y: 500 } : point));
    const report = validateOverlap(broken);
    expect(report.valid).toBe(false);
    expect(report.faults.some((fault) => fault.pair === "Z2/Z1")).toBe(true);
  });
});

describe("scouting", () => {
  it("parses spanish play notation", () => {
    const parsed = parsePlay("Ataque del 7 por 4 diagonal punto");
    expect(parsed.player).toBe(7);
    expect(parsed.skill).toBe("attack");
    expect(parsed.result).toBe("KILL");
  });

  it("builds a nine zone heatmap", () => {
    const cells = heatmap(SCOUT_SAMPLE);
    expect(cells).toHaveLength(9);
    expect(cells.reduce((sum, cell) => sum + cell.count, 0)).toBeGreaterThan(0);
  });
});

describe("scoreboard", () => {
  it("rotates only on side-out and finishes a set at 25", () => {
    const base = newScoreboard("A", "B");
    const sideOut = awardIndoorPoint(base, "B");
    expect(sideOut.rotated).toBe(true);
    expect(sideOut.state.lineupB[0]).toBe(8);
    const sameTeam = awardIndoorPoint(sideOut.state, "B");
    expect(sameTeam.rotated).toBe(false);
    expect(sameTeam.state.streak).toBe(2);

    const setPoint = awardIndoorPoint({ ...base, serving: "A", scoreA: 24 }, "A");
    expect(setPoint.setFinished).toBe(true);
    expect(setPoint.state.setsA).toBe(1);
    expect(setPoint.state.scoreA).toBe(0);
  });

  it("exposes set point in the overlay payload", () => {
    const overlay = overlayFromScoreboard({ ...newScoreboard(), scoreA: 24, scoreB: 22 });
    expect(overlay.banner).toBe("SET POINT");
    expect(overlay.transparent).toBe(true);
  });
});

describe("tournament", () => {
  it("ranks teams by points then set ratio", () => {
    const table = standings(TOURNAMENT_TEAMS, TOURNAMENT_MATCHES);
    expect(table).toHaveLength(TOURNAMENT_TEAMS.length);
    expect(table[0]?.position).toBe(1);
    for (let index = 1; index < table.length; index += 1) {
      const previous = table[index - 1];
      const current = table[index];
      expect(previous && current ? previous.points >= current.points : true).toBe(true);
    }
  });
});

describe("pickup", () => {
  it("balances two teams with one setter each", () => {
    const result = balanceTeams(PICKUP_SAMPLE, 2);
    expect(result.teams).toHaveLength(2);
    expect(result.teams.every((team) => team.setters >= 1)).toBe(true);
    expect(result.delta).toBeLessThanOrEqual(1);
    expect(() => balanceTeams(PICKUP_SAMPLE, 5)).toThrow();
  });
});

describe("var", () => {
  it("matches libero finger-set fault and defaults safely", () => {
    const decision = decideVar("Líbero armando de dedos delante de la línea de 3 metros");
    expect(decision.matched).toBe(true);
    expect(decision.verdict).toContain("FALTA");
    expect(decideVar("jugada sin palabras clave").matched).toBe(false);
  });
});

describe("beach", () => {
  it("switches sides every 7 points in the first sets", () => {
    let state = newBeach();
    expect(beachSwitchInterval(state)).toBe(7);
    let switched = false;
    for (let index = 0; index < 7; index += 1) {
      const result = awardBeachPoint(state, "A");
      state = result.state;
      switched = switched || result.sideSwitchDue;
    }
    expect(switched).toBe(true);
    expect(state.pointsA).toBe(7);
  });
});

describe("volleycard", () => {
  it("calculates spike reach and rarity", () => {
    const card = buildVolleyCard({
      name: "Test",
      position: "punta",
      heightCm: 190,
      standingReachCm: 250,
      jumpCm: 80,
      attributes: { attack: 90, reception: 80, serve: 75, block: 70, defense: 70, setting: 55 },
    });
    expect(card.spikeReachCm).toBe(330);
    expect(card.rarity).toBe("ELITE");
    expect(() =>
      buildVolleyCard({
        name: "Bad",
        position: "punta",
        heightCm: 200,
        standingReachCm: 190,
        jumpCm: 80,
        attributes: { attack: 90, reception: 80, serve: 75, block: 70, defense: 70, setting: 55 },
      }),
    ).toThrow();
  });
});

describe("tempo", () => {
  it("classifies perfect, early and late timings", () => {
    expect(tempoWindow("second").idealMs).toBe(0);
    expect(classifyTiming("second", 10).status).toBe("PERFECT");
    expect(classifyTiming("second", -100).status).toBe("EARLY");
    expect(classifyTiming("second", 100).status).toBe("LATE");
  });
});

describe("acwr", () => {
  it("computes a ratio inside a known band", () => {
    const report = jumpLoad(acwrSample());
    expect(report.acute).toBeGreaterThan(0);
    expect(report.ratio).toBeGreaterThan(0);
    expect(report.ratio).toBeGreaterThan(1.3);
    expect(report.color).toBe("amber");
  });
});
