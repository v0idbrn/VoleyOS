import { describe, expect, it } from "vitest";

import {
  analyzeTelestration,
  buildPlaybookAnimation,
  buildShotHeatmap,
  type PlaybookPhaseInput,
} from "./local-engines";

describe("v8 telestration, playbook and shot heatmap", () => {
  it("measures a stroke and a jump from video coordinates", () => {
    const report = analyzeTelestration({
      frameWidth: 100,
      frameHeight: 100,
      scaleCmPerPx: 1,
      strokes: [[{ x: 10, y: 10 }, { x: 20, y: 10 }]],
      takeoff: { x: 50, y: 80 },
      apex: { x: 50, y: 40 },
    });
    expect(report.totalLengthPx).toBe(10);
    expect(report.meanAngleDeg).toBe(0);
    expect(report.jumpHeightCm).toBe(40);
  });

  it("rejects a stroke outside the frame", () => {
    expect(() => analyzeTelestration({
      frameWidth: 100,
      frameHeight: 100,
      strokes: [[{ x: 10, y: 10 }, { x: 120, y: 10 }]],
    })).toThrow("outside");
  });

  it("builds a three phase timeline with vectors", () => {
    const phase = (name: PlaybookPhaseInput["phase"], durationMs: number, x: number): PlaybookPhaseInput => ({
      phase: name,
      durationMs,
      targetZone: 5,
      players: [{ number: 7, x, y: 50 }],
    });
    const report = buildPlaybookAnimation([
      phase("serve", 1000, 50),
      phase("transition", 2000, 60),
      phase("attack", 1500, 70),
    ]);
    expect(report.totalDurationMs).toBe(4500);
    expect(report.phases[1]?.startMs).toBe(1000);
    expect(report.phases[2]?.vectors[0]?.dx).toBe(10);
    expect(report.phases[2]?.endMs).toBe(4500);
  });

  it("groups shots into nine zones and finds the hot zone", () => {
    const report = buildShotHeatmap({
      shots: [
        { x: 10, y: 10, result: "kill" },
        { x: 15, y: 15, result: "kill" },
        { x: 50, y: 50, result: "error" },
        { x: 90, y: 90, result: "blocked" },
      ],
    });
    expect(report.cells).toHaveLength(9);
    expect(report.cells[0]?.count).toBe(2);
    expect(report.hotZone).toBe(1);
    expect(report.efficiencyPct).toBe(0);
  });
});
