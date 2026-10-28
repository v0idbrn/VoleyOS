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
  try {
    const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    return context;
  } catch {
    // Restricted WebViews can throw on construction: audio must never take
    // the scoreboard down.
    return null;
  }
}

function resume(audio: AudioContext): void {
  void audio.resume().catch(() => undefined);
}

let autoResumeInstalled = false;

/**
 * v9.4 — an incoming call or a locked screen must never leave the referee
 * whistle silent: any user gesture revives the shared AudioContext.
 */
export function installAudioAutoResume(): boolean {
  if (autoResumeInstalled || typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return false;
  }
  autoResumeInstalled = true;
  const revive = (): void => {
    try {
      const audio = audioContext();
      if (audio) resume(audio);
    } catch {
      /* gesture without audio support: nothing to revive */
    }
  };
  window.addEventListener("pointerdown", revive, { passive: true });
  window.addEventListener("keydown", revive);
  return true;
}

installAudioAutoResume();

/** Fox 40 dual-chamber PCM whistle + native AudioTrack layer, through the gym bus. */
export function playWhistle(kind: WhistleKind = "short", volume = 0.6): boolean {
  if (!enabled) return false;
  nativeHardwareCue(
    kind === "double" ? "whistle_double" : kind === "long" ? "whistle_long" : "whistle_short",
  );
  return playUniversalPcm(scalePcm(synthFox40Pcm(kind), volume));
}

/** 0.85 s FIVB air-horn PCM + native AudioTrack layer, through the gym bus. */
export function playBuzzer(volume = 0.55): boolean {
  if (!enabled) return false;
  nativeHardwareCue("buzzer");
  return playUniversalPcm(scalePcm(synthFivbHornPcm(), volume));
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
  gain.connect(masterBus(audio));
  osc.start(start);
  osc.stop(start + duration);
  return true;
}

/** Major triad fanfare on set / match win, layered over the stadium crowd. */
export function playSetWinFanfare(volume = 0.5): boolean {
  playCrowdCheer(1);
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
  master.connect(masterBus(audio));
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

/* ------------------------------------------------------------------ *
 * v9.2 studio cues: picadito events, stadium crowd, warmup ticks,
 * Vaquita coin clink and the Judge's gavel. All synthesised locally.
 * ------------------------------------------------------------------ */

export type PicaditoCue = "sideout" | "ace" | "kill" | "serve_cap";

export const PICADITO_CUE_SPEC: Record<
  PicaditoCue,
  { notesHz: number[]; durationsMs: number[]; waveform: OscillatorType }
> = {
  sideout: { notesHz: [523, 784], durationsMs: [110, 180], waveform: "triangle" },
  ace: { notesHz: [880, 1480], durationsMs: [90, 240], waveform: "sawtooth" },
  kill: { notesHz: [110, 42], durationsMs: [520], waveform: "sine" },
  serve_cap: { notesHz: [1046, 1318], durationsMs: [85, 95], waveform: "square" },
};

export const CROWD_SPEC = { durationMs: 1500, bandHz: 900, defaultVolume: 0.7 } as const;
export const WARMUP_TICK_SPEC = { freqHz: 1180, finalFreqHz: 1560, durationMs: 55 } as const;
export const COIN_CLINK_SPEC = { freqsHz: [2400, 3850], durationMs: 220 } as const;
export const JUDGE_GAVEL_SPEC = { freqsHz: [140, 95], durationsMs: [90, 150], gapMs: 120 } as const;

let crowdVolume: number = CROWD_SPEC.defaultVolume;

/** 0..1 stadium-ambience level wired to the Cancha and Settings sliders. */
export function setCrowdAmbience(volume: number): void {
  crowdVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : CROWD_SPEC.defaultVolume;
}

export function crowdAmbience(): number {
  return crowdVolume;
}

const CROWD_KEY = "volleyos.crowdVolume";

/** Restores the persisted stadium-crowd level (default 0.7). */
export function loadCrowdAmbience(): number {
  try {
    const raw = window.localStorage.getItem(CROWD_KEY);
    if (raw === null) return CROWD_SPEC.defaultVolume;
    const value = Number(raw);
    if (!Number.isFinite(value)) return CROWD_SPEC.defaultVolume;
    const clamped = Math.min(1, Math.max(0, value));
    crowdVolume = clamped;
    return clamped;
  } catch {
    return crowdVolume;
  }
}

/** Persists and applies a new stadium-crowd level (0..1). */
export function saveCrowdAmbience(volume: number): number {
  setCrowdAmbience(volume);
  try {
    window.localStorage.setItem(CROWD_KEY, String(crowdVolume));
  } catch {
    /* storage unavailable */
  }
  return crowdVolume;
}

/** Side-out chime / ace stinger / sub-bass kill boom / serve-cap double chirp. */
export function playPicaditoCue(cue: PicaditoCue, volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const spec = PICADITO_CUE_SPEC[cue];
  let cursor = audio.currentTime;

  if (cue === "kill") {
    // Deep court boom: 110 Hz collapsing to 42 Hz through the sub floor.
    const osc = audio.createOscillator();
    osc.type = spec.waveform;
    const duration = (spec.durationsMs[0] ?? 400) / 1000;
    osc.frequency.setValueAtTime(spec.notesHz[0] as number, cursor);
    osc.frequency.exponentialRampToValueAtTime(spec.notesHz[1] as number, cursor + duration);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, cursor);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + duration);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(cursor);
    osc.stop(cursor + duration);
    playMikasaSpikeThump(volume * 0.85);
    return true;
  }

  spec.notesHz.forEach((freq, index) => {
    const duration = (spec.durationsMs[index] ?? 120) / 1000;
    const osc = audio.createOscillator();
    osc.type = spec.waveform;
    osc.frequency.value = freq;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, cursor);
    gain.gain.linearRampToValueAtTime(volume, cursor + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + duration);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(cursor);
    osc.stop(cursor + duration);
    cursor += duration + 0.02;
  });
  if (cue === "ace") playNetCordSnap(volume * 0.7);
  return true;
}

