import { describe, expect, it } from "vitest";

import {
  analyzeAerodynamics,
  analyzeSystem,
  buildAdaptiveRulebook,
  buildArenaCue,
  buildClipPlan,
  buildQrSync,
  buildRecruitingDossier,
  buildTreasury,
  calculateElo,
  readDeception,
  translateSlang,
  validateHouseRules,
} from "./local-engines";

describe("local-engines v6", () => {
  it("detects the float drag crisis", () => {
    const report = analyzeAerodynamics({ speedKmh: 65, spinRps: 0.4, launchAngleDeg: 8, impactHeightM: 2.1 });
    expect(report.regime).toBe("FLYING_FLOAT_CRISIS");
    expect(report.lateralDeviationCm).toBeGreaterThan(8);
    expect(report.landsInCourt).toBe(true);
  });

  it("plans a player highlight reel", () => {
    const report = buildClipPlan({
      playerNumber: 7,
      minDurationSec: 3,
      rallies: [
        { startSec: 0, endSec: 4.5, playerNumber: 7, skill: "spike", outcome: "kill" },
        { startSec: 5.5, endSec: 10, playerNumber: 7, skill: "ace", outcome: "ace" },
        { startSec: 11, endSec: 12, playerNumber: 7, skill: "dig", outcome: "short" },
      ],
    });
    expect(report.selected).toHaveLength(2);
    expect(report.netPlaySec).toBe(9);
    expect(report.ffmpegCommand.split("\n")).toHaveLength(2);
    expect(report.edl[0]).toContain("C  7 spike");
  });

  it("builds a signed recruiting dossier", async () => {
    const report = await buildRecruitingDossier({
      graduationYear: 2028,
      position: "outside",
      heightCm: 188,
      reachOneHandCm: 245,
      reachTwoHandCm: 248,
      verticalJumpCm: 78,
      attackReachCm: 323,
      kills: 280,
      attackEfficiencyPct: 46,
    });
    expect(report.score).toBeGreaterThan(40);
    expect(report.seal).toMatch(/^VOS-SEAL-[0-9A-F]{16}$/);
  });

  it("recommends a system and maps rotations", () => {
    const report = analyzeSystem({ setters: 2, pureHitters: 5, transitionReadGrade: 4, rotation: 1 });
    expect(report.recommended).toBe("6-2");
    expect(Object.keys(report.infiltrationMap)).toHaveLength(6);
  });

  it("reads deception probabilities", () => {
    const report = readDeception({ approachSpeedKmh: 19, elbowHeightCm: 172, ballFrontOffsetCm: 12, setterFrontZoneJump: true, blockersCommitted: 2 });
    expect(report.hardSwingPct + report.offSpeedTipPct + report.setterDumpPct).toBe(100);
    expect(report.primaryDefender).toBe("right_back");
  });

  it("applies ParaVolley sitting dimensions", () => {
    const report = buildAdaptiveRulebook({ mode: "sitting", sex: "female", players: 6 });
    expect(report.netHeightM).toBe(1.05);
    expect(report.pelvisContactRequired).toBe(true);
  });

  it("transfers Elo points symmetrically", () => {
    const report = calculateElo({ teamARating: 1820, teamBRating: 1760, kWeight: 40, result: "3-1" });
    expect(report.deltaA).toBeGreaterThan(0);
    expect(report.deltaA + report.deltaB).toBe(0);
  });

  it("splits team costs to the cent", () => {
    const report = buildTreasury({
      jerseyCostTotal: 300,
      monthlyFeePerPlayer: 10,
      months: 3,
      ballFund: 60,
      registrationFee: 60,
      players: [{ name: "Ana", paid: 80 }, { name: "Bea", paid: 300 }],
    });
    expect(report.perPlayer[0]?.due).toBe(240);
    expect(report.perPlayer[1]?.status).toBe("CREDIT_FAVOR");
    expect(report.collectionPct).toBe(79.17);
  });

  it("validates mixed house rules and golden point", () => {
    const report = validateHouseRules({
      format: "short_sets",
      teamAGenders: ["M", "F", "M", "F", "M", "F"],
      teamBGenders: ["F", "M", "F", "M", "F", "M"],
      benchOrder: ["Ana"],
      scoreA: 14,
      scoreB: 14,
    });
    expect(report.valid).toBe(true);
    expect(report.goldenPointRequired).toBe(true);
  });

  it("serves arena cue frequencies", () => {
    const report = buildArenaCue({ event: "MONSTER_BLOCK" });
    expect(report.frequenciesHz).toEqual([110, 82, 55]);
    expect(report.visualBannerText.pt).toBe("MURO TOTAL");
  });

  it("translates regional slang", () => {
    const report = translateSlang({ term: "PIPE", origin: "AR" });
    expect(report.translations.BR).toBe("pipe");
    expect(report.technicalMeaning).toContain("zaguero");
  });

  it("builds a signed offline QR matrix", async () => {
    const report = await buildQrSync({ kind: "match", payload: { home: "Tiburones", score_a: 24 }, matrixSize: 21 });
    expect(report.matrixSize).toBe(21);
    expect(report.svg).toContain("<svg");
    expect(report.signature).toHaveLength(12);
    expect(report.byteLength).toBeGreaterThan(10);
  });
});
