import { describe, expect, it } from "vitest";

import {
  BUZZER_SPEC,
  FANFARE_SPEC,
  POP_SPEC,
  WHISTLE_SPEC,
  playBuzzer,
  playScorePop,
  playSetWinFanfare,
  playWhistle,
  soundEffectsActive,
} from "./sound-effects";

describe("sound-effects studio synth", () => {
  it("exposes the Fox 40 whistle spec (dual detuned highs + pea modulation)", () => {
    expect(WHISTLE_SPEC.highHz).toBe(3740);
    expect(WHISTLE_SPEC.detunedHz).toBe(4060);
    expect(WHISTLE_SPEC.peaHz).toBe(48);
    expect(WHISTLE_SPEC.highPassHz).toBe(2800);
    expect(WHISTLE_SPEC.durationsMs.short).toBeLessThan(WHISTLE_SPEC.durationsMs.long);
    expect(WHISTLE_SPEC.durationsMs.double).toBeGreaterThan(0);
  });

  it("exposes the FIVB horn chord and fanfare specs", () => {
    expect(BUZZER_SPEC.freqsHz).toEqual([146.8, 293.6, 438]);
    expect(BUZZER_SPEC.durationMs).toBeGreaterThanOrEqual(500);
    expect(POP_SPEC.freqHz).toBeGreaterThan(400);
    expect(FANFARE_SPEC.freqsHz).toHaveLength(3);
    expect(FANFARE_SPEC.freqsHz[0]).toBe(392);
  });

  it("guards every player behind the global switch and missing AudioContext", () => {
    // jsdom has no WebAudio: players must degrade to false, never throw.
    expect(playWhistle("short")).toBe(false);
    expect(playBuzzer()).toBe(false);
    expect(playScorePop()).toBe(false);
    expect(playSetWinFanfare()).toBe(false);
    expect(soundEffectsActive()).toBe(true);
  });
});
