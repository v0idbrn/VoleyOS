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

export type ArenaCue = "MONSTER_BLOCK" | "SUPER_SPIKE" | "ACE_SIREN" | "VIDEO_CHALLENGE_SUSPENSE" | "SET_POINT_HEARTBEAT";

export const ARENA_CUE_PLANS: Record<ArenaCue, { frequencies: number[]; durationsMs: number[]; waveform: OscillatorType }> = {
  MONSTER_BLOCK: { frequencies: [110, 82, 55], durationsMs: [180, 180, 260], waveform: "square" },
  SUPER_SPIKE: { frequencies: [330, 440, 660], durationsMs: [120, 120, 200], waveform: "sawtooth" },
  ACE_SIREN: { frequencies: [660, 880, 1320], durationsMs: [150, 150, 300], waveform: "sine" },
  VIDEO_CHALLENGE_SUSPENSE: { frequencies: [220, 220, 220], durationsMs: [220, 220, 440], waveform: "triangle" },
  SET_POINT_HEARTBEAT: { frequencies: [60, 55, 60], durationsMs: [180, 120, 260], waveform: "sine" },
};

let courtAudioEnabled = true;

/** Global switch wired to the native Settings tab. */
export function setCourtAudioEnabled(enabled: boolean): void {
  courtAudioEnabled = enabled;
}

export function courtAudioActive(): boolean {
  return courtAudioEnabled;
}

export function playArenaCue(cue: ArenaCue, volume = 0.5): boolean {
  if (!courtAudioEnabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  void audio.resume().catch(() => undefined);
  const plan = ARENA_CUE_PLANS[cue];
  let cursor = audio.currentTime;
  plan.frequencies.forEach((frequency, index) => {
    const duration = (plan.durationsMs[index] ?? 180) / 1000;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = plan.waveform;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, cursor);
    gain.gain.linearRampToValueAtTime(volume, cursor + 0.012);
    gain.gain.linearRampToValueAtTime(0, cursor + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + duration);
    cursor += duration;
  });
  return true;
}

type AudioContextClass = new () => AudioContext;
type AudioWindow = Window & { webkitAudioContext?: AudioContextClass };

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  try {
    const AudioCtor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    return context;
  } catch {
    // Restricted WebViews can throw on construction: audio must never take
    // the scoreboard down.
    return null;
  }
}

export function playWhistle(kind: WhistleKind = "short", volume = 0.7): boolean {
  if (!courtAudioEnabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  void audio.resume().catch(() => undefined);
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
