import { describe, expect, it } from "vitest";

import {
  SCOREBOARD_HISTORY_LIMIT,
  analyzeMomentum,
  awardIndoorPoint,
  buildChalkboard,
  buildMatchPoster,
  buildRosterPass,
  commitScoreboard,
  inspectEquipment,
  newScoreboard,
  newScoreboardHistory,
  redoScoreboard,
  snakeDraft,
  undoScoreboard,
  verifyRosterPass,
} from "./local-engines";

describe("v4 offline engines", () => {
  it("builds a 30 second chalkboard with validated strokes", () => {
    const report = buildChalkboard({
      reason: "stop_serve_run",
      rotation: 4,
      strokes: [{ points: [{ x: 1, y: 1 }, { x: 5, y: 7 }] }],
    });
    expect(report.seconds).toBe(30);
    expect(report.cues).toHaveLength(2);
    expect(report.strokes[0]?.lengthM).toBeGreaterThan(0);
    expect(() => buildChalkboard({ reason: "stop_serve_run", strokes: [{ points: [{ x: 10, y: 2 }, { x: 4, y: 4 }] }] })).toThrow();
  });

  it("calls timeout on a three point run and urgent on five", () => {
    const run = analyzeMomentum({ team: "A", history: ["A", "A", "B", "B", "B"], rotations: [1, 2, 3, 3, 3] });
    expect(run.recommendation).toBe("CALL_TIMEOUT_NOW_3_RUN");
    expect(run.momentumIndex).toBe(-20);
    expect(run.worstRotation).toBe(3);
    const urgent = analyzeMomentum({ team: "A", history: ["A", "B", "B", "B", "B", "B"] });
    expect(urgent.recommendation).toBe("URGENT_TIMEOUT_OR_SUB_5_RUN");
  });

  it("snakes the draft and audits departments", () => {
    const players = [
      { name: "A1", role: "setter", level: 5 },
      { name: "A2", role: "outside", level: 5 },
      { name: "A3", role: "middle", level: 5 },
      { name: "A4", role: "opposite", level: 4 },
      { name: "A5", role: "libero", level: 4 },
      { name: "A6", role: "outside", level: 4 },
    ] as const;
    const report = snakeDraft({ captains: ["Tiburones", "Condores"], players: [...players] });
    expect(report.pickOrder.map((pick) => pick.captain).slice(0, 4)).toEqual([
      "Tiburones",
      "Condores",
      "Condores",
      "Tiburones",
    ]);
    expect(report.teams.map((team) => team.count)).toEqual([3, 3]);
    expect(report.totalLevel).toBe(27);
  });

  it("seals and verifies a roster pass", async () => {
    const input = {
      team: "Tiburones",
      players: [
        { name: "Sofia", number: 1, role: "setter" as const, isCaptain: true },
        { name: "Valentina", number: 4, role: "outside" as const },
        { name: "Micaela", number: 7, role: "outside" as const },
        { name: "Renata", number: 9, role: "middle" as const },
        { name: "Carla", number: 11, role: "opposite" as const },
        { name: "Julieta", number: 14, role: "middle" as const },
        { name: "Martina", number: 21, role: "libero" as const, isLibero: true },
      ],
    };
    const report = await buildRosterPass(input);
    expect(report.passCode).toMatch(/^VOS-ROSTER-[0-9A-F]{24}$/);
    expect(report.liberos).toBe(1);
    expect(await verifyRosterPass(input, report.passCode)).toBe(true);
    await expect(buildRosterPass({ ...input, players: input.players.map((player) => ({ ...player, isCaptain: false })) })).rejects.toThrow();
  });

  it("converts ball pressure and checks net tolerance", () => {
    const report = inspectEquipment({
      category: "men_indoor",
      centerHeightCm: 243,
      sideAHeightCm: 243,
      sideBHeightCm: 242,
      ballPressureKgfCm2: 0.31,
    });
    expect(report.netOk).toBe(true);
    expect(report.pressurePsi).toBe(4.41);
    expect(report.ballsStacked).toBe(11.57);
    expect(report.ballStatus).toBe("Óptima FIVB");
    const badNet = inspectEquipment({
      category: "women_indoor",
      centerHeightCm: 224,
      sideAHeightCm: 224,
      sideBHeightCm: 227,
      ballPressureKgfCm2: 0.31,
    });
    expect(badNet.status).toBe("NET_OUT_OF_TOLERANCE");
  });

  it("renders escaped story and feed posters", async () => {
    const report = await buildMatchPoster({
      homeTeam: '"><script>alert(1)</script>',
      awayTeam: "Condores",
      setsHome: 3,
      setsAway: 1,
      periods: [{ home: 25, away: 21 }],
      roomId: "TIB-2026",
    });
    expect(report.width).toBe(1080);
    expect(report.height).toBe(1920);
    expect(report.svg).not.toContain("<script>");
    expect(report.svg).toContain("&lt;script&gt;");
    expect(report.roomMatrix).toHaveLength(25);
    expect(report.seal).toMatch(/^VOS-SEAL-/);
    const feed = await buildMatchPoster({
      homeTeam: "A",
      awayTeam: "B",
      periods: [{ home: 25, away: 20 }],
      format: "feed",
    });
    expect(feed.height).toBe(1080);
  });

  it("undoes a side-out and restores the previous rotation", () => {
    const start = newScoreboard("Tiburones", "Condores", 3);
    const history = newScoreboardHistory(start);
    const result = awardIndoorPoint(start, "B");
    expect(result.state.serving).toBe("B");
    const committed = commitScoreboard(history, result.state);
    const undone = undoScoreboard(committed);
    expect(undone.present.scoreB).toBe(0);
    expect(undone.present.lineupB).toEqual([7, 8, 9, 10, 11, 12]);
    const redone = redoScoreboard(undone);
    expect(redone.present.scoreB).toBe(1);
    expect(redone.present.lineupB).toEqual([8, 9, 10, 11, 12, 7]);
  });

  it("caps scoreboard history at fifty states", () => {
    let state = newScoreboard("Tiburones", "Condores", 99);
    let history = newScoreboardHistory(state);
    for (let index = 0; index < 60; index += 1) {
      const result = awardIndoorPoint(state, "A");
      state = result.state;
      history = commitScoreboard(history, state);
    }
    expect(history.past).toHaveLength(SCOREBOARD_HISTORY_LIMIT);
  });
});
