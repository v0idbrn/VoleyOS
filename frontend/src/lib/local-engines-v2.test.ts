import { describe, expect, it } from "vitest";

import {
  buildLineupSlip,
  buildSeal,
  canonicalJson,
  computeBlockShadow,
  computeSeam,
  computeSetterIQ,
  exportCapsule,
  importCapsule,
  verifySeal,
  type SetDistribution,
} from "./local-engines";

describe("v2 offline engines", () => {
  it("keeps defenders outside the block shadow cone", () => {
    const report = computeBlockShadow({ attackZone: "zone_4", blockers: 3, scheme: "line", blockDepth: 0.55 });
    expect(report.coveragePct).toBeGreaterThan(0);
    expect(report.defenders.some((defender) => defender.movedCm > 0)).toBe(true);
    expect(report.shadowPolygon).toHaveLength(4);
  });

  it("assigns a seam owner and a critical gap", () => {
    const report = computeSeam({
      formation: "line3",
      rotation: 2,
      serveOrigin: "1",
      serveType: "jump_spin",
      landingX: 4.8,
      landingY: 5.6,
      attackerReleaseAngle: 40,
    });
    expect(report.primaryReceiver).toMatch(/^R[1456]$/);
    expect(report.seamOwner).toMatch(/^R[1456]$/);
    expect(report.gapCm).toBeGreaterThan(100);
    expect(["CRITICAL", "HIGH", "NORMAL"]).toContain(report.priority);
  });

  it("flags a predictable setter and rewards balance", () => {
    const predictable: SetDistribution[] = [
      { rotation: 1, quality: "+", target: "Z4", count: 12 },
      { rotation: 2, quality: "+", target: "Z4", count: 12 },
    ];
    const balanced: SetDistribution[] = [
      { rotation: 1, quality: "+", target: "Z4", count: 5 },
      { rotation: 1, quality: "+", target: "Z3-Quick", count: 5 },
      { rotation: 2, quality: "+", target: "Z2-Back", count: 5 },
      { rotation: 2, quality: "+", target: "Pipe-Z6", count: 5 },
      { rotation: 2, quality: "+", target: "Setter-Dump", count: 5 },
    ];
    expect(computeSetterIQ(balanced).unpredictability).toBeGreaterThan(
      computeSetterIQ(predictable).unpredictability,
    );
    expect(computeSetterIQ(predictable).bias).toBe("Z4");
  });

  it("builds a valid I-VI slip with a libero window", () => {
    const report = buildLineupSlip({
      rotationStart: 1,
      setter: 1,
      opposite: 11,
      outside1: 4,
      outside2: 7,
      middle1: 14,
      middle2: 18,
      libero: 21,
    });
    expect(report.lineup.map((slot) => slot.roman)).toEqual(["I", "II", "III", "IV", "V", "VI"]);
    expect(report.liberoWindows.length).toBeGreaterThan(0);
    expect(report.checks).toHaveLength(3);
  });

  it("canonicalises JSON before sealing and detects tampering", async () => {
    const payload = { b: 2, a: { d: 4, c: 3 } };
    expect(canonicalJson(payload)).toBe('{"a":{"c":3,"d":4},"b":2}');
    const seal = await buildSeal(payload);
    expect((await verifySeal(payload, seal.seal)).tampered).toBe(false);
    expect((await verifySeal({ ...payload, b: 5 }, seal.seal, payload)).tampered).toBe(true);
  });

  it("exports and imports a checksummed capsule", async () => {
    const report = await exportCapsule("Pizarra 5-1", { rotation: 3, team: "Tiburones" });
    const imported = await importCapsule(report.capsule);
    expect(imported.checksum).toBe(report.checksum);
    expect(imported.filename).toBe("pizarra-5-1.volleyos");
    await expect(importCapsule(report.capsule.replace('"rotation":3', '"rotation":4'))).rejects.toThrow(
      "checksum mismatch",
    );
  });
});