/** 1.5 s bandpass-filtered stadium roar swell for set wins. */
export function playCrowdCheer(intensity = 1): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  const volume = crowdVolume * Math.min(1.2, Math.max(0, intensity));
  if (volume <= 0.01) return false;
  resume(audio);
  const duration = CROWD_SPEC.durationMs / 1000;
  const start = audio.currentTime;
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const bandpass = audio.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = CROWD_SPEC.bandHz;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume * 0.9, start + 0.35);
  gain.gain.setValueAtTime(volume * 0.9, start + duration * 0.6);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(masterBus(audio));
  source.start(start);
  source.stop(start + duration);
  return true;
}

/** Crisp woodblock countdown tick for the last 3-2-1 seconds of a warmup phase. */
export function playWarmupTick(finalSecond = false, volume = 0.45): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = WARMUP_TICK_SPEC.durationMs / 1000;
  const osc = audio.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = finalSecond ? WARMUP_TICK_SPEC.finalFreqHz : WARMUP_TICK_SPEC.freqHz;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(masterBus(audio));
  osc.start(start);
  osc.stop(start + duration);
  return true;
}

/** Bright two-partial metallic clink when La Vaquita settles. */
export function playCoinClink(volume = 0.45): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = COIN_CLINK_SPEC.durationMs / 1000;
  COIN_CLINK_SPEC.freqsHz.forEach((freq, index) => {
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = audio.createGain();
    const peak = index === 0 ? volume : volume * 0.6;
    gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(start);
    osc.stop(start + duration);
  });
  return true;
}

/** Double wooden gavel strike when the Judge drops a verdict. */
export function playJudgeGavel(volume = 0.6): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  JUDGE_GAVEL_SPEC.freqsHz.forEach((freq, index) => {
    const at = start + (index * (JUDGE_GAVEL_SPEC.durationsMs[0] + JUDGE_GAVEL_SPEC.gapMs)) / 1000;
    const duration = (JUDGE_GAVEL_SPEC.durationsMs[index] ?? 100) / 1000;
    const osc = audio.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(Math.round(freq * 0.6), at + duration);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(at);
    osc.stop(at + duration);
  });
  return true;
}

/* v9.5 — the Athlete's Edge: physical court textures + approach tempo. */

/** High-Q bandpass rubber-on-hardwood grip chirp (saw sweep). */
export const SNEAKER_SQUEAK_SPEC = {
  bandpassQ: 18,
  sweepHz: [2350, 3150, 2600],
  durationMs: 140,
} as const;

/** Compressed leather impact: subby punch drop + bright slap transient. */
export const MIKASA_THUMP_SPEC = {
  punchHz: [135, 52],
  slapHz: 900,
  durationMs: 65,
} as const;

