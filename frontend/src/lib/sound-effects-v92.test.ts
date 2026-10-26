import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  COIN_CLINK_SPEC,
  CROWD_SPEC,
  JUDGE_GAVEL_SPEC,
  PICADITO_CUE_SPEC,
  WARMUP_TICK_SPEC,
  crowdAmbience,
  loadCrowdAmbience,
  playCoinClink,
  playCrowdCheer,
  playJudgeGavel,
  playPicaditoCue,
  playSetWinFanfare,
  playWarmupTick,
  saveCrowdAmbience,
  setCrowdAmbience,
  setSoundEffectsEnabled,
} from "@/lib/sound-effects";

class FakeParam {
  value = 0;
  setValueAtTime(): this {
    return this;
  }
  linearRampToValueAtTime(): this {
    return this;
  }
  exponentialRampToValueAtTime(): this {
    return this;
  }
}

class FakeNode {
  connect(): FakeNode {
    return this;
  }
  disconnect(): void {
    /* noop */
  }
}

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  start(): void {
    /* noop */
  }
  stop(): void {
    /* noop */
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = "bandpass";
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  start(): void {
    /* noop */
  }
  stop(): void {
    /* noop */
  }
}

class FakeShaper extends FakeNode {
  curve: Float32Array | null = null;
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator();
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
  createBufferSource(): FakeSource {
    return new FakeSource();
  }
  createWaveShaper(): FakeShaper {
    return new FakeShaper();
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }
}

describe("v9.2 studio cue specs", () => {
  it("keeps the documented synthesis numbers", () => {
    expect(PICADITO_CUE_SPEC.kill.notesHz).toEqual([110, 42]);
    expect(PICADITO_CUE_SPEC.sideout.notesHz).toEqual([523, 784]);
    expect(COIN_CLINK_SPEC.freqsHz).toEqual([2400, 3850]);
    expect(JUDGE_GAVEL_SPEC.freqsHz).toEqual([140, 95]);
    expect(CROWD_SPEC.durationMs).toBe(1500);
    expect(WARMUP_TICK_SPEC.finalFreqHz).toBeGreaterThan(WARMUP_TICK_SPEC.freqHz);
  });
});

describe("v9.2 studio cue playback", () => {
  beforeEach(() => {
    Object.defineProperty(window, "AudioContext", { value: FakeAudioContext, configurable: true, writable: true });
    setSoundEffectsEnabled(true);
    setCrowdAmbience(CROWD_SPEC.defaultVolume);
  });

  afterEach(() => {
    setSoundEffectsEnabled(true);
    window.localStorage.clear();
  });

  it("synthesises every new cue without throwing", () => {
    for (const cue of ["sideout", "ace", "kill", "serve_cap"] as const) {
      expect(playPicaditoCue(cue)).toBe(true);
    }
    expect(playCrowdCheer(0.9)).toBe(true);
    expect(playWarmupTick(true)).toBe(true);
    expect(playCoinClink()).toBe(true);
    expect(playJudgeGavel()).toBe(true);
    expect(playSetWinFanfare()).toBe(true);
  });

  it("returns false instead of crashing when the sound switch is off", () => {
    setSoundEffectsEnabled(false);
    expect(playPicaditoCue("ace")).toBe(false);
    expect(playCrowdCheer()).toBe(false);
    expect(playWarmupTick()).toBe(false);
    expect(playCoinClink()).toBe(false);
    expect(playJudgeGavel()).toBe(false);
    expect(playSetWinFanfare()).toBe(false);
  });

  it("mutes only the crowd layer when its level is zero", () => {
    setCrowdAmbience(0);
    expect(playCrowdCheer()).toBe(false);
    expect(playSetWinFanfare()).toBe(true);
  });

  it("persists and clamps the crowd level in localStorage", () => {
    expect(saveCrowdAmbience(0.42)).toBeCloseTo(0.42);
    expect(crowdAmbience()).toBeCloseTo(0.42);
    expect(loadCrowdAmbience()).toBeCloseTo(0.42);
    expect(window.localStorage.getItem("volleyos.crowdVolume")).toBe("0.42");
    expect(saveCrowdAmbience(3)).toBe(1);
    expect(saveCrowdAmbience(-1)).toBe(0);
    window.localStorage.setItem("volleyos.crowdVolume", "not-a-number");
    expect(loadCrowdAmbience()).toBe(CROWD_SPEC.defaultVolume);
  });
});
