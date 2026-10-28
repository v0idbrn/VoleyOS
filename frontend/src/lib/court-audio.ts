// Legacy court-audio facade. v10.1.2 unifies all court audio behind the
// high-gain PCM + native AudioTrack engine in `sound-effects.ts`, so every
// automatic match event now plays the same loud Fox 40 / FIVB horn used by
// the manual sound bar. Every exported name, signature and return type is
// preserved so existing `vi.spyOn(courtAudio, ...)` spies and component
// imports keep working unchanged.
import {
  playBuzzer,
  playCrowdCheer,
  playJudgeGavel,
  playMikasaSpikeThump,
  playPicaditoCue,
  playSetWinFanfare,
  playWhistle as playUnifiedWhistle,
} from "@/lib/sound-effects";

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

export type ArenaCue =
  | "MONSTER_BLOCK"
  | "SUPER_SPIKE"
  | "ACE_SIREN"
  | "VIDEO_CHALLENGE_SUSPENSE"
  | "SET_POINT_HEARTBEAT";

export const ARENA_CUE_PLANS: Record<
  ArenaCue,
  { frequencies: number[]; durationsMs: number[]; waveform: OscillatorType }
> = {
  MONSTER_BLOCK: { frequencies: [110, 82, 55], durationsMs: [180, 180, 260], waveform: "square" },
  SUPER_SPIKE: { frequencies: [330, 440, 660], durationsMs: [120, 120, 200], waveform: "sawtooth" },
  ACE_SIREN: { frequencies: [660, 880, 1320], durationsMs: [150, 150, 300], waveform: "sine" },
  VIDEO_CHALLENGE_SUSPENSE: {
    frequencies: [220, 220, 220],
    durationsMs: [220, 220, 440],
    waveform: "triangle",
  },
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

/** Arena cues now route through the loud unified engine in sound-effects. */
export function playArenaCue(cue: ArenaCue, volume = 0.5): boolean {
  if (!courtAudioEnabled) return false;
  switch (cue) {
    case "MONSTER_BLOCK":
      return playBuzzer(volume);
    case "SUPER_SPIKE":
      return playMikasaSpikeThump(volume);
    case "ACE_SIREN":
      return playPicaditoCue("ace", volume);
    case "VIDEO_CHALLENGE_SUSPENSE":
      return playJudgeGavel(volume);
    case "SET_POINT_HEARTBEAT":
      return playCrowdCheer(volume);
    default:
      return playSetWinFanfare(volume);
  }
}

/** The referee whistle now uses the Fox 40 dual-chamber PCM + native layer. */
export function playWhistle(kind: WhistleKind = "short", volume = 0.7): boolean {
  if (!courtAudioEnabled) return false;
  return playUnifiedWhistle(kind, volume);
}
