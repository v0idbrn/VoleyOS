import { beforeEach, describe, expect, it } from "vitest";

import { buildShotHeatmap } from "@/lib/local-engines";
import { atomicSave } from "@/lib/security-shield";
import {
  K1_BLEED_THRESHOLD,
  SCOUT_ACTIONS,
  ZONE_PRESETS,
  amendLastScoutTag,
  bleedingAlertMessage,
  bleedingRotation,
  clearLiveScoutShots,
  loadLiveScoutShots,
  loadScoutSession,
  newScoutSession,
  recordScoutPoint,
  redoScoutPoint,
  rotationStats,
  saveLiveScoutShots,
  saveScoutSession,
  sessionShots,
  tagLastScoutPoint,
  totalStats,
  undoScoutPoint,
  zoneCellCenter,
  type ScoutAction,
  type ScoutPointInput,
  type ScoutSession,
} from "@/lib/live-scouting-engine";

const SESSION_KEY = "voleyos_live_scout_session_v1";
const SHOTS_KEY = "voleyos_live_scout_shots_v1";

function point(input: Partial<ScoutPointInput> = {}): ScoutPointInput {
  return {
    setNumber: 1,
    scoredBy: "A",
    servingBefore: "B",
    sideOut: true,
    rotationA: 1,
    rotationB: 1,
    ...input,
  };
}

function build(inputs: ScoutPointInput[]): ScoutSession {
  return inputs.reduce((session, input) => recordScoutPoint(session, input), newScoutSession());
}

beforeEach(() => window.localStorage.clear());

describe("K1 / K2 side-out and break-point percentages", () => {
  it("computes K1 from receiving rallies and K2 from own-serve rallies per rotation", () => {
    // R1: five rallies received (B serving), one converted → K1 = 20%.
    //     two rallies on own serve, both held → K2 = 100%.
    const session = build([
      point({ scoredBy: "A" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "A", servingBefore: "A", sideOut: false }),
      point({ scoredBy: "A", servingBefore: "A", sideOut: false }),
    ]);

    const rows = rotationStats(session, "A");
    expect(rows).toHaveLength(6);
    const r1 = rows[0];
    expect(r1?.sideOutAttempts).toBe(5);
    expect(r1?.sideOutWins).toBe(1);
    expect(r1?.k1Pct).toBe(20);
    expect(r1?.breakAttempts).toBe(2);
    expect(r1?.breakWins).toBe(2);
    expect(r1?.k2Pct).toBe(100);
  });

  it("rolls every point into a total row for the whole match", () => {
    const session = build([
      point({ rotationA: 1 }),
      point({ scoredBy: "B", rotationA: 2 }),
      point({ scoredBy: "A", servingBefore: "A", rotationA: 3 }),
      point({ scoredBy: "B", rotationA: 4 }),
    ]);
    const total = totalStats(session, "A");
    expect(total.sideOutAttempts).toBe(3);
    expect(total.sideOutWins).toBe(1);
    expect(total.breakAttempts).toBe(1);
    expect(total.breakWins).toBe(1);

    const rows = rotationStats(session, "A");
    const sumSideOut = rows.reduce((acc, row) => acc + row.sideOutAttempts, 0);
    const sumBreak = rows.reduce((acc, row) => acc + row.breakAttempts, 0);
    expect(sumSideOut).toBe(total.sideOutAttempts);
    expect(sumBreak).toBe(total.breakAttempts);
  });

  it("tracks side B symmetrically from the same events", () => {
    const session = build([
      point({ servingBefore: "A", sideOut: false }), // B receives, B loses the rally
      point({ servingBefore: "A", sideOut: false }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false }),
    ]);
    const r1 = rotationStats(session, "B")[0];
    expect(r1?.sideOutAttempts).toBe(3);
    expect(r1?.sideOutWins).toBe(1);
    expect(r1?.k1Pct).toBe(33.33);
  });
});

