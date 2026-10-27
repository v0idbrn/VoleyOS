import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  APPROACH_CADENCE_SPEC,
  APPROACH_CADENCE_STEPS_HZ,
  APPROACH_CONTACT_HZ,
  MIKASA_THUMP_SPEC,
  NET_SNAP_SPEC,
  SNEAKER_SQUEAK_SPEC,
  playApproachCadence,
  playMikasaSpikeThump,
  playNetCordSnap,
  playPicaditoCue,
  playSneakerSqueak,
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

class FakeAudioContext {
  static oscillators = 0;
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createOscillator(): FakeOscillator {
    FakeAudioContext.oscillators += 1;
    return new FakeOscillator();
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }
}

type StubWindow = Window & { AudioContext?: unknown };

describe("v9.5 athlete audio engine", () => {
  it("keeps the documented synthesis numbers", () => {
    expect(SNEAKER_SQUEAK_SPEC.bandpassQ).toBe(18);
    expect([...SNEAKER_SQUEAK_SPEC.sweepHz]).toEqual([2350, 3150, 2600]);
    expect(SNEAKER_SQUEAK_SPEC.durationMs).toBe(140);

    expect([...MIKASA_THUMP_SPEC.punchHz]).toEqual([135, 52]);
    expect(MIKASA_THUMP_SPEC.slapHz).toBe(900);
    expect(MIKASA_THUMP_SPEC.durationMs).toBe(65);

    expect(NET_SNAP_SPEC.carrierHz).toBe(320);
    expect(NET_SNAP_SPEC.pluckHz).toBe(190);

    expect(APPROACH_CADENCE_SPEC["1st"]).toEqual({ stepsMs: [0, 220, 310], contactMs: 480 });
    expect(APPROACH_CADENCE_SPEC["2nd"]).toEqual({ stepsMs: [0, 340, 460], contactMs: 700 });
    expect(APPROACH_CADENCE_SPEC["3rd"]).toEqual({ stepsMs: [0, 480, 630], contactMs: 920 });
    expect([...APPROACH_CADENCE_STEPS_HZ]).toEqual([660, 660, 520]);
    expect(APPROACH_CONTACT_HZ).toBe(1180);
  });

  it("stays silent when there is no AudioContext", () => {
    delete (window as StubWindow).AudioContext;
    expect(playSneakerSqueak()).toBe(false);
    expect(playMikasaSpikeThump()).toBe(false);
    expect(playNetCordSnap()).toBe(false);
    expect(playApproachCadence("2nd")).toBe(false);
  });

  describe("with a WebAudio stub", () => {
    beforeEach(() => {
      FakeAudioContext.oscillators = 0;
      (window as StubWindow).AudioContext = FakeAudioContext;
      setSoundEffectsEnabled(true);
    });

    afterEach(() => {
      delete (window as StubWindow).AudioContext;
      setSoundEffectsEnabled(true);
    });

    it("synthesises every texture and tempo without throwing", () => {
      expect(playSneakerSqueak()).toBe(true);
      expect(playMikasaSpikeThump()).toBe(true);
      expect(playNetCordSnap()).toBe(true);
      for (const tempo of ["1st", "2nd", "3rd"] as const) {
        expect(playApproachCadence(tempo)).toBe(true);
      }
    });

    it("honours the global sound switch", () => {
      setSoundEffectsEnabled(false);
      expect(playSneakerSqueak()).toBe(false);
      expect(playMikasaSpikeThump()).toBe(false);
      expect(playNetCordSnap()).toBe(false);
      expect(playApproachCadence("1st")).toBe(false);
      setSoundEffectsEnabled(true);
      expect(playSneakerSqueak()).toBe(true);
    });

    it("layers the Mikasa thump into kills and the net snap into aces", () => {
      FakeAudioContext.oscillators = 0;
      playPicaditoCue("kill");
      const killOscillators = FakeAudioContext.oscillators;
      // boom punch (1) + thump punch + leather slap = 3 layered oscillators.
      expect(killOscillators).toBeGreaterThanOrEqual(3);

      FakeAudioContext.oscillators = 0;
      playPicaditoCue("ace");
      const aceOscillators = FakeAudioContext.oscillators;
      // two ace notes + net-cord carrier + FM partial = 4 layered oscillators.
      expect(aceOscillators).toBeGreaterThanOrEqual(4);

      FakeAudioContext.oscillators = 0;
      playPicaditoCue("sideout");
      expect(FakeAudioContext.oscillators).toBe(2);
    });
  });
});
