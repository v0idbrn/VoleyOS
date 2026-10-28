import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FIVB_HORN_PCM_SPEC,
  encodePcmToWavDataUri,
  formantCadencePcm,
  playBuzzer,
  playUniversalPcm,
  playWhistle,
  setSoundEffectsEnabled,
  speakCourtVoice,
  synthFivbHornPcm,
  synthFox40Pcm,
} from "./sound-effects";

type BridgeWindow = Window & {
  VoleyOSBridge?: { speakNativeTts?: (text: string, lang: string) => boolean; playNativeHardwareCue?: (cue: string) => boolean };
  speechSynthesis?: unknown;
  SpeechSynthesisUtterance?: unknown;
};

class FakeAudioContext {
  static last: FakeAudioContext | null = null;
  state = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = { connect: (): void => undefined };

  constructor() {
    FakeAudioContext.last = this;
  }

  resume(): Promise<void> {
    this.state = "running";
    return Promise.resolve();
  }

  createGain(): { gain: { value: number }; connect: () => void } {
    return { gain: { value: 0 }, connect: () => undefined };
  }

  createDynamicsCompressor(): {
    threshold: { value: number };
    knee: { value: number };
    ratio: { value: number };
    attack: { value: number };
    release: { value: number };
    connect: () => void;
  } {
    return {
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
      connect: () => undefined,
    };
  }

  createWaveShaper(): { curve: Float32Array | null; connect: () => void } {
    return { curve: null, connect: () => undefined };
  }

  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }

  createBufferSource(): { buffer: unknown; connect: () => void; start: () => void } {
    return { buffer: null, connect: () => undefined, start: () => undefined };
  }
}

const esVoice: SpeechSynthesisVoice = {
  lang: "es-AR",
  name: "VoleyOS es-AR",
  localService: true,
  default: false,
  voiceURI: "es-AR",
};