describe("attack efficiency from 1-tap tags", () => {
  it("solves (Kills - Errors) / Attempts with attack kills and rival errors", () => {
    let session = newScoutSession();
    for (let index = 0; index < 3; index += 1) {
      session = recordScoutPoint(session, point({ scoredBy: "A" }));
      session = tagLastScoutPoint(session, { action: "attack", originZone: 4, targetZone: 5, scorer: null });
    }
    // Fourth point won by B through our error → the error counts against A.
    session = recordScoutPoint(session, point({ scoredBy: "B", servingBefore: "A", sideOut: false }));
    session = tagLastScoutPoint(session, { action: "error", originZone: null, targetZone: null, scorer: null });

    const total = totalStats(session, "A");
    expect(total.attempts).toBe(4);
    expect(total.kills).toBe(3);
    expect(total.errors).toBe(1);
    expect(total.efficiency).toBe(0.5);
  });

  it("scores aces and blocks without inflating attack attempts", () => {
    let session = build([point({ scoredBy: "A" }), point({ scoredBy: "A", servingBefore: "A", sideOut: false })]);
    session = tagLastScoutPoint(session, { action: "ace", originZone: null, targetZone: 1, scorer: null });
    session = recordScoutPoint(session, point({ scoredBy: "A", servingBefore: "A", sideOut: false }));
    session = tagLastScoutPoint(session, { action: "block", originZone: null, targetZone: 4, scorer: null });
    const total = totalStats(session, "A");
    expect(total.attempts).toBe(0);
    expect(total.efficiency).toBe(0);
    expect(total.aces).toBe(1);
    expect(total.blocks).toBe(1);
  });

  it("returns zero efficiency instead of dividing by zero when nothing is tagged", () => {
    const session = build([point()]);
    expect(totalStats(session, "A").efficiency).toBe(0);
    expect(rotationStats(session, "A")[5]?.k2Pct).toBe(0);
  });
});

