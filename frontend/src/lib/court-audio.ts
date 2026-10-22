export type WhistleKind = "short" | "long" | "double";

export interface ToneStep {
  frequency: number;
  durationMs: number;
  gapMs: number;
  gain: number;
}

export const WHISTLE_PLANS: Record<WhistleKind, ToneStep[]> = {
  short: [{ frequency: 2100, durationMs: 180, gapMs: 0, gain: 0.18 }],
  long: [{ frequency: 2100, durationMs: 700, gapMs: 0, gain: 0.2 }],
  double: [
    { frequency: 2100, durationMs: 140, gapMs: 100, gain: 0.18 },
    { frequency: 2400, durationMs: 220, gapMs: 0, gain: 0.2 },
  ],
};

export function whistleDurationMs(kind: WhistleKind): number {
  return WHISTLE_PLANS[kind].reduce((total, step) => total + step.durationMs + step.gapMs, 0);
}

type AudioContextClass = new () => AudioContext;
type AudioWindow = Window & { webkitAudioContext?: AudioContextClass };

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const AudioCtor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioCtor) return null;
  context = new AudioCtor();
  return context;
}

export function playWhistle(kind: WhistleKind = "short", volume = 0.7): boolean {
  const audio = audioContext();
  if (!audio) return false;
  void audio.resume();
  const start = audio.currentTime;
  let cursor = start;
  for (const step of WHISTLE_PLANS[kind]) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = step.frequency;
    gain.gain.setValueAtTime(0, cursor);
    gain.gain.linearRampToValueAtTime(step.gain * volume, cursor + 0.01);
    gain.gain.setValueAtTime(step.gain * volume, cursor + step.durationMs / 1000 - 0.02);
    gain.gain.linearRampToValueAtTime(0, cursor + step.durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + step.durationMs / 1000);
    cursor += (step.durationMs + step.gapMs) / 1000;
  }
  return true;
}