/** Nylon net-cord twang: 320 -> 190 Hz FM pluck. */
export const NET_SNAP_SPEC = {
  carrierHz: 320,
  pluckHz: 190,
  durationMs: 120,
} as const;

export type ApproachTempo = "1st" | "2nd" | "3rd";

/** Step 1/2/3 plant offsets (ms) and the peak-contact chime for each tempo. */
export const APPROACH_CADENCE_SPEC: Record<
  ApproachTempo,
  { stepsMs: readonly number[]; contactMs: number }
> = {
  "1st": { stepsMs: [0, 220, 310], contactMs: 480 },
  "2nd": { stepsMs: [0, 340, 460], contactMs: 700 },
  "3rd": { stepsMs: [0, 480, 630], contactMs: 920 },
};

export const APPROACH_CADENCE_STEPS_HZ = [660, 660, 520] as const;
export const APPROACH_CONTACT_HZ = 1180;

/** Q=18 bandpass saw sweep 2350 -> 3150 -> 2600 Hz over 140 ms. */
export function playSneakerSqueak(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = SNEAKER_SQUEAK_SPEC.durationMs / 1000;

  const bandpass = audio.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = SNEAKER_SQUEAK_SPEC.sweepHz[0] ?? SNEAKER_SQUEAK_SPEC.sweepHz[0];
  bandpass.Q.value = SNEAKER_SQUEAK_SPEC.bandpassQ;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  bandpass.connect(gain);
  gain.connect(masterBus(audio));

  const osc = audio.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(SNEAKER_SQUEAK_SPEC.sweepHz[0] ?? 2350, start);
  osc.frequency.linearRampToValueAtTime(SNEAKER_SQUEAK_SPEC.sweepHz[1] ?? 3150, start + duration * 0.45);
  osc.frequency.linearRampToValueAtTime(SNEAKER_SQUEAK_SPEC.sweepHz[2] ?? 2600, start + duration);
  osc.connect(bandpass);
  osc.start(start);
  osc.stop(start + duration);
  return true;
}

/** Hard-kill leather impact: 135 -> 52 Hz sine punch + 900 Hz slap over 65 ms. */
export function playMikasaSpikeThump(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = MIKASA_THUMP_SPEC.durationMs / 1000;

  const punch = audio.createOscillator();
  punch.type = "sine";
  punch.frequency.setValueAtTime(MIKASA_THUMP_SPEC.punchHz[0] ?? 135, start);
  punch.frequency.exponentialRampToValueAtTime(MIKASA_THUMP_SPEC.punchHz[1] ?? 52, start + duration);
  const punchGain = audio.createGain();
  punchGain.gain.setValueAtTime(volume, start);
  punchGain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  punch.connect(punchGain);
  punchGain.connect(masterBus(audio));
  punch.start(start);
  punch.stop(start + duration);

  const slap = audio.createOscillator();
  slap.type = "sawtooth";
  slap.frequency.value = MIKASA_THUMP_SPEC.slapHz;
  const slapGain = audio.createGain();
  slapGain.gain.setValueAtTime(volume * 0.35, start);
  slapGain.gain.exponentialRampToValueAtTime(0.001, start + 0.03);
  slap.connect(slapGain);
  slapGain.connect(masterBus(audio));
  slap.start(start);
  slap.stop(start + 0.045);
  return true;
}

/** Service-ace net-cord twang: 320 -> 190 Hz FM pluck over 120 ms. */
export function playNetCordSnap(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const duration = NET_SNAP_SPEC.durationMs / 1000;

  const carrier = audio.createOscillator();
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(NET_SNAP_SPEC.carrierHz, start);
  carrier.frequency.exponentialRampToValueAtTime(NET_SNAP_SPEC.pluckHz, start + duration);

  // 2:1 FM partial decaying in 60 ms gives the nylon cable its bite.
  const fm = audio.createOscillator();
  fm.type = "sine";
  fm.frequency.value = NET_SNAP_SPEC.carrierHz * 2;
  const fmGain = audio.createGain();
  fmGain.gain.setValueAtTime(120, start);
  fmGain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
  fm.connect(fmGain);
  fmGain.connect(carrier.frequency);
  fm.start(start);
  fm.stop(start + duration);

  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  carrier.connect(gain);
  gain.connect(masterBus(audio));
  carrier.start(start);
  carrier.stop(start + duration);
  return true;
}

/** 3-step approach rhythm: plant ticks at the tempo offsets + peak-contact chime. */
export function playApproachCadence(tempo: ApproachTempo, volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  const start = audio.currentTime;
  const spec = APPROACH_CADENCE_SPEC[tempo];

  spec.stepsMs.forEach((offsetMs, index) => {
    const at = start + offsetMs / 1000;
    const osc = audio.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = APPROACH_CADENCE_STEPS_HZ[index] ?? 660;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(at);
    osc.stop(at + 0.07);
  });

  const contactAt = start + spec.contactMs / 1000;
  const chime = audio.createOscillator();
  chime.type = "sine";
  chime.frequency.value = APPROACH_CONTACT_HZ;
  const chimeGain = audio.createGain();
  chimeGain.gain.setValueAtTime(0, contactAt);
  chimeGain.gain.linearRampToValueAtTime(volume * 0.8, contactAt + 0.012);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, contactAt + 0.25);
  chime.connect(chimeGain);
  chimeGain.connect(masterBus(audio));
  chime.start(contactAt);
  chime.stop(contactAt + 0.25);
  return true;
}

export const LEVEL_UP_ARPEGGIO_SPEC = { freqsHz: [523, 659, 784, 1047], noteMs: 90 } as const;

/** Rising 4-note arpeggio when the career VolleyCard levels its OVR up. */
export function playLevelUpArpeggio(volume = 0.5): boolean {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  resume(audio);
  let cursor = audio.currentTime;
  LEVEL_UP_ARPEGGIO_SPEC.freqsHz.forEach((freq, index) => {
    const duration = LEVEL_UP_ARPEGGIO_SPEC.noteMs / 1000;
    const osc = audio.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = audio.createGain();
    const peak = index === LEVEL_UP_ARPEGGIO_SPEC.freqsHz.length - 1 ? volume : volume * 0.75;
    gain.gain.setValueAtTime(0, cursor);
    gain.gain.linearRampToValueAtTime(peak, cursor + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, cursor + duration);
    osc.connect(gain);
    gain.connect(masterBus(audio));
    osc.start(cursor);
    osc.stop(cursor + duration);
    cursor += duration * 0.8;
  });
  return true;
}

/* ------------------------------------------------------------------ *
 * v10.1 universal audio: in-memory RIFF WAV, WebAudio/HTML5 dual
 * player, high-gain Fox 40 / FIVB horn PCM and the 4-tier court voice.
 * ------------------------------------------------------------------ */

export const UNIVERSAL_PCM_SPEC = { sampleRate: 44100, gymBoostDb: 9 } as const;

/** Fox 40 dual-chamber PCM numbers (mirrored by the native AudioTrack synth). */
export const FOX40_PCM_SPEC = {
  frequenciesHz: [3745, 4085, 7490],
  peaHz: 54,
  bandpassHz: 3600,
  attackSec: 0.008,
  durationsSec: { short: 0.45, long: 1.1, double: 0.86 },
  doubleGapSec: [0.4, 0.54] as const,
} as const;

/** FIVB table air-horn PCM numbers: 7 brass harmonics, 18 Hz growl, tanh(3.2x). */
export const FIVB_HORN_PCM_SPEC = {
  durationSec: 0.85,
  baseHz: 196,
  stepHz: 98,
  harmonics: 7,
  growlHz: 18,
  saturation: 3.2,
} as const;

type NativeBridge = {
  speakNativeTts?: (text: string, langCode: string) => boolean;
  stopNativeTts?: () => void;
  playNativeHardwareCue?: (cueType: string) => boolean;
};

type BridgeWindow = Window & { VoleyOSBridge?: NativeBridge; VosleyOSBridge?: NativeBridge };

function nativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  const bridgeWindow = window as BridgeWindow;
  return bridgeWindow.VoleyOSBridge ?? bridgeWindow.VosleyOSBridge ?? null;
}

/** Pushes a cue to the native AudioTrack mixer when running inside the APK. */
function nativeHardwareCue(cueType: string): boolean {
  try {
    return nativeBridge()?.playNativeHardwareCue?.(cueType) ?? false;
  } catch {
    return false;
  }
}