describe("bleeding rotation detection", () => {
  it("alerts when K1 falls under 35% with at least 3 attempts", () => {
    const session = build([
      point({ scoredBy: "A" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
    ]);
    const alert = bleedingRotation(session, "A");
    expect(alert).not.toBeNull();
    expect(alert?.reason).toBe("k1");
    expect(alert?.rotation).toBe(1);
    expect(alert?.k1Wins).toBe(1);
    expect(alert?.k1Attempts).toBe(5);
    expect(alert?.k1Pct).toBe(20);
    expect(alert && alert.k1Pct < K1_BLEED_THRESHOLD).toBe(true);
    expect(alert?.coverZone).toBeGreaterThanOrEqual(1);
    expect(alert?.coverZone).toBeLessThanOrEqual(9);
  });

  it("prefers the rival's tagged target zone as the cover suggestion", () => {
    let session = newScoutSession();
    session = recordScoutPoint(session, point({ scoredBy: "A" }));
    for (let index = 0; index < 4; index += 1) {
      session = recordScoutPoint(session, point({ scoredBy: "B" }));
      session = tagLastScoutPoint(session, { action: "attack", originZone: 4, targetZone: 5, scorer: null });
    }
    const alert = bleedingRotation(session, "A");
    expect(alert?.coverZone).toBe(5);
  });

  it("stays silent while K1 is healthy", () => {
    const session = build([
      point({ scoredBy: "A" }),
      point({ scoredBy: "A" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "A" }),
    ]);
    expect(bleedingRotation(session, "A")).toBeNull();
  });

  it("stays silent below the 3-attempt sample floor", () => {
    const session = build([point({ scoredBy: "B" }), point({ scoredBy: "B" })]);
    expect(bleedingRotation(session, "A")).toBeNull();
  });

  it("alerts on a 3+ point run conceded inside one rotation", () => {
    // Conceded on own serve: K1 is untouched (0 attempts), the run fires.
    const session = build([
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
    ]);
    const alert = bleedingRotation(session, "A");
    expect(alert?.reason).toBe("run");
    expect(alert?.rotation).toBe(4);
    expect(alert?.run).toBe(3);
  });

  it("resets the run counter the moment the team scores again", () => {
    const session = build([
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "A", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
      point({ scoredBy: "B", servingBefore: "A", sideOut: false, rotationA: 4 }),
    ]);
    expect(bleedingRotation(session, "A")).toBeNull();
  });

  it("picks the worst rotation when several bleed", () => {
    const session = build([
      // R1: 0 of 3 received rallies won → 0%.
      point({ rotationA: 1, scoredBy: "B" }),
      point({ rotationA: 1, scoredBy: "B" }),
      point({ rotationA: 1, scoredBy: "B" }),
      // R2: 1 of 3 → 33.33%.
      point({ rotationA: 2, scoredBy: "A" }),
      point({ rotationA: 2, scoredBy: "B" }),
      point({ rotationA: 2, scoredBy: "B" }),
    ]);
    const alert = bleedingRotation(session, "A");
    expect(alert?.rotation).toBe(1);
    expect(alert?.k1Pct).toBe(0);
    expect(alert?.reason).toBe("k1");
  });

  it("builds the localized coaching message with the rotation and cover zone", () => {
    const session = build([
      point({ scoredBy: "A" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
      point({ scoredBy: "B" }),
    ]);
    const alert = bleedingRotation(session, "A");
    expect(alert).not.toBeNull();
    if (!alert) return;
    const es = bleedingAlertMessage(alert, "es");
    expect(es).toContain("R1");
    expect(es).toContain("(1 de 5 en K1)");
    expect(es).toContain(`Cubrir Z${alert.coverZone}`);
    const en = bleedingAlertMessage(alert, "en");
    expect(en).toContain("Rotation R1");
    expect(en).not.toMatch(/tiempo muerto/);
    const pt = bleedingAlertMessage(alert, "pt");
    expect(pt).toContain("Rotação R1");
    expect(pt).toContain("Cobrir");
  });
});

describe("heatmap hand-off (ShotHeatmap ingest)", () => {
  it("maps tagged zones into court coordinates that survive buildShotHeatmap", () => {
    let session = build([point({ scoredBy: "A" })]);
    session = tagLastScoutPoint(session, { action: "attack", originZone: 4, targetZone: 5, scorer: null });
    const shots = sessionShots(session);
    expect(shots).toHaveLength(1);
    expect(shots[0]).toEqual({ x: 50.1, y: 50.1, result: "kill" });

    const report = buildShotHeatmap({ shots });
    expect(report.total).toBe(1);
    expect(report.hotZone).toBe(5);
  });

  it("round-trips every zone center back to its own cell", () => {
    for (let zone = 1; zone <= 9; zone += 1) {
      const { x, y } = zoneCellCenter(zone);
      const inverse = Math.min(2, Math.floor((y * 3) / 100)) * 3 + Math.min(2, Math.floor((x * 3) / 100)) + 1;
      expect(inverse).toBe(zone);
    }
  });

  it("exports rival errors as error shots and skips unzoned or non-attack tags", () => {
    let errorSession = build([point({ scoredBy: "A" })]);
    errorSession = tagLastScoutPoint(errorSession, { action: "error", originZone: 2, targetZone: 1, scorer: null });
    const errorShots = sessionShots(errorSession);
    expect(errorShots).toHaveLength(1);
    expect(errorShots[0]?.result).toBe("error");

    // A kill tag without a zone and a serve ace contribute no heatmap cell.
    let otherSession = build([point({ scoredBy: "A" })]);
    otherSession = tagLastScoutPoint(otherSession, { action: "attack", originZone: 4, targetZone: null, scorer: null });
    otherSession = recordScoutPoint(otherSession, point({ scoredBy: "A" }));
    otherSession = tagLastScoutPoint(otherSession, { action: "ace", originZone: null, targetZone: 3, scorer: null });
    expect(sessionShots(otherSession)).toHaveLength(0);
  });

  it("feeds and reloads the persisted shot log for the ShotHeatmap station", () => {
    saveLiveScoutShots([{ x: 16.7, y: 83.5, result: "kill" }]);
    const loaded = loadLiveScoutShots();
    expect(loaded).toHaveLength(1);
    expect(buildShotHeatmap({ shots: loaded }).hotZone).toBe(7);

    saveLiveScoutShots([{ x: 999, y: -5, result: "kill" }]);
    expect(loadLiveScoutShots()).toHaveLength(0);

    clearLiveScoutShots();
    expect(loadLiveScoutShots()).toHaveLength(0);
  });
});

describe("tagging, undo and persistence", () => {
  it("tags the last point, amends zones/scorer, and no-ops on an empty session", () => {
    let session = build([point()]);
    session = tagLastScoutPoint(session, { action: "attack", originZone: null, targetZone: null, scorer: null });
    session = amendLastScoutTag(session, { targetZone: 4, scorer: "Vera" });
    const tagged = session.events[0]?.tag;
    expect(tagged?.action).toBe("attack");
    expect(tagged?.targetZone).toBe(4);
    expect(tagged?.scorer).toBe("Vera");

    const empty = newScoutSession();
    expect(amendLastScoutTag(empty, { targetZone: 1 })).toBe(empty);
    expect(tagLastScoutPoint(empty, { action: "ace", originZone: null, targetZone: null, scorer: null })).toBe(empty);
  });

  it("keeps points and tags in lockstep with undo/redo", () => {
    let session = build([point(), point(), point()]);
    session = tagLastScoutPoint(session, { action: "attack", originZone: 1, targetZone: 9, scorer: null });
    session = undoScoutPoint(session, 2);
    expect(session.events).toHaveLength(1);
    expect(session.undone).toHaveLength(2);
    session = redoScoutPoint(session, 2);
    expect(session.events).toHaveLength(3);
    expect(session.undone).toHaveLength(0);
    expect(session.events[0]?.tag).toBeNull();
    expect(session.events[2]?.tag?.action).toBe("attack");

    const empty = newScoutSession();
    expect(undoScoutPoint(empty)).toEqual(empty);
    expect(redoScoutPoint(empty)).toEqual(empty);
  });

  it("round-trips a session through the crash-safe WAL", () => {
    const session = build([point({ rotationA: 3 }), point({ scoredBy: "B", rotationA: 3 })]);
    const tagged = tagLastScoutPoint(session, { action: "block", originZone: 3, targetZone: 3, scorer: "Nilo" });
    saveScoutSession(tagged);
    const loaded = loadScoutSession();
    expect(loaded.events).toHaveLength(2);
    expect(loaded.events[1]?.tag?.scorer).toBe("Nilo");
    expect(loaded.nextId).toBe(3);
  });

  it("recovers a fresh session from corrupt or hostile payloads", () => {
    atomicSave(SESSION_KEY, { v: 1, nextId: "nope", events: [{ bogus: true }, null], undone: 3 });
    const recovered = loadScoutSession();
    expect(recovered.events).toHaveLength(0);
    expect(recovered.nextId).toBe(1);

    window.localStorage.setItem(SESSION_KEY, "not json at all {{{");
    expect(loadScoutSession().events).toHaveLength(0);

    atomicSave(SHOTS_KEY, { x: 1, y: 2 });
    expect(loadLiveScoutShots()).toHaveLength(0);
  });

  it("exposes exactly the five 1-tap actions and four zone presets", () => {
    expect([...SCOUT_ACTIONS]).toEqual(["attack", "block", "ace", "set", "error"]);
    expect(ZONE_PRESETS.map((preset) => preset.id)).toEqual(["z4z5", "z2z1", "z3short", "pipez6"]);
    for (const preset of ZONE_PRESETS) {
      expect(preset.originZone).toBeGreaterThanOrEqual(1);
      expect(preset.originZone).toBeLessThanOrEqual(9);
      expect(preset.targetZone).toBeGreaterThanOrEqual(1);
      expect(preset.targetZone).toBeLessThanOrEqual(9);
    }
    const actions: ScoutAction[] = [...SCOUT_ACTIONS];
    expect(actions).toContain("set");
  });
});