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
    gain.connect(audio.destination);
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
    gain.connect(audio.destination);
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
  gain.connect(audio.destination);
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
  gain.connect(audio.destination);
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
    gain.connect(audio.destination);
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
    gain.connect(audio.destination);
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
  gain.connect(audio.destination);

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
  punchGain.connect(audio.destination);
  punch.start(start);
  punch.stop(start + duration);

  const slap = audio.createOscillator();
  slap.type = "sawtooth";
  slap.frequency.value = MIKASA_THUMP_SPEC.slapHz;
  const slapGain = audio.createGain();
  slapGain.gain.setValueAtTime(volume * 0.35, start);
  slapGain.gain.exponentialRampToValueAtTime(0.001, start + 0.03);
  slap.connect(slapGain);
  slapGain.connect(audio.destination);
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
  gain.connect(audio.destination);
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
    gain.connect(audio.destination);
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
  chimeGain.connect(audio.destination);
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
    gain.connect(audio.destination);
    osc.start(cursor);
    osc.stop(cursor + duration);
    cursor += duration * 0.8;
  });
  return true;
}