/** Valid 44-byte RIFF/WAVEfmt header + 16-bit PCM mono → Base64 data URI. */
export function encodePcmToWavDataUri(
  samples: Float32Array,
  sampleRate = UNIVERSAL_PCM_SPEC.sampleRate,
): string {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeTag = (offset: number, tag: string): void => {
    for (let index = 0; index < tag.length; index += 1) view.setUint8(offset + index, tag.charCodeAt(index));
  };
  writeTag(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeTag(8, "WAVE");
  writeTag(12, "fmt ");
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeTag(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const masterBuses = new WeakMap<object, AudioNode>();

/** Shared +9 dB gym-boost → compressor → tanh soft-clip bus every cue rides. */
function masterBus(audio: AudioContext): AudioNode {
  const key = audio as unknown as object;
  const cached = masterBuses.get(key);
  if (cached) return cached;
  try {
    const boost = audio.createGain();
    boost.gain.value = Math.pow(10, UNIVERSAL_PCM_SPEC.gymBoostDb / 20);
    const compressor = audio.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 8;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.12;
    const limiter = audio.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let index = 0; index < curve.length; index += 1) {
      const x = (index / (curve.length - 1)) * 2 - 1;
      curve[index] = Math.tanh(1.8 * x);
    }
    limiter.curve = curve;
    boost.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(audio.destination);
    masterBuses.set(key, boost);
    return boost;
  } catch {
    // Minimal test fakes / restricted engines expose a bare destination.
    return audio.destination;
  }
}

function playViaAudioElement(dataUri: string): boolean {
  if (typeof Audio === "undefined") return false;
  try {
    const element = new Audio(dataUri);
    void Promise.resolve(element.play()).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

function schedulePcm(audio: AudioContext, samples: Float32Array, sampleRate: number): void {
  const buffer = audio.createBuffer(1, samples.length, sampleRate);
  const channel = buffer.getChannelData(0);
  channel.set(samples.subarray(0, channel.length));
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(masterBus(audio));
  source.start(audio.currentTime);
}

function scalePcm(samples: Float32Array, volume: number): Float32Array {
  const gain = Math.max(0, Math.min(1, volume));
  if (gain === 1) return samples;
  const scaled = new Float32Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    scaled[index] = (samples[index] ?? 0) * gain;
  }
  return scaled;
}

function clampSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Plays PCM on any device: WebAudio through the gym-boost bus while the
 * context runs, and a RIFF WAV `<audio>` element when WebAudio is suspended
 * or restricted (classic iOS Safari). No AudioContext at all → false.
 */
export function playUniversalPcm(
  samples: Float32Array,
  sampleRate = UNIVERSAL_PCM_SPEC.sampleRate,
): boolean {
  if (!enabled || samples.length === 0) return false;
  const audio = audioContext();
  if (!audio) return false;
  const state = (audio as AudioContext & { state?: string }).state;
  if (state === undefined || state === "running") {
    try {
      schedulePcm(audio, samples, sampleRate);
      return true;
    } catch {
      return playViaAudioElement(encodePcmToWavDataUri(samples, sampleRate));
    }
  }
  resume(audio);
  return playViaAudioElement(encodePcmToWavDataUri(samples, sampleRate));
}

/** Pure-TS Fox 40 dual-chamber whistle PCM (mirrors the native synth). */
export function synthFox40Pcm(
  kind: WhistleKind,
  sampleRate = UNIVERSAL_PCM_SPEC.sampleRate,
): Float32Array {
  const duration = FOX40_PCM_SPEC.durationsSec[kind];
  const total = Math.floor(duration * sampleRate);
  const pcm = new Float32Array(total);
  const gapStart = kind === "double" ? FOX40_PCM_SPEC.doubleGapSec[0] : -1;
  const gapEnd = kind === "double" ? FOX40_PCM_SPEC.doubleGapSec[1] : -1;
  // 2nd-order band-pass (fc 3600 Hz) for the 2.8–4.4 kHz air rush.
  const w0 = (2 * Math.PI * FOX40_PCM_SPEC.bandpassHz) / sampleRate;
  const alpha = Math.sin(w0) / 2;
  const b0 = alpha;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let seed = 0x564f53;
  const noise = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  const [f1 = 3745, f2 = 4085, f3 = 7490] = FOX40_PCM_SPEC.frequenciesHz;
  for (let index = 0; index < total; index += 1) {
    const t = index / sampleRate;
    if (gapStart > 0 && t >= gapStart && t < gapEnd) continue;
    const burstT = gapStart > 0 && t >= gapEnd ? t - gapEnd : t;
    const attack = Math.min(1, burstT / FOX40_PCM_SPEC.attackSec);
    const pea = 1 + 0.28 * Math.sin(2 * Math.PI * FOX40_PCM_SPEC.peaHz * burstT);
    const envelope = attack * Math.exp(-1.6 * burstT);
    const raw = noise();
    const band = (b0 * raw + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = raw;
    y2 = y1;
    y1 = band;
    const core =
      Math.sin(2 * Math.PI * f1 * burstT) +
      Math.sin(2 * Math.PI * f2 * burstT) +
      0.5 * Math.sin(2 * Math.PI * f3 * burstT);
    pcm[index] = clampSample(envelope * pea * (core / 2.5 + band * 0.35));
  }
  return pcm;
}

/** 0.85 s FIVB air-horn PCM: 7 brass harmonics 196→784 Hz, 18 Hz growl, tanh(3.2x). */
export function synthFivbHornPcm(sampleRate = UNIVERSAL_PCM_SPEC.sampleRate): Float32Array {
  const total = Math.floor(FIVB_HORN_PCM_SPEC.durationSec * sampleRate);
  const pcm = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    const t = index / sampleRate;
    const attack = Math.min(1, t / 0.012);
    const release =
      t > 0.7 ? Math.max(0, (FIVB_HORN_PCM_SPEC.durationSec - t) / 0.15) : 1;
    const growl = 1 + 0.25 * Math.sin(2 * Math.PI * FIVB_HORN_PCM_SPEC.growlHz * t);
    let brass = 0;
    for (let harmonic = 0; harmonic < FIVB_HORN_PCM_SPEC.harmonics; harmonic += 1) {
      const frequency = FIVB_HORN_PCM_SPEC.baseHz + FIVB_HORN_PCM_SPEC.stepHz * harmonic;
      brass += Math.sin(2 * Math.PI * frequency * t) / (harmonic + 1);
    }
    const driven = (attack * release * growl * brass) / 3.2;
    pcm[index] = clampSample(Math.tanh(FIVB_HORN_PCM_SPEC.saturation * driven) / Math.tanh(3.2));
  }
  return pcm;
}

const VOWEL_FORMANTS_HZ: readonly (readonly [number, number, number])[] = [
  [730, 1090, 2440], // a
  [530, 1840, 2480], // e
  [270, 2290, 3000], // i
  [570, 840, 2410], // o
  [300, 870, 2240], // u
];

/**
 * Tier-4 acoustic fallback: a 3-formant vocal cadence with court-announcement
 * prosody plus a melodic two-note tail, so a device with zero OS voices is
 * never silent.
 */
export function formantCadencePcm(
  text: string,
  sampleRate = UNIVERSAL_PCM_SPEC.sampleRate,
): Float32Array {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const syllables = Math.min(18, Math.max(1, words.length + Math.floor(trimmed.length / 14)));
  const syllableSec = 0.16;
  const tailSec = 0.36;
  const total = Math.floor((syllables * syllableSec + tailSec) * sampleRate);
  const pcm = new Float32Array(total);
  const rising = trimmed.endsWith("?");
  for (let index = 0; index < syllables; index += 1) {
    const formants = VOWEL_FORMANTS_HZ[index % VOWEL_FORMANTS_HZ.length] ?? [730, 1090, 2440];
    const [f1, f2, f3] = formants;
    const start = Math.floor(index * syllableSec * sampleRate);
    const length = Math.floor(syllableSec * sampleRate);
    const isLast = index === syllables - 1;
    // Falling declarative cadence; questions lift on the last syllable.
    const f0 = (rising && isLast ? 190 : 165) - index * 2.5;
    const consonantSamples = Math.floor(0.018 * sampleRate);
    for (let sample = 0; sample < length; sample += 1) {
      const at = start + sample;
      if (at >= total) break;
      const t = sample / sampleRate;
      const envelope = Math.min(1, t / 0.02) * Math.max(0, 1 - t / (syllableSec * 1.15));
      const voiced =
        0.35 * Math.sin(2 * Math.PI * f0 * t) +
        Math.sin(2 * Math.PI * f1 * t) +
        0.5 * Math.sin(2 * Math.PI * f2 * t) +
        0.25 * Math.sin(2 * Math.PI * f3 * t);
      const consonant = sample < consonantSamples ? 0.3 * Math.sin(2 * Math.PI * 3100 * t) : 0;
      pcm[at] = clampSample((pcm[at] ?? 0) + envelope * (voiced * 0.28 + consonant));
    }
  }
  // Melodic two-note tail: reads as an announcement, not a flat buzz.
  const tailStart = Math.floor(syllables * syllableSec * sampleRate);
  [880, 1174].forEach((frequency, part) => {
    const offset = Math.floor(part * 0.15 * sampleRate);
    const length = Math.floor(0.15 * sampleRate);
    for (let sample = 0; sample < length; sample += 1) {
      const at = tailStart + offset + sample;
      if (at >= total) break;
      const t = sample / sampleRate;
      const envelope = Math.min(1, t / 0.01) * Math.max(0, 1 - t / 0.15);
      pcm[at] = clampSample((pcm[at] ?? 0) + envelope * 0.4 * Math.sin(2 * Math.PI * frequency * t));
    }
  });
  return pcm;
}

export type VoiceTier = "native" | "web-locale" | "web-any" | "formant" | "off";

const PREFERRED_VOICE_TAGS: Record<string, string[]> = {
  es: ["es-ar", "es-es", "es-us", "es"],
  pt: ["pt-br", "pt-pt", "pt"],
  en: ["en-us", "en-gb", "en"],
};

function normalizeLang(tag: string | undefined): string {
  return (tag ?? "").replace("_", "-").toLowerCase();
}

/**
 * v10.1 4-tier zero-fail court announcer. The cascade runs synchronously so
 * the winning tier speaks before the returned promise settles:
 *   1. native Android TextToSpeech (VoleyOSBridge.speakNativeTts)
 *   2. speechSynthesis with a locale-matched installed voice (es-AR ➔ es-*)
 *   3. speechSynthesis with whatever voice the device does have
 *   4. acoustic 3-formant vocal cadence through playUniversalPcm
 * A device with zero OS voices (or no speechSynthesis at all) jumps straight
 * to tier 4 — no device is ever silent.
 */
export async function speakCourtVoice(text: string, locale = "es"): Promise<VoiceTier> {
  if (!text || typeof window === "undefined") return "off";
  const lang = (locale || "es").slice(0, 2).toLowerCase();

  // Tier 1 — native Android TTS.
  const bridge = nativeBridge();
  if (bridge?.speakNativeTts) {
    try {
      if (bridge.speakNativeTts(text, lang)) return "native";
    } catch {
      // Native engine refused: fall through to the Web Speech tiers.
    }
  }

  // Tiers 2/3 — Web Speech API with the cancel()+resume() anti-freeze guard.
  const synth = typeof window.speechSynthesis === "object" ? window.speechSynthesis : null;
  // Resolve the constructor from the window first, then the bare global, so
  // embedded stubs of either shape keep the announcer talking.
  const Utterance =
    typeof window.SpeechSynthesisUtterance === "function"
      ? window.SpeechSynthesisUtterance
      : typeof SpeechSynthesisUtterance === "function"
        ? SpeechSynthesisUtterance
        : null;
  if (synth && Utterance && typeof synth.speak === "function") {
    const voices = typeof synth.getVoices === "function" ? synth.getVoices() : null;
    if (voices === null || voices.length > 0) {
      try {
        synth.cancel();
        if (typeof synth.resume === "function") synth.resume();
        const utterance = new Utterance(text);
        let tier: VoiceTier = "web-any";
        if (voices && voices.length > 0) {
          const preferred = PREFERRED_VOICE_TAGS[lang] ?? [lang];
          const exact = preferred.find((tag) =>
            voices.some((voice) => normalizeLang(voice.lang) === tag),
          );
          const match =
            (exact
              ? voices.find((voice) => normalizeLang(voice.lang) === exact)
              : voices.find((voice) => normalizeLang(voice.lang).startsWith(lang))) ?? voices[0];
          if (match) {
            utterance.voice = match;
            utterance.lang = match.lang || lang;
            tier = normalizeLang(match.lang).startsWith(lang) ? "web-locale" : "web-any";
          }
        } else {
          utterance.lang = PREFERRED_VOICE_TAGS[lang]?.[0] ?? lang;
        }
        utterance.rate = 1.05;
        utterance.volume = 1;
        synth.speak(utterance);
        return tier;
      } catch {
        // The Web Speech engine exploded: formant tier below.
      }
    }
  }

  // Tier 4 — acoustic formant cadence: audible with zero OS voices.
  playUniversalPcm(formantCadencePcm(text));
  return "formant";
}