describe("v10.1 universal PCM audio", () => {
  afterEach(() => {
    setSoundEffectsEnabled(true);
    delete (window as BridgeWindow).VoleyOSBridge;
  });

  it("encodes a valid 44-byte RIFF/WAVE 16-bit mono header", () => {
    const uri = encodePcmToWavDataUri(new Float32Array([0, 0.5, -1, 2, -2]), 44100);
    expect(uri.startsWith("data:audio/wav;base64,")).toBe(true);
    const binary = atob(uri.slice(uri.indexOf(",") + 1));
    expect(binary.length).toBe(44 + 5 * 2);
    expect(binary.slice(0, 4)).toBe("RIFF");
    expect(binary.slice(8, 12)).toBe("WAVE");
    expect(binary.slice(12, 16)).toBe("fmt ");
    expect(binary.slice(36, 40)).toBe("data");
    const view = new DataView(Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer);
    expect(view.getUint32(4, true)).toBe(36 + 10);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(view.getUint32(40, true)).toBe(10);
    expect(view.getInt16(44 + 3 * 2, true)).toBe(32767); // +2 clamps up
    expect(view.getInt16(44 + 4 * 2, true)).toBe(-32768); // -2 clamps down
  });

  it("synthesises Fox 40 and FIVB horn PCM with the documented lengths", () => {
    const short = synthFox40Pcm("short");
    expect(short.length).toBe(Math.floor(0.45 * 44100));
    expect(short.some((value) => Math.abs(value) > 0.1)).toBe(true);

    const double = synthFox40Pcm("double");
    const gapStart = Math.floor(0.4 * 44100);
    const gapEnd = Math.floor(0.54 * 44100);
    const gapEnergy = double
      .slice(gapStart + 10, gapEnd - 10)
      .reduce((sum, value) => sum + Math.abs(value), 0);
    expect(gapEnergy).toBe(0); // the double-chamber pause is silent

    const horn = synthFivbHornPcm();
    expect(horn.length).toBe(Math.floor(FIVB_HORN_PCM_SPEC.durationSec * 44100));
    expect(horn.some((value) => Math.abs(value) > 0.1)).toBe(true);
  });

  it("degrades to false, never throws, when no AudioContext exists", () => {
    // Must run before any AudioContext is installed in this file.
    expect(playUniversalPcm(new Float32Array([0.5]))).toBe(false);
    expect(playWhistle("short")).toBe(false);
    expect(playBuzzer()).toBe(false);
  });

  it("plays PCM through WebAudio when the context is running", () => {
    Object.defineProperty(window, "AudioContext", {
      value: FakeAudioContext,
      configurable: true,
      writable: true,
    });
    expect(playUniversalPcm(new Float32Array([0.25, -0.25]))).toBe(true);
    expect(FakeAudioContext.last).not.toBeNull();
  });

  it("routes whistle and buzzer through PCM + the native AudioTrack layer", () => {
    const hardwareCue = vi.fn(() => true);
    Object.defineProperty(window, "VoleyOSBridge", {
      value: { playNativeHardwareCue: hardwareCue },
      configurable: true,
    });
    expect(playWhistle("short")).toBe(true);
    expect(hardwareCue).toHaveBeenLastCalledWith("whistle_short");
    expect(playWhistle("double")).toBe(true);
    expect(hardwareCue).toHaveBeenLastCalledWith("whistle_double");
    expect(playBuzzer()).toBe(true);
    expect(hardwareCue).toHaveBeenLastCalledWith("buzzer");
  });

  it("never fires native hardware cues while the sound switch is off", () => {
    const hardwareCue = vi.fn(() => true);
    Object.defineProperty(window, "VoleyOSBridge", {
      value: { playNativeHardwareCue: hardwareCue },
      configurable: true,
    });
    setSoundEffectsEnabled(false);
    expect(playWhistle()).toBe(false);
    expect(playBuzzer()).toBe(false);
    expect(hardwareCue).not.toHaveBeenCalled();
    setSoundEffectsEnabled(true);
  });

  it("falls back to a RIFF WAV <audio> element when WebAudio is suspended", () => {
    const played: string[] = [];
    class FakeAudioElement {
      src: string;
      constructor(src: string) {
        this.src = src;
      }
      play(): Promise<void> {
        played.push(this.src);
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, "Audio", {
      value: FakeAudioElement,
      configurable: true,
      writable: true,
    });
    try {
      const context = FakeAudioContext.last;
      expect(context).not.toBeNull();
      if (context) context.state = "suspended";
      expect(playUniversalPcm(new Float32Array([0.1, -0.1]))).toBe(true);
      expect(played).toHaveLength(1);
      expect(played[0]?.startsWith("data:audio/wav;base64,")).toBe(true);
      if (context) context.state = "running";
    } finally {
      delete (window as Window & { Audio?: unknown }).Audio;
    }
  });

  it("keeps a readable formant cadence even at zero OS voices", () => {
    const cadence = formantCadencePcm("15 a 12, Tiburones");
    expect(cadence.length).toBeGreaterThan(44100 / 4);
    expect(cadence.some((value) => Math.abs(value) > 0.1)).toBe(true);
  });
});

describe("v10.1 4-tier court voice", () => {
  class FakeUtterance {
    text: string;
    lang = "";
    rate = 1;
    volume = 1;
    voice: SpeechSynthesisVoice | null = null;
    constructor(text = "") {
      this.text = text;
    }
  }

  const spoken: FakeUtterance[] = [];
  const speak = vi.fn((utterance: FakeUtterance) => {
    spoken.push(utterance);
  });
  const cancel = vi.fn();

  const defineSynth = (voices: SpeechSynthesisVoice[] | null): void => {
    const synth: Record<string, unknown> = { speak, cancel, resume: vi.fn() };
    if (voices !== null) synth.getVoices = () => voices;
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  };

  beforeEach(() => {
    spoken.length = 0;
    speak.mockClear();
    cancel.mockClear();
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    delete (window as BridgeWindow).VoleyOSBridge;
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
  });

  it("tier 1: native Android TTS wins when the bridge speaks", async () => {
    const nativeSpeak = vi.fn(() => true);
    Object.defineProperty(window, "VoleyOSBridge", {
      value: { speakNativeTts: nativeSpeak },
      configurable: true,
    });
    defineSynth([esVoice]);
    expect(await speakCourtVoice("15 a 12, Tiburones", "es")).toBe("native");
    expect(nativeSpeak).toHaveBeenCalledWith("15 a 12, Tiburones", "es");
    expect(speak).not.toHaveBeenCalled();
  });

  it("tier 2: falls to a locale-matched Web voice when native refuses", async () => {
    Object.defineProperty(window, "VoleyOSBridge", {
      value: { speakNativeTts: vi.fn(() => false) },
      configurable: true,
    });
    defineSynth([
      { lang: "de-DE", name: "Deutsch", localService: true, default: false, voiceURI: "de-DE" },
      esVoice,
    ]);
    expect(await speakCourtVoice("Ventaja 15 a 12", "es")).toBe("web-locale");
    expect(cancel).toHaveBeenCalled();
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.text).toContain("15 a 12");
    expect(spoken[0]?.voice?.lang).toBe("es-AR");
  });

  it("tier 3: uses whatever voice the device has when none matches", async () => {
    defineSynth([
      { lang: "de-DE", name: "Deutsch", localService: true, default: false, voiceURI: "de-DE" },
    ]);
    expect(await speakCourtVoice("Set point", "es")).toBe("web-any");
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.voice?.lang).toBe("de-DE");
  });

  it("tier 4: formant cadence when the device has zero OS voices", async () => {
    defineSynth([]);
    expect(await speakCourtVoice("15 a 12", "es")).toBe("formant");
    expect(speak).not.toHaveBeenCalled();
  });

  it("tier 4: no speechSynthesis at all also lands on the formant cadence", async () => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
    expect(await speakCourtVoice("Tiro libre", "es")).toBe("formant");
    expect(speak).not.toHaveBeenCalled();
  });

  it("keeps legacy engines talking when getVoices is unavailable", async () => {
    defineSynth(null); // no getVoices function at all
    expect(await speakCourtVoice("Saque corto", "es")).toBe("web-any");
    expect(spoken).toHaveLength(1);
    expect(cancel).toHaveBeenCalled();
  });

  it("returns off without a window or empty text", async () => {
    expect(await speakCourtVoice("", "es")).toBe("off");
  });
});
