import { describe, expect, it } from "vitest";

import {
  RADAR_GATES,
  REACTION_DELAY_MAX_MS,
  REACTION_DELAY_MIN_MS,
  flightSpeedKmh,
  missReaction,
  newRadarSession,
  newReactionDrill,
  radarStats,
  reactionDelayMs,
  reactionSummary,
  recordRadarShot,
  speedTier,
  startReaction,
  fireReaction,
  tapReaction,
  undoRadarShot,
} from "@/lib/ball-radar-engine";

describe("flight speed radar (km/h)", () => {
  it("converts a gate pass into km/h", () => {
    expect(flightSpeedKmh(9, 500)).toBe(64.8);
    expect(flightSpeedKmh(18, 1000)).toBe(64.8);
    expect(flightSpeedKmh(3, 100)).toBe(108);
    expect(flightSpeedKmh(0, 500)).toBe(0);
    expect(flightSpeedKmh(9, 0)).toBe(0);
    expect(flightSpeedKmh(-1, 500)).toBe(0);
  });

  it("exposes the three court gates", () => {
    expect(RADAR_GATES.map((gate) => gate.distanceM)).toEqual([3, 9, 18]);
  });

  it("records shots, rejects fat fingers and computes last/best/avg", () => {
    let session = newRadarSession();
    session = recordRadarShot(session, { distanceM: 9, timeMs: 500 }); // 64.8
    session = recordRadarShot(session, { distanceM: 3, timeMs: 100 }); // 108
    const stats = radarStats(session);
    expect(stats.count).toBe(2);
    expect(stats.lastKmh).toBe(108);
    expect(stats.bestKmh).toBe(108);
    expect(stats.avgKmh).toBe(86.4);

    // <30ms is a finger; >10s means the pass was missed.
    const before = session;
    session = recordRadarShot(session, { distanceM: 9, timeMs: 12 });
    session = recordRadarShot(session, { distanceM: 9, timeMs: 20_000 });
    expect(session).toBe(before);
    expect(radarStats(session).count).toBe(2);
  });

  it("undoes the last shot and is safe on an empty session", () => {
    const empty = newRadarSession();
    expect(undoRadarShot(empty)).toBe(empty);
    expect(radarStats(empty)).toEqual({ count: 0, bestKmh: 0, avgKmh: 0, lastKmh: null });

    const session = recordRadarShot(empty, { distanceM: 9, timeMs: 500 });
    expect(radarStats(undoRadarShot(session)).count).toBe(0);
  });

  it("tiers the best speed into base/club/elite/pro bands", () => {
    expect(speedTier(69.9)).toBe("base");
    expect(speedTier(70)).toBe("club");
    expect(speedTier(89.9)).toBe("club");
    expect(speedTier(90)).toBe("elite");
    expect(speedTier(109.9)).toBe("elite");
    expect(speedTier(110)).toBe("pro");
  });
});

describe("reaction-time drill", () => {
  it("picks a hide delay inside the 0.8–2.2s window", () => {
    expect(reactionDelayMs(() => 0)).toBe(REACTION_DELAY_MIN_MS);
    expect(reactionDelayMs(() => 0.999999)).toBe(REACTION_DELAY_MAX_MS);
    expect(reactionDelayMs()).toBeGreaterThanOrEqual(REACTION_DELAY_MIN_MS);
    expect(reactionDelayMs()).toBeLessThanOrEqual(REACTION_DELAY_MAX_MS);
  });

  it("walks idle → waiting → stimulus → result with a valid tap", () => {
    let drill = newReactionDrill();
    expect(drill.status).toBe("idle");

    drill = startReaction(drill, 1_000, 800);
    expect(drill.status).toBe("waiting");
    expect(drill.stimulusAt).toBe(1_800);

    drill = fireReaction(drill, 1_800);
    expect(drill.status).toBe("stimulus");
    expect(drill.stimulusAt).toBe(1_800);

    drill = tapReaction(drill, 2_050); // 250 ms reaction
    expect(drill.status).toBe("result");
    expect(drill.flag).toBe("ok");
    expect(drill.lastMs).toBe(250);
    expect(drill.times).toEqual([250]);
  });

  it("voids a false start tapped while waiting", () => {
    const armed = startReaction(newReactionDrill(), 1_000, 800);
    const jumped = tapReaction(armed, 1_300);
    expect(jumped.status).toBe("idle");
    expect(jumped.flag).toBe("jumped");
    expect(jumped.times).toHaveLength(0);
    expect(jumped.stimulusAt).toBeNull();
  });

  it("discounts sub-80ms taps and over-1200ms taps", () => {
    let drill = fireReaction(startReaction(newReactionDrill(), 0, 800), 800);
    drill = tapReaction(drill, 840); // 40 ms — anticipation
    expect(drill.flag).toBe("early");
    expect(drill.times).toHaveLength(0);

    drill = fireReaction(startReaction(newReactionDrill(), 0, 800), 800);
    drill = tapReaction(drill, 800 + 1_300);
    expect(drill.flag).toBe("late");
    expect(drill.times).toHaveLength(0);
    expect(drill.status).toBe("idle");
  });

  it("ignores taps with no round in flight and double-fires", () => {
    const idle = newReactionDrill();
    expect(tapReaction(idle, 9_999)).toBe(idle);

    const armed = startReaction(idle, 1_000, 800);
    expect(fireReaction(armed, 1_200)).toBe(armed); // fired too early: no-op
    const again = fireReaction(fireReaction(armed, 1_800), 2_400);
    expect(again.stimulusAt).toBe(1_800);
  });

  it("voids a missed stimulus as late", () => {
    const drill = fireReaction(startReaction(newReactionDrill(), 0, 800), 800);
    const missed = missReaction(drill);
    expect(missed.flag).toBe("late");
    expect(missed.status).toBe("idle");
    expect(missReaction(newReactionDrill()).flag).toBeNull();
  });

  it("summarizes valid taps through the scoreReflex report", () => {
    expect(reactionSummary([])).toBeNull();
    const summary = reactionSummary([210, 195]);
    expect(summary).not.toBeNull();
    expect(summary?.meanMs).toBe(202.5);
    expect(summary?.bestMs).toBe(195);
    expect(summary?.rating).toBe("ELITE");
    expect(reactionSummary([50])).toBeNull(); // outside the 80–1200 band
  });
});
