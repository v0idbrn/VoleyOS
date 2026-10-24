/**
 * Studio-grade WebAudio synthes for the court tab. Everything is generated
 * locally (oscillators + filters), zero audio assets, zero network.
 */

export type WhistleKind = "short" | "long" | "double";

/** Fox 40 style pea whistle: dual detuned highs + 48 Hz pea modulation. */
export const WHISTLE_SPEC = {
  highHz: 3740,
  detunedHz: 4060,
  peaHz: 48,
  highPassHz: 2800,
  breathMs: 12,
  durationsMs: { short: 160, long: 650, double: 150 } as Record<WhistleKind, number>,
} as const;

/** FIVB table horn / chicharra: three-oscillator chord through a soft clipper. */
export const BUZZER_SPEC = {
  freqsHz: [146.8, 293.6, 438],
  durationMs: 900,
} as const;

export const POP_SPEC = {
  freqHz: 620,
  durationMs: 70,
} as const;

export const FANFARE_SPEC = {
  freqsHz: [392, 494, 587],
  durationMs: 640,
} as const;

let enabled = true;

/** Global switch wired to the native Settings tab. */
export function setSoundEffectsEnabled(next: boolean): void {
  enabled = next;
}

export function soundEffectsActive(): boolean {
  return enabled;
}

type AudioContextClass = new () => AudioContext;
type AudioWindow = Window & { webkitAudioContext?: AudioContextClass };

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioCtor) return null;
  context = new AudioCtor();
  return context;
}

function resume(audio: AudioContext): void {
  void audio.resume();
}

/** Dual detuned oscillators + 48 Hz FM pea modulation + 2800 Hz high-pass + breath attack. */
export function playWhistle(kind: WhistleKind = "short", volume = 0.6): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = WHISTLE_SPEC.durationsMs[kind] / 1000;

  const highpass = audio.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = WHISTLE_SPEC.highPassHz;
  highpass.connect(audio.destination);

  const master = audio.createGain();
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(volume, start + 0.008);
  master.gain.setValueAtTime(volume, start + duration - 0.03);
  master.gain.linearRampToValueAtTime(0, start + duration);
  master.connect(highpass);

  for (const baseHz of [WHISTLE_SPEC.highHz, WHISTLE_SPEC.detunedHz]) {
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.value = baseHz;
    // 48 Hz pea rattle wobbles the pitch like a real Fox 40.
    const pea = audio.createOscillator();
    pea.type = "sine";
    pea.frequency.value = WHISTLE_SPEC.peaHz;
    const peaGain = audio.createGain();
    peaGain.gain.value = 42;
    pea.connect(peaGain);
    peaGain.connect(osc.frequency);
    osc.connect(master);
    osc.start(start);
    osc.stop(start + duration);
    pea.start(start);
    pea.stop(start + duration);
  }

  // Breath burst attack so the onset sounds blown, not electronic.
  const noiseMs = WHISTLE_SPEC.breathMs / 1000;
  const burst = audio.createOscillator();
  burst.type = "sawtooth";
  burst.frequency.value = 1800;
  const burstGain = audio.createGain();
  burstGain.gain.setValueAtTime(volume * 0.5, start);
  burstGain.gain.linearRampToValueAtTime(0, start + noiseMs);
  burst.connect(burstGain);
  burstGain.connect(highpass);
  burst.start(start);
  burst.stop(start + noiseMs);

  if (kind === "double") {
    const second = start + 0.25;
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.value = WHISTLE_SPEC.highHz;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, second);
    gain.gain.linearRampToValueAtTime(volume, second + 0.008);
    gain.gain.linearRampToValueAtTime(0, second + 0.2);
    osc.connect(gain);
    gain.connect(highpass);
    osc.start(second);
    osc.stop(second + 0.2);
  }
  return true;
}

/** 3-oscillator saw/square chord through a soft-clipping WaveShaperNode. */
export function playBuzzer(volume = 0.55): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = BUZZER_SPEC.durationMs / 1000;

  const shaper = audio.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * 3);
  }
  shaper.curve = curve;
  shaper.connect(audio.destination);

  const master = audio.createGain();
  master.gain.setValueAtTime(volume, start);
  master.gain.setValueAtTime(volume, start + duration - 0.06);
  master.gain.linearRampToValueAtTime(0, start + duration);
  master.connect(shaper);

  BUZZER_SPEC.freqsHz.forEach((freq, index) => {
    const osc = audio.createOscillator();
    osc.type = index === 0 ? "sawtooth" : "square";
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start(start);
    osc.stop(start + duration);
  });
  return true;
}

/** Crisp wood-court ball pop on every point. */
export function playScorePop(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = POP_SPEC.durationMs / 1000;
  const osc = audio.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(POP_SPEC.freqHz, start);
  osc.frequency.exponentialRampToValueAtTime(140, start + duration);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
  return true;
}

/** Major triad fanfare on set / match win. */
export function playSetWinFanfare(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = FANFARE_SPEC.durationMs / 1000;
  const master = audio.createGain();
  master.gain.setValueAtTime(volume, start);
  master.gain.setValueAtTime(volume, start + duration - 0.12);
  master.gain.linearRampToValueAtTime(0, start + duration);
  master.connect(audio.destination);
  FANFARE_SPEC.freqsHz.forEach((freq) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const tone = audio.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    osc.connect(tone);
    tone.connect(master);
    osc.start(start);
    osc.stop(start + duration);
  });
  return true;
}
