"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import jsQR from "jsqr";

import { playArenaCue, playWhistle, type ArenaCue } from "@/lib/court-audio";
import {
  loadCrowdAmbience,
  playBuzzer,
  playPicaditoCue,
  playScorePop,
  playSetWinFanfare,
  saveCrowdAmbience,
} from "@/lib/sound-effects";
import { announceScoreTTS, persistLiveScoreboard, readLiveScoreboard, triggerCourtHaptics } from "@/lib/court-ux";
import { clearClonedScoreboard, createQrFrames, emptyIngest, ingestQrFrame, readClonedScoreboard, renderQrSvg, storeClonedScoreboard, type IngestResult, type QrFrame } from "@/lib/qr-transfer";
import { localizeReactTree } from "@/lib/engine-l10n";
import { COPY, t } from "@/lib/i18n";
import { BenchRotator, FlowWizard } from "@/components/CasualPlayerSuite";
import { saveSeasonMatch, seasonMatchFromState } from "@/lib/season-vault";
import { nextServeStreak, serveCapHit, serveCapMessage, type ServeCapLimit } from "@/lib/casual-engines";
import {
  FAN_QUESTIONS,
  REFEREE_GESTURES,
  TEMPO_SPECS,
  analyseFiveFrames,
  analyzeMomentum,
  awardBeachPoint,
  awardIndoorPoint,
  awardMvp,
  balanceTeams,
  beachSwitchInterval,
  buildChalkboard,
  buildLineupSlip,
  buildMatchPoster,
  buildRosterPass,
  buildSeal,
  commitScoreboard,
  buildSignalSheet,
  buildVolleyCard,
  classifyTiming,
  computeBlockShadow,
  computeSeam,
  computeSetterIQ,
  decideVar,
  defaultPositions,
  exportCapsule,
  fanReport,
  heatmap,
  importCapsule,
  inspectEquipment,
  jumpLoad,
  kingAwardWin,
  newBeach,
  newKingOfCourt,
  newScoreboard,
  newScoreboardHistory,
  overlayFromScoreboard,
  parsePlay,
  point8SwitchDue,
  refereeReport,
  redoScoreboard,
  scoutingReport,
  snakeDraft,
  splitCosts,
  standings,
  swapCourt,
  tempoWindow,
  trackSubstitutions,
  undoScoreboard,
  validateOverlap,
  verifySeal,
  verticalJumpCm,
  buildCareerReport,
  buildPlayByPlay,
  evaluateBlockout,
  matchupMatrix,
  planPractice,
  serveRadar,
  analyzeAerodynamics,
  analyzeSystem,
  analyzeTelestration,
  buildAdaptiveRulebook,
  buildArenaCue,
  buildBracket,
  buildClipPlan,
  buildHeadToHead,
  buildPlaybookAnimation,
  buildShotHeatmap,
  buildQrSync,
  buildRecruitingDossier,
  buildScoresheet,
  buildSponsorDeck,
  buildTreasury,
  buildWhiteLabel,
  calculateElo,
  commandTiebreak,
  assessPrehab,
  planMatchNutrition,
  readDeception,
  scoreReflex,
  translateSlang,
  validateHouseRules,
  type AttackZone,
  type Axis,
  type BlockScheme,
  type CardKind,
  type ChalkReason,
  type DailyJumps,
  type DraftPlayer,
  type EquipmentCategory,
  type HeatCell,
  type JsonValue,
  type LineupNumbers,
  type Locale,
  type MvpPlayer,
  type PlaybookPhaseInput,
  type PosterTheme,
  type RefereeEvent,
  type RefereeGesture,
  type RosterPlayerInput,
  type SeamFormation,
  type ServeType,
  type SetDistribution,
  type SetterGesture,
  type SetterPlay,
  type ShotResult,
  type SixAttributes,
  type SubEvent,
  type TempoCode,
  type ZonePoint,
  type BlockoutDecision,
  type PracticeFocus,
  type ScoreboardState,
  type TeamRoster,
  type TelestrationPoint,
  loadTeams,
  saveTeam,
  deleteTeam,
  newTeam,
  teamFromRosterSheet,
  type KingOfCourtState,
} from "@/lib/local-engines";
import {
  PICKUP_SAMPLE,
  SCOUT_SAMPLE,
  TOURNAMENT_MATCHES,
  TOURNAMENT_TEAMS,
  acwrSample,
} from "@/lib/samples";
import type { ModuleMeta } from "@/lib/modules";
import { GymScreenModule } from "@/components/GymScreenModule";
import { ModuleGuideBanner } from "@/components/ModuleGuideBanner";

export interface StationProps {
  meta: ModuleMeta;
  locale: Locale;
  onSave: (slug: string, rows: number) => void;
}

const CARD =
  "station-card flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-panel/80 p-5 shadow-2xl shadow-black/40 backdrop-blur";
const BTN =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const BTN_PRIMARY =
  "rounded-lg bg-crimson px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-imperial focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const INPUT =
  "w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-volt";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50";

function defaultOpenGuide(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("volleyos.guided") === "novice";
}

function StationShell({
  meta,
  locale,
  onExample,
  onSave,
  rows,
  children,
}: {
  meta: ModuleMeta;
  locale: Locale;
  onExample: () => void;
  onSave: (slug: string, rows: number) => void;
  rows: number;
  children: ReactNode;
}) {
  useEffect(() => {
    const loadExample = (): void => onExample();
    window.addEventListener("voleyos:demo", loadExample);
    return () => window.removeEventListener("voleyos:demo", loadExample);
  }, [onExample]);

  return (
    <article className={CARD} id={`station-${meta.slug}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">
            {t(locale, "Módulo", "Module", "Módulo")} #{meta.number.toString().padStart(2, "0")}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-white">
            <span aria-hidden className="mr-2">{meta.icon}</span>
            {meta.name[locale]}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">{meta.tagline[locale]}</p>
        </div>
        <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald">
          {t(locale, "Local", "Local", "Local")}
        </span>
      </header>
      <ModuleGuideBanner slug={meta.slug} locale={locale} defaultOpen={defaultOpenGuide()} />
      <div className="flex-1 text-sm text-white/80">{localizeReactTree(children, locale)}</div>
      <footer className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <button type="button" className={BTN_PRIMARY} onClick={onExample}>
          {COPY[locale].loadExample}
        </button>
        <button type="button" className={BTN} onClick={() => onSave(meta.slug, rows)}>
          {t(locale, "Guardar reporte", "Save report", "Salvar relatório")}
        </button>
      </footer>
    </article>
  );
}

function Metric({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-obsidian/60 px-3 py-2">
      <p className={LABEL}>{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function statusTone(status: string): string {
  if (status === "OPTIMAL" || status === "OPTICAL_WINDOW_11_OCLOCK") return "text-emerald";
  if (status === "TRANSITION_WINDOW" || status === "NEAR_EXTENSION") return "text-volt";
  return "text-crimson";
}

/* 1 ---------------------------------------------------------------------- */

export function BiomechanicsStation({ meta, locale, onSave }: StationProps) {
  const [takeoff, setTakeoff] = useState(0);
  const [landing, setLanding] = useState(540);
  const report = useMemo(
    () =>
      analyseFiveFrames({
        kneeAngle: 118.07,
        drawAngle: 90,
        impactAngle: 172,
        windowAngle: 26.57,
        symmetry: 4.2,
      }),
    [],
  );
  const height = landing > takeoff ? verticalJumpCm(takeoff, landing) : null;

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={5}
      onSave={onSave}
      onExample={() => {
        setTakeoff(0);
        setLanding(540);
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t(locale, "Salto", "Jump", "Salto")} value={height ? `${height.toFixed(1)} cm` : "—"} tone="text-volt" />
        <Metric label={t(locale, "Vuelo", "Flight", "Voo")} value={`${((landing - takeoff) / 1000).toFixed(2)} s`} />
        <Metric label="Score" value={`${report.score}/100`} tone="text-emerald" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Despegue (ms)", "Takeoff (ms)", "Decolagem (ms)")}</span>
          <input className={INPUT} type="number" min={0} value={takeoff} onChange={(event) => setTakeoff(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Aterrizaje (ms)", "Landing (ms)", "Aterrissagem (ms)")}</span>
          <input className={INPUT} type="number" min={0} value={landing} onChange={(event) => setLanding(Number(event.target.value))} />
        </label>
      </div>
      <ul className="mt-3 space-y-1">
        {report.frames.map((frame) => (
          <li key={frame.frame} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]">
            <span className="text-white/60">F{frame.frame}</span>
            <span className="truncate text-white/70">{frame.detail}</span>
            <span className={`whitespace-nowrap font-bold ${statusTone(frame.status)}`}>{frame.status.replaceAll("_", " ")}</span>
          </li>
        ))}
      </ul>
    </StationShell>
  );
}

/* 2 ---------------------------------------------------------------------- */

const HEAT_CLASS: Record<HeatCell["heat"], string> = {
  cold: "bg-slate-800/70",
  warm: "bg-amber-900/70",
  hot: "bg-crimson/70",
  volcano: "bg-imperial",
};

export function RotationStation({ meta, locale, onSave }: StationProps) {
  const [rotation, setRotation] = useState(1);
  const [points, setPoints] = useState<ZonePoint[]>(() => defaultPositions(1));
  const [report, setReport] = useState(() => validateOverlap(defaultPositions(1)));

  const applyRotation = (value: number): void => {
    const base = defaultPositions(value);
    setRotation(value);
    setPoints(base);
    setReport(validateOverlap(base));
  };

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={6}
      onSave={onSave}
      onExample={() => {
        const base = defaultPositions(3).map((zone) => (zone.zone === 2 ? { ...zone, y: 500 } : zone));
        setRotation(3);
        setPoints(base);
        setReport(validateOverlap(base));
      }}
    >
      <div className="flex items-center gap-2">
        <span className={LABEL}>{t(locale, "Rotación", "Rotation", "Rotação")}</span>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => applyRotation(value)}
            className={`h-8 w-8 rounded-lg border text-xs font-bold ${
              rotation === value ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/60"
            }`}
          >
            R{value}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 900 700" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1a13]" role="img" aria-label={t(locale, "Cancha 9x9 con posiciones 5-1", "9x9 court with 5-1 positions", "Quadra 9x9 com posições 5-1")}>
        <rect x="0" y="0" width="900" height="700" fill="#0b1a13" />
        <line x1="0" y1="4" x2="900" y2="4" stroke="#F59E0B" strokeWidth="5" />
        <line x1="0" y1="300" x2="900" y2="300" stroke="#F59E0B" strokeDasharray="12 10" strokeWidth="3" />
        <line x1="450" y1="0" x2="450" y2="700" stroke="#ffffff22" strokeWidth="2" />
        {points.map((zone) => {
          const fault = report.faults.find((item) => item.offender === zone.zone);
          return (
            <g key={zone.zone}>
              <circle cx={zone.x} cy={zone.y} r={34} fill={fault ? "#DC2626" : "#E11D48"} stroke="#fff" strokeOpacity={0.5} />
              <text x={zone.x} y={zone.y + 5} textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">
                {zone.zone}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-xs">
        {report.valid ? (
          <p className="text-emerald">{t(locale, "Posición legal al golpe de saque.", "Legal position at serve contact.", "Posição legal no contato do saque.")}</p>
        ) : (
          <ul className="space-y-1 text-crimson">
            {report.faults.map((fault) => (
              <li key={`${fault.pair}-${fault.offender}`}>
                {fault.pair}: {fault.rule} <span className="text-white/50">Δ {fault.dx.toFixed(0)}/{fault.dy.toFixed(0)} cm</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StationShell>
  );
}

/* 3 ---------------------------------------------------------------------- */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const RESULT_LABELS: Record<string, Record<Locale, string>> = {
  KILL: { es: "Punto", en: "Kill", pt: "Ponto" },
  ACE: { es: "Ace", en: "Ace", pt: "Ace" },
  ERROR: { es: "Error", en: "Error", pt: "Erro" },
  BLOCKED: { es: "Bloqueada", en: "Blocked", pt: "Bloqueada" },
  IN_PLAY: { es: "En juego", en: "In play", pt: "Em jogo" },
};

const SKILL_LABELS: Record<string, Record<Locale, string>> = {
  attack: { es: "Ataque", en: "Attack", pt: "Ataque" },
  serve: { es: "Saque", en: "Serve", pt: "Saque" },
  reception: { es: "Recepción", en: "Pass", pt: "Passe" },
  block: { es: "Bloqueo", en: "Block", pt: "Bloqueio" },
  defense: { es: "Defensa", en: "Dig", pt: "Defesa" },
  set: { es: "Armado", en: "Set", pt: "Levantamento" },
};

const DIRECTION_LABELS: Record<string, Record<Locale, string>> = {
  cross: { es: "Cruzada", en: "Cross", pt: "Cruzada" },
  line: { es: "Paralela", en: "Line", pt: "Paralela" },
  diagonal: { es: "Diagonal", en: "Diagonal", pt: "Diagonal" },
  unknown: { es: "Sin dirección", en: "No direction", pt: "Sem direção" },
};

export function ScoutingStation({ meta, locale, onSave }: StationProps) {
  const [text, setText] = useState(t(locale, "Ataque del 7 por 4 diagonal punto", "Attack 7 from 4 cross kill", "Ataque do 7 da 4 diagonal ponto"));
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<{ player?: number; origin?: number; target?: number; result?: string }>({});
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const parsed = useMemo(() => parsePlay(text), [text]);
  const report = useMemo(() => scoutingReport(SCOUT_SAMPLE), []);
  const cells = useMemo(() => heatmap(SCOUT_SAMPLE), []);
  const player = overrides.player ?? parsed.player;
  const origin = overrides.origin ?? parsed.originZone;
  const target = overrides.target ?? parsed.targetZone;
  const result = overrides.result ?? parsed.result;

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const dictate = (): void => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechError(t(locale, "Este WebView no expone micrófono. Usá las píldoras táctiles.", "This WebView has no microphone API. Use the tap chips.", "Este WebView não expõe microfone. Use as pílulas táteis."));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript ?? "";
      if (spoken) {
        setText(spoken);
        setOverrides({});
      }
    };
    recognition.onerror = () => setSpeechError(t(locale, "No se escuchó la jugada. Probá de nuevo.", "Play not heard. Try again.", "Jogada não ouvida. Tente de novo."));
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechError(null);
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setSpeechError(t(locale, "Micrófono no disponible.", "Microphone unavailable.", "Microfone indisponível."));
    }
  };

  const nudge = (key: "player" | "origin" | "target", delta: number): void => {
    const current = key === "player" ? player : key === "origin" ? origin : target;
    const base = current ?? (key === "player" ? 1 : 1);
    const next = Math.min(99, Math.max(1, base + delta));
    setOverrides((value) => ({ ...value, [key]: next }));
  };

  const cycleResult = (): void => {
    const order = ["KILL", "IN_PLAY", "ERROR", "BLOCKED"];
    const index = order.indexOf(result);
    setOverrides((value) => ({ ...value, result: order[(index + 1) % order.length] }));
  };

  return (
    <StationShell meta={meta} locale={locale} rows={report.attempts} onSave={onSave} onExample={() => { setText(t(locale, "Saque del 4 al 5, pase A, ataque del 7 por 4 diagonal punto", "Serve 4 to 5, pass A, 7 attacks zone 4 cross kill", "Saque do 4 no 5, passe A, ataque do 7 na 4 diagonal ponto")); setOverrides({}); }}>
      <label className="text-xs">
        <span className={LABEL}>{t(locale, "Voz o texto (ES/EN/PT)", "Voice or text (ES/EN/PT)", "Voz ou texto (ES/EN/PT)")}</span>
        <div className="flex gap-1">
          <input className={INPUT} value={text} onChange={(event) => { setText(event.target.value); setOverrides({}); }} />
          <button
            type="button"
            aria-pressed={listening}
            aria-label={t(locale, "Dictar jugada", "Dictate play", "Ditar jogada")}
            onClick={dictate}
            className={`${BTN} shrink-0 ${listening ? "border-crimson bg-crimson text-white" : ""}`}
          >
            {listening ? "●" : "🎙"}
          </button>
        </div>
      </label>
      {speechError ? <p role="alert" className="mt-1 text-[10px] text-crimson">{speechError}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
        <span className="rounded bg-crimson/20 px-2 py-1 text-crimson">#{player ?? "?"}</span>
        <span className="rounded bg-white/10 px-2 py-1">{SKILL_LABELS[parsed.skill]?.[locale] ?? parsed.skill}</span>
        <span className="rounded bg-white/10 px-2 py-1">Z{origin ?? "?"}→Z{target ?? "?"}</span>
        <span className="rounded bg-white/10 px-2 py-1">{DIRECTION_LABELS[parsed.direction]?.[locale] ?? parsed.direction}</span>
        <span className="rounded bg-emerald/20 px-2 py-1 text-emerald">{RESULT_LABELS[result]?.[locale] ?? result}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        {([
          ["player", t(locale, "Jugador", "Player", "Jogador")],
          ["origin", t(locale, "Z origen", "Origin Z", "Z origem")],
          ["target", t(locale, "Z destino", "Target Z", "Z destino")],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1">
            <span className="text-white/50">{label}</span>
            <span className="flex gap-1">
              <button type="button" aria-label={`${label} -`} className="rounded bg-white/10 px-2" onClick={() => nudge(key, -1)}>−</button>
              <button type="button" aria-label={`${label} +`} className="rounded bg-white/10 px-2" onClick={() => nudge(key, 1)}>+</button>
            </span>
          </div>
        ))}
        <button type="button" onClick={cycleResult} className="rounded-lg bg-white/5 px-2 py-1 text-left text-white/70">
          {t(locale, "Resultado", "Result", "Resultado")}: {RESULT_LABELS[result]?.[locale] ?? result}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Eficiencia" value={report.efficiency.toFixed(2)} tone={report.efficiency >= 0 ? "text-emerald" : "text-crimson"} />
        <Metric label="Kills" value={String(report.kills)} />
        <Metric label="K1 peor" value={report.worstRotation ?? "—"} tone="text-volt" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {cells.map((cell) => (
          <div key={cell.zone} className={`rounded-lg ${HEAT_CLASS[cell.heat]} flex h-11 flex-col items-center justify-center text-[10px] font-bold`}>
            <span>Z{cell.zone}</span>
            <span className="text-white/70">{cell.count}</span>
          </div>
        ))}
      </div>
    </StationShell>
  );
}

/* 4 ---------------------------------------------------------------------- */

function pressurePoint(state: ScoreboardState): boolean {
  if (state.status !== "live") return false;
  const target = state.setNumber === state.bestOf ? 15 : 25;
  return (state.scoreA >= target - 1 && state.scoreA - state.scoreB >= 0) || (state.scoreB >= target - 1 && state.scoreB - state.scoreA >= 0);
}

export function ScoreboardStation({ meta, locale, onSave }: StationProps) {
  const [matchFormat, setMatchFormat] = useState<"bo3" | "bo5" | "short15">("bo3");
  const [preset, setPreset] = useState<"picadito" | "king" | "oficial">("oficial");
  const [picaditoTarget, setPicaditoTarget] = useState<11 | 15 | 21 | 25>(15);
  const [goldenPoint, setGoldenPoint] = useState(false);
  const [kingInput, setKingInput] = useState("");
  const [king, setKing] = useState<KingOfCourtState | null>(null);
  const [flashSwap, setFlashSwap] = useState(false);
  const [teams, setTeams] = useState<TeamRoster[]>([]);
  const [teamAId, setTeamAId] = useState<string | null>(null);
  const [teamBId, setTeamBId] = useState<string | null>(null);
  const [history, setHistory] = useState(() => {
    const saved = readClonedScoreboard();
    if (saved) return newScoreboardHistory(saved);
    const live = readLiveScoreboard();
    if (live) return newScoreboardHistory(live);
    return newScoreboardHistory(newScoreboard("Tiburones", "Cóndores", 3, { matchFormat: "bo3" }));
  });
  const [message, setMessage] = useState(t(locale, "Elegí un equipo para sumar.", "Pick a team to score.", "Escolha um time para pontuar."));
  const [hardwareMode, setHardwareMode] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterName, setRosterName] = useState("");
  const [rosterCode, setRosterCode] = useState("");
  const [rosterSheet, setRosterSheet] = useState("");
  const [rosterError, setRosterError] = useState<string | null>(null);
  const state = history.present;
  const [serveCap, setServeCap] = useState<ServeCapLimit>(0);
  const [serveCapBanner, setServeCapBanner] = useState<string | null>(null);
  const [undoPill, setUndoPill] = useState(false);
  const [burst, setBurst] = useState<"set" | "match" | null>(null);
  const [voiceOn, setVoiceOn] = useState(() => window.localStorage.getItem("volleyos.voice") === "1");
  const [crowdOn, setCrowdOn] = useState(() => loadCrowdAmbience() > 0.01);
  const undoTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const serveStreakRef = useRef(0);
  const prevPointRef = useRef<{ total: number; serving: ScoreboardState["serving"] } | null>(null);

  useEffect(() => {
    setTeams(loadTeams());
  }, []);

  // Friendly recreational serve cap: counts consecutive points scored by
  // the team on serve across every scoring path (taps, keys, volume).
  useEffect(() => {
    const total = state.scoreA + state.scoreB;
    const previous = prevPointRef.current;
    prevPointRef.current = { total, serving: state.serving };
    if (!previous) return;
    if (total < previous.total) {
      serveStreakRef.current = 0;
      setServeCapBanner(null);
      return;
    }
    if (total !== previous.total + 1 || preset !== "picadito" || serveCap === 0) return;
    const scoredOnServe = state.serving === previous.serving;
    const next = nextServeStreak(serveStreakRef.current, scoredOnServe);
    if (serveCapHit(next, serveCap)) {
      serveStreakRef.current = 0;
      setServeCapBanner(serveCapMessage(serveCap, locale));
      playPicaditoCue("serve_cap");
      triggerCourtHaptics([30, 45, 30]);
    } else {
      serveStreakRef.current = next;
    }
  }, [state, preset, serveCap, locale]);

  const flashUndoPill = (): void => {
    setUndoPill(true);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoPill(false), 5000);
  };

  const flashBurst = (kind: "set" | "match"): void => {
    setBurst(kind);
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => setBurst(null), 1800);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const ttsLang = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES";

  const announcePoint = (next: ScoreboardState): void => {
    if (!voiceOn) return;
    const servingName = next.serving === "A" ? next.teamA : next.teamB;
    announceScoreTTS(
      t(
        locale,
        `${next.scoreA} a ${next.scoreB}, saca ${servingName}`,
        `${next.scoreA} all ${next.scoreB}, ${servingName} serves`,
        `${next.scoreA} a ${next.scoreB}, saca ${servingName}`,
      ),
      true,
      ttsLang,
    );
  };

  const toggleVoiceOn = (): void => {
    const next = !voiceOn;
    setVoiceOn(next);
    window.localStorage.setItem("volleyos.voice", next ? "1" : "0");
    triggerCourtHaptics(18);
    if (next) {
      announceScoreTTS(
        t(locale, "Voz del marcador activada.", "Score voice on.", "Voz do marcador ativada."),
        true,
        ttsLang,
      );
    }
  };

  const toggleCrowd = (): void => {
    const next = !crowdOn;
    setCrowdOn(next);
    saveCrowdAmbience(next ? 0.7 : 0);
    triggerCourtHaptics(16);
  };

  const applyRoster = (team: TeamRoster, side: "A" | "B"): void => {
    if (side === "A") setTeamAId(team.id);
    else setTeamBId(team.id);
    setHistory(newScoreboardHistory({
      ...state,
      teamA: side === "A" ? team.name : state.teamA,
      teamB: side === "B" ? team.name : state.teamB,
      lineupA: side === "A" && team.starters.length === 6 ? team.starters : state.lineupA,
      lineupB: side === "B" && team.starters.length === 6 ? team.starters : state.lineupB,
      rosterA: side === "A" ? team : state.rosterA,
      rosterB: side === "B" ? team : state.rosterB,
    }));
    setMessage(t(locale, `${team.name} cargado en ${side}.`, `${team.name} loaded on ${side}.`, `${team.name} carregado em ${side}.`));
    triggerCourtHaptics(20);
  };

  const saveRoster = (): void => {
    try {
      const team = teamFromRosterSheet(rosterName, rosterCode, rosterSheet);
      setTeams(saveTeam(team));
      applyRoster(team, teamAId ? "B" : "A");
      setRosterError(null);
      setRosterOpen(false);
      setRosterName("");
      setRosterCode("");
      setRosterSheet("");
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : "Error");
    }
  };

  const point = (team: "A" | "B"): void => {
    try {
      const wasOnServe = state.serving === team;
      const rivalStreak = state.streak;
      const result = awardIndoorPoint(state, team);
      if (result.matchFinished || result.setFinished) playSetWinFanfare();
      else {
        playScorePop();
        // Picadito audio grammar: ace on your own serve, side-out when you
        // steal it, sub-bass kill when you break a rival run of 3+.
        if (wasOnServe) playPicaditoCue("ace");
        else if (rivalStreak >= 3) playPicaditoCue("kill");
        else playPicaditoCue("sideout");
      }
      if (result.matchFinished && preset === "king" && king) {
        const nextKing = kingAwardWin(king, result.state.winner ?? "A");
        setKing(nextKing);
        const winnerName = result.state.winner === "A" ? result.state.teamA : result.state.teamB;
        const challenger = nextKing.courtA === winnerName ? nextKing.courtB : nextKing.courtA;
        setHistory(newScoreboardHistory(newScoreboard(nextKing.courtA, nextKing.courtB, 1, { matchFormat: "short15", targetPoints: 15, goldenPoint: false })));
        setMessage(
          t(locale, `👑 ${winnerName} queda en cancha (racha ${nextKing.streak}) — entra ${challenger}.`, `👑 ${winnerName} stays on court (streak ${nextKing.streak}) — ${challenger} enters.`, `👑 ${winnerName} fica na quadra (sequência ${nextKing.streak}) — ${challenger} entra.`),
        );
        triggerCourtHaptics([50, 40, 50]);
        return;
      }
      setHistory(commitScoreboard(history, result.state));
      flashUndoPill();
      if (result.matchFinished) flashBurst("match");
      else if (result.setFinished) flashBurst("set");
      if (result.matchFinished) saveSeasonMatch(seasonMatchFromState(result.state, preset));
      if (result.matchFinished) window.dispatchEvent(new CustomEvent("voleyos:support-moment", { detail: "match" }));
      setMessage(
        `${result.message}${result.rotated ? t(locale, " · rotación", " · rotation", " · rotação") : ""}${
          result.sideSwitchDue ? t(locale, " · cambio de lado", " · switch sides", " · troca de lado") : ""
        }${
          result.matchFinished
            ? t(locale, " · guardado en Mi Temporada", " · saved in My Season", " · salvo em Minha Temporada")
            : ""
        }`,
      );
      triggerCourtHaptics(pressurePoint(result.state) ? [80, 50, 80, 50, 140] : 30);
      announcePoint(result.state);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    }
  };

  const startPicadito = (target: 11 | 15 | 21 | 25 = picaditoTarget, golden: boolean = goldenPoint): void => {
    setPreset("picadito");
    setPicaditoTarget(target);
    setGoldenPoint(golden);
    setMatchFormat("short15");
    setKing(null);
    setHistory(newScoreboardHistory(newScoreboard(state.teamA, state.teamB, 1, { matchFormat: "short15", targetPoints: target, goldenPoint: golden })));
    setMessage(
      t(locale, `⚡ Picadito a ${target} pts ${golden ? "· punto de oro" : "· ventaja de 2"}.`, `⚡ Pickup to ${target} pts ${golden ? "· golden point" : "· win by 2"}.`, `⚡ Rachinha a ${target} pts ${golden ? "· ponto de ouro" : "· vantagem de 2"}.`),
    );
    triggerCourtHaptics(25);
  };

  const startKing = (): void => {
    const names = kingInput.split(/[,;\n]/).map((name) => name.trim()).filter((name) => name.length > 0);
    try {
      const fresh = newKingOfCourt(names);
      setPreset("king");
      setKing(fresh);
      setMatchFormat("short15");
      setHistory(newScoreboardHistory(newScoreboard(fresh.courtA, fresh.courtB, 1, { matchFormat: "short15", targetPoints: 15, goldenPoint: false })));
      setMessage(t(locale, `👑 ${fresh.teams.length} equipos en cola. ¡A jugar!`, `👑 ${fresh.teams.length} teams in the queue. Play!`, `👑 ${fresh.teams.length} times na fila. Vamos!`));
      triggerCourtHaptics([30, 25, 30]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    }
  };

  const swapSides = (): void => {
    setHistory((previous) => commitScoreboard(previous, swapCourt(previous.present)));
    playWhistle("double");
    triggerCourtHaptics([40, 30, 40]);
    setFlashSwap(true);
    window.setTimeout(() => setFlashSwap(false), 450);
    setMessage(t(locale, "🔄 Cancha cambiada — columnas invertidas.", "🔄 Sides swapped — columns inverted.", "🔄 Quadra trocada — colunas invertidas."));
  };

  const undo = (): void => {
    setHistory((previous) => undoScoreboard(previous));
    setMessage(t(locale, "Jugada deshecha.", "Play undone.", "Jogada desfeita."));
    triggerCourtHaptics(18);
  };

  useEffect(() => {
    persistLiveScoreboard(state);
    clearClonedScoreboard();
  }, [state]);

  useEffect(() => {
    const bridge = (window as Window & { VoleyOSBridge?: { setHardwareScoreMode?: (enabled: boolean) => void } }).VoleyOSBridge;
    // The Android bridge object exists on device but older MainActivity builds
    // do not expose this method: an unguarded call throws a TypeError in the
    // effect on mount and takes the whole app down ("client-side error").
    bridge?.setHardwareScoreMode?.(hardwareMode);
    if (!hardwareMode) return;
    const onHardwareKey = (event: Event): void => {
      const detail = event instanceof CustomEvent ? String(event.detail) : "";
      if (detail === "VOLUME_UP") point("A");
      else if (detail === "VOLUME_DOWN") point("B");
      else if (detail === "VOLUME_LONG_UNDO") {
        setHistory((previous) => undoScoreboard(undoScoreboard(previous)));
        setMessage(t(locale, "Dos puntos deshechos desde volumen.", "Two points undone from volume.", "Dois pontos desfeitos pelo volume."));
        triggerCourtHaptics([40, 30, 40]);
      }
    };
    window.addEventListener("voleyos:hardware-key", onHardwareKey);
    return () => window.removeEventListener("voleyos:hardware-key", onHardwareKey);
  }, [hardwareMode, locale, point]);

  const redo = (): void => {
    setHistory((previous) => redoScoreboard(previous));
    setMessage(t(locale, "Jugada rehecha.", "Play redone.", "Jogada refeita."));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "a" || key === "l") {
        event.preventDefault();
        const team = key === "a" ? "A" : "B";
        setHistory((previous) => {
          const result = awardIndoorPoint(previous.present, team);
          return commitScoreboard(previous, result.state);
        });
      } else if (key === "z") {
        event.preventDefault();
        setHistory((previous) => undoScoreboard(previous));
      } else if (key === "w") {
        event.preventDefault();
        playWhistle("short");
      } else if (key === "b") {
        event.preventDefault();
        playBuzzer();
      } else if (key === "c") {
        event.preventDefault();
        const next = !document.documentElement.classList.contains("high-contrast");
        document.documentElement.classList.toggle("high-contrast", next);
        window.localStorage.setItem("volleyos.contrast", next ? "1" : "0");
        setMessage(t(locale, "Alto contraste alternado.", "High contrast toggled.", "Alto contraste alternado."));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locale]);

  const swapped = state.isCourtSwapped === true;
  const left = swapped
    ? { name: state.teamB, score: state.scoreB, sets: state.setsB, serving: state.serving === "B" }
    : { name: state.teamA, score: state.scoreA, sets: state.setsA, serving: state.serving === "A" };
  const right = swapped
    ? { name: state.teamA, score: state.scoreA, sets: state.setsA, serving: state.serving === "A" }
    : { name: state.teamB, score: state.scoreB, sets: state.setsB, serving: state.serving === "B" };
  const showPoint8 = point8SwitchDue(state);

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={6}
      onSave={onSave}
      onExample={() => {
        setHistory(newScoreboardHistory({ ...newScoreboard("Tiburones", "Cóndores", 3), scoreA: 22, scoreB: 20, setsA: 1, setsB: 1 }));
        setMessage(t(locale, "Ejemplo cargado: set decisivo 22-20.", "Example loaded: decider 22-20.", "Exemplo carregado: set decisivo 22-20."));
      }}
    >
      <div className="mb-2 flex flex-wrap gap-1">
        <button type="button" onClick={() => startPicadito()} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "picadito" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>⚡ {t(locale, "Picadito", "Pickup", "Rachinha")}</button>
        <button type="button" onClick={() => setPreset("king")} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "king" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>👑 {t(locale, "Ganador en cancha", "Winner stays", "Vencedor fica")}</button>
        <button type="button" onClick={() => { setPreset("oficial"); setKing(null); }} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "oficial" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>🏆 {t(locale, "Oficial", "Official", "Oficial")}</button>
      </div>
      {preset === "picadito" ? (
        <div className="vos-item-card mb-2 space-y-2">
          <div className="flex flex-wrap gap-1">
            {([11, 15, 21, 25] as const).map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => startPicadito(target)}
                className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${picaditoTarget === target && matchFormat === "short15" ? "border-volt bg-volt/15 text-volt" : "border-white/10 text-white/50"}`}
              >
                {target} {t(locale, "pts", "pts", "pts")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => startPicadito(picaditoTarget, false)}
              className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${!goldenPoint ? "border-volt text-volt" : "border-white/10 text-white/50"}`}
            >
              {t(locale, "Diferencia de 2 (14-14 / 24-24)", "Win by 2 (14-14 / 24-24)", "Vantagem de 2 (14-14 / 24-24)")}
            </button>
            <button
              type="button"
              onClick={() => startPicadito(picaditoTarget, true)}
              className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${goldenPoint ? "border-volt text-volt" : "border-white/10 text-white/50"}`}
            >
              {t(locale, "Punto de oro (muere en el target)", "Golden point (dies at target)", "Ponto de ouro (morre no alvo)")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-bold text-white/45">🎯 {t(locale, "Límite de Saques Seguidos", "Consecutive Serve Cap", "Limite de Saques Seguidos")}</span>
            {([0, 3, 5] as const).map((cap) => (
              <button
                key={cap}
                type="button"
                aria-pressed={serveCap === cap}
                onClick={() => {
                  setServeCap(cap);
                  setServeCapBanner(null);
                  triggerCourtHaptics(16);
                }}
                className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${serveCap === cap ? "border-volt bg-volt/15 text-volt" : "border-white/10 text-white/50"}`}
              >
                {cap === 0
                  ? t(locale, "Sin límite", "No limit", "Sem limite")
                  : t(locale, `${cap} Saques`, `${cap} Serves`, `${cap} Saques`)}
              </button>
            ))}
          </div>
          {serveCapBanner ? (
            <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-center text-[10px] font-semibold text-emerald">
              {serveCapBanner}
            </p>
          ) : null}
        </div>
      ) : null}
      {preset === "king" ? (
        <div className="vos-item-card mb-2 space-y-1">
          <input
            value={kingInput}
            onChange={(event) => setKingInput(event.target.value)}
            placeholder={t(locale, "Tiburones, Lobos, Titanes, Vinchas… (3-5 equipos)", "Sharks, Wolves, Titans, Vinchas… (3-5 teams)", "Tubarões, Lobos, Titanes, Vinchas… (3-5 times)")}
            className="w-full rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px]"
          />
          <button type="button" className={`${BTN} w-full`} onClick={startKing}>
            ▶ {t(locale, "Arrancar Rey de la Cancha (3-5 equipos)", "Start King of the Court (3-5 teams)", "Começar Rei da Quadra (3-5 times)")}
          </button>
          {king ? (
            <p className="text-[9px] text-volt">
              🔥 {t(locale, "Racha", "Streak", "Sequência")}: {king.streakTeam ?? "—"} ×{king.streak} · {t(locale, "cola", "queue", "fila")}: {king.queue.join(", ") || "—"}
            </p>
          ) : null}
        </div>
      ) : null}
      {preset === "oficial" ? (
        <div className="mb-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => { setMatchFormat("bo3"); setHistory(newScoreboardHistory(newScoreboard(state.teamA, state.teamB, 3, { matchFormat: "bo3" }))); }} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${matchFormat === "bo3" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>{t(locale, "Mejor de 3 (25/15)", "Best of 3 (25/15)", "Melhor de 3 (25/15)")}</button>
          <button type="button" onClick={() => { setMatchFormat("bo5"); setHistory(newScoreboardHistory(newScoreboard(state.teamA, state.teamB, 5, { matchFormat: "bo5" }))); }} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${matchFormat === "bo5" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>{t(locale, "Mejor de 5 (25/15)", "Best of 5 (25/15)", "Melhor de 5 (25/15)")}</button>
        </div>
      ) : null}
      <div className="mb-2 grid grid-cols-2 gap-1">
        <select
          aria-label={t(locale, "Equipo local", "Home team", "Time da casa")}
          value={teamAId ?? ""}
          onChange={(event) => {
            const team = teams.find((item) => item.id === event.target.value);
            if (team) applyRoster(team, "A");
          }}
          className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px] text-white"
        >
          <option value="">{t(locale, "Equipo A", "Team A", "Time A")}</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <select
          aria-label={t(locale, "Equipo visitante", "Away team", "Time visitante")}
          value={teamBId ?? ""}
          onChange={(event) => {
            const team = teams.find((item) => item.id === event.target.value);
            if (team) applyRoster(team, "B");
          }}
          className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px] text-white"
        >
          <option value="">{t(locale, "Equipo B", "Team B", "Time B")}</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <button type="button" className={`${BTN} col-span-2`} onClick={() => setRosterOpen((open) => !open)}>
          {t(locale, "Administrar plantillas", "Manage rosters", "Gerenciar elencos")}
        </button>
      </div>
      {rosterOpen ? (
        <div className="mb-2 space-y-1 rounded-xl border border-white/10 bg-obsidian/80 p-2">
          <div className="grid grid-cols-[1fr_4rem] gap-1">
            <input value={rosterName} onChange={(event) => setRosterName(event.target.value)} placeholder={t(locale, "Nombre del equipo", "Team name", "Nome do time")} className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px]" />
            <input value={rosterCode} onChange={(event) => setRosterCode(event.target.value)} placeholder="ABC" maxLength={3} className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px] uppercase" />
          </div>
          <textarea
            value={rosterSheet}
            onChange={(event) => setRosterSheet(event.target.value)}
            rows={5}
            placeholder={"1 Sofia S C\n7 Martina L\n4 Valentina OH\n9 Renata MB\n11 Carla OPP\n14 Julieta MB"}
            className="w-full rounded-lg border border-white/10 bg-obsidian px-2 py-1 font-mono text-[10px]"
          />
          <p className="text-[9px] text-white/40">{t(locale, "Dorsal nombre rol (S OH MB OPP L) y C/L para capitan o libero.", "Number name role (S OH MB OPP L), C/L for captain or libero.", "Numero nome posicao (S OH MB OPP L), C/L para capitao ou libero.")}</p>
          {rosterError ? <p className="text-[10px] text-crimson">{rosterError}</p> : null}
          <button type="button" className={`${BTN} w-full`} onClick={saveRoster}>{t(locale, "Guardar plantilla", "Save roster", "Salvar elenco")}</button>
          {teams.length > 0 ? (
            <div className="space-y-1">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center gap-1 text-[10px]">
                  <span className="flex-1 truncate">{team.name} ({team.players.length})</span>
                  <button type="button" className={BTN} onClick={() => applyRoster(team, "A")}>A</button>
                  <button type="button" className={BTN} onClick={() => applyRoster(team, "B")}>B</button>
                  <button type="button" className={BTN} onClick={() => setTeams(deleteTeam(team.id))}>×</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div data-hardware-volume-score={hardwareMode ? "true" : "false"} className="relative rounded-xl">
      <button
        type="button"
        aria-pressed={hardwareMode}
        onClick={() => {
          const next = !hardwareMode;
          setHardwareMode(next);
          setMessage(
            next
              ? t(locale, "Modo partido: volumen + local, volumen - visita, mantener para deshacer.", "Match mode: volume + home, volume - away, hold to undo.", "Modo partida: volume + casa, volume - visitante, segure para desfazer.")
              : t(locale, "Modo partido apagado.", "Match mode off.", "Modo partida desligado."),
          );
          triggerCourtHaptics(next ? [40, 30, 40] : 20);
        }}
        className={`${BTN} mb-2 w-full ${hardwareMode ? "border-volt bg-volt/15 text-volt" : ""}`}
      >
        🔒 {t(locale, "Modo Partido (botones de volumen)", "Match mode (volume keys)", "Modo Partida (botões de volume)")}
      </button>
      <div className={`rounded-xl border border-white/10 bg-obsidian/80 p-3 ${flashSwap ? "vos-flash" : ""}`}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
          <span>Set {state.setNumber} / {state.bestOf} {state.matchFormat === "short15" ? "(15)" : state.setNumber === state.bestOf || state.isDecider ? "(15 TB)" : "(25)"}</span>
          <span>{state.status === "finished" ? "FINAL" : `${state.streak} ${t(locale, "en racha", "run", "em sequência")}`}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className={`rounded-lg py-2 ${left.serving ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`}>
            <p className="truncate text-xs font-bold">{left.name}</p>
            <p data-testid={swapped ? "score-b" : "score-a"} className="text-4xl font-black tabular-nums">{left.score}</p>
            <p className="text-[10px] text-volt">Sets {left.sets}</p>
          </div>
          <div className={`rounded-lg py-2 ${right.serving ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`}>
            <p className="truncate text-xs font-bold">{right.name}</p>
            <p data-testid={swapped ? "score-a" : "score-b"} className="text-4xl font-black tabular-nums">{right.score}</p>
            <p className="text-[10px] text-volt">Sets {right.sets}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1">
          <button type="button" className={BTN} onClick={swapSides}>
            🔄 {t(locale, "Cambio de Cancha", "Swap Sides", "Troca de Lado")}
          </button>
          {showPoint8 ? (
            <button type="button" onClick={swapSides} className="rounded-full bg-volt/15 px-2 py-0.5 text-[9px] font-bold text-volt">
              💡 {t(locale, "Punto 8: ¿Cambiar de cancha?", "Point 8: swap sides?", "Ponto 8: trocar de lado?")}
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <button type="button" className={BTN_PRIMARY} onClick={() => point(swapped ? "B" : "A")}>+ {left.name} [A]</button>
          <button type="button" className={BTN_PRIMARY} onClick={() => point(swapped ? "A" : "B")}>+ {right.name} [L]</button>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          <button
            type="button"
            aria-pressed={voiceOn}
            onClick={toggleVoiceOn}
            data-testid="voice-toggle"
            className={voiceOn ? `${BTN} border-volt text-volt` : BTN}
          >
            🗣️ {t(locale, "Voz", "Voice", "Voz")}: {voiceOn ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            aria-pressed={crowdOn}
            onClick={toggleCrowd}
            data-testid="crowd-toggle"
            className={crowdOn ? `${BTN} border-emerald text-emerald` : BTN}
          >
            🔉 {t(locale, "Público", "Crowd", "Torcida")}: {crowdOn ? "ON" : "OFF"}
          </button>
          <button type="button" className={BTN} onClick={undo} disabled={history.past.length === 0}>[Z] {t(locale, "Deshacer", "Undo", "Desfazer")} ({history.past.length})</button>
          <button type="button" className={BTN} onClick={redo} disabled={history.future.length === 0}>[Y] {t(locale, "Rehacer", "Redo", "Refazer")}</button>
          <button type="button" className={BTN} onClick={() => playWhistle("short")}>[W] {t(locale, "Silbato", "Whistle", "Apito")}</button>
          <button type="button" className={BTN} onClick={() => playBuzzer()}>[B] {t(locale, "Buzzer", "Buzzer", "Buzzer")}</button>
          <button type="button" className={BTN} onClick={() => {
            const next = !document.documentElement.classList.contains("high-contrast");
            document.documentElement.classList.toggle("high-contrast", next);
            window.localStorage.setItem("volleyos.contrast", next ? "1" : "0");
          }}>[C] {t(locale, "Contraste", "Contrast", "Contraste")}</button>
        </div>
      </div>
      <button
        type="button"
        data-testid="save-season"
        disabled={state.status !== "finished" && state.setsA + state.setsB === 0}
        onClick={() => {
          saveSeasonMatch(seasonMatchFromState(state, preset));
          setMessage(
            t(
              locale,
              "💾 Partido guardado en 🏆 Mi Temporada.",
              "💾 Match saved to 🏆 My Season.",
              "💾 Partida salva em 🏆 Minha Temporada.",
            ),
          );
          triggerCourtHaptics(25);
        }}
        className={`${BTN} mt-2 w-full disabled:opacity-40`}
      >
        💾 {t(locale, "Guardar Partido en Mi Temporada", "Save Match to My Season", "Salvar Partida na Minha Temporada")}
      </button>
      {state.status === "finished" ? (
        <div className="mt-2">
          <FlowWizard locale={locale} current={3} />
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-white/60">{message}</p>
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px]">
        {state.lineupA.map((player, index) => (
          <div key={`zone-${index + 1}`} className={`rounded ${index === 0 ? "bg-volt/20 text-volt" : "bg-white/5"}`}>
            <p className="text-white/40">Z{index + 1}</p>
            <p className="font-bold">#{player}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">A/L punto · Z undo · W silbato · B buzzer · C contraste</p>
      {hardwareMode ? (
        <div className="absolute inset-0 z-30 grid place-items-center rounded-xl bg-obsidian/95 p-4 text-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-volt">🔒 {t(locale, "Toques bloqueados", "Touch lock", "Toques bloqueados")}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/60">
              {t(locale, "Volumen + local · Volumen - visita · mantener volumen para deshacer.", "Volume + home · Volume - away · hold volume to undo.", "Volume + casa · Volume - visitante · segure o volume para desfazer.")}
            </p>
            <button type="button" className={`${BTN} mt-3`} onClick={() => { setHardwareMode(false); triggerCourtHaptics(20); }}>
              🔓 {t(locale, "Desbloquear", "Unlock", "Desbloquear")}
            </button>
          </div>
        </div>
      ) : null}
      </div>
      <BenchRotator locale={locale} />
      {undoPill ? (
        <button
          type="button"
          data-testid="undo-pill"
          onClick={() => {
            undo();
            setUndoPill(false);
          }}
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-obsidian bg-volt px-4 py-2.5 text-[12px] font-black text-obsidian shadow-lg"
        >
          ↶ {t(locale, "Deshacer último punto", "Undo last point", "Desfazer último ponto")}
        </button>
      ) : null}
      {burst ? (
        <div data-testid="set-burst" aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className="vos-confetti-piece"
              style={{
                left: `${(index * 100) / 18}%`,
                background: ["#FACC15", "#E11D48", "#10B981", "#FFFFFF", "#8B5CF6"][index % 5],
                animationDelay: `${(index % 6) * 0.08}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 grid place-items-center vos-flash">
            <p className="rounded-2xl bg-volt px-5 py-3 text-lg font-black text-obsidian shadow-2xl">
              {burst === "match"
                ? `🏆 ${t(locale, "¡Partido cerrado!", "Match closed!", "Partida encerrada!")}`
                : `🎉 ${t(locale, "¡Set ganado!", "Set won!", "Set ganho!")}`}
            </p>
          </div>
        </div>
      ) : null}
    </StationShell>
  );
}


/* 5 ---------------------------------------------------------------------- */

export function TournamentStation({ meta, locale, onSave }: StationProps) {
  const table = useMemo(() => standings(TOURNAMENT_TEAMS, TOURNAMENT_MATCHES), []);

  return (
    <StationShell meta={meta} locale={locale} rows={table.length} onSave={onSave} onExample={() => undefined}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="text-white/40">
            <tr>
              <th className="py-1">#</th>
                <th>{t(locale, "Equipo", "Team", "Equipe")}</th>
              <th className="text-right">Pts</th>
              <th className="text-right">Sets</th>
              <th className="text-right">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {table.slice(0, 6).map((row) => (
              <tr key={row.team} className={row.position <= 4 ? "text-white" : "text-white/50"}>
                <td className="py-1 font-bold text-volt">{row.position}</td>
                <td className="truncate">{row.team}</td>
                <td className="text-right font-bold">{row.points}</td>
                <td className="text-right">{row.setsWon}-{row.setsLost}</td>
                <td className="text-right">{row.setsRatio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-white/50">
        {t(locale, "Puntos 3-0/3-1 = 3 · 3-2 = 2 · 2-3 = 1 · desempate por coeficiente de sets y tantos.", "3-0/3-1 = 3 · 3-2 = 2 · 2-3 = 1 · ties broken by set/point ratios.", "3-0/3-1 = 3 · 3-2 = 2 · 2-3 = 1 · desempate por coeficiente de sets e pontos.")}
      </p>
    </StationShell>
  );
}

/* 6 ---------------------------------------------------------------------- */

export function PickupStation({ meta, locale, onSave }: StationProps) {
  const [result, setResult] = useState(() => balanceTeams(PICKUP_SAMPLE, 2));

  return (
    <StationShell meta={meta} locale={locale} rows={result.teams.length} onSave={onSave} onExample={() => setResult(balanceTeams(PICKUP_SAMPLE, 2))}>
      <div className="grid grid-cols-2 gap-2">
        {result.teams.map((team) => (
          <div key={team.name} className="rounded-xl border border-white/10 bg-obsidian/60 p-2">
            <p className="text-[11px] font-bold text-volt">{team.name} · {team.average.toFixed(2)}★</p>
            <p className="text-[9px] text-white/40">{team.setters} {t(locale, "armador", "setter", "levantador")}</p>
            <ul className="mt-1 space-y-0.5 text-[10px]">
              {team.players.map((player) => (
                <li key={player.name} className="flex justify-between gap-1 text-white/70">
                  <span className="truncate">{player.name}</span>
                  <span className="text-white/40">{player.level}★</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px]">
        Delta: <strong className={result.delta <= 0.15 ? "text-emerald" : "text-volt"}>{result.delta.toFixed(2)}</strong>
        {result.balanced ? t(locale, " · equipos parejos", " · balanced", " · times parelhos") : t(locale, " · ajuste mínimo posible", " · minimal possible gap", " · ajuste mínimo possível")}
      </p>
        <p className="mt-1 text-[10px] text-white/40">{t(locale, "Rey de la Cancha", "King of the Court", "Rei da Quadra")}: Tiburones → Cóndores → Panteras</p>
    </StationShell>
  );
}

/* 7 ---------------------------------------------------------------------- */

export function OverlayStation({ meta, locale, onSave }: StationProps) {
  const [state, setState] = useState(() => ({ ...newScoreboard("Tiburones", "Cóndores", 3), scoreA: 24, scoreB: 22, setsA: 1, setsB: 1 }));
  const overlay = overlayFromScoreboard(state, "Mikasa Volt");

  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => setState({ ...newScoreboard(), scoreA: 24, scoreB: 22, setsA: 1, setsB: 1 })}>
      <div className="checker rounded-xl p-2">
        <div className="flex items-stretch justify-between gap-1 rounded-lg bg-black/80 px-2 py-2 text-white shadow-lg">
          <div className="flex-1 border-l-4 border-crimson pl-2">
            <p className="text-[10px] font-bold uppercase tracking-wider">{overlay.teamA.name}</p>
            <p className="text-2xl font-black leading-none">{overlay.teamA.points}</p>
            <p className="text-[9px] text-volt">Sets {overlay.teamA.sets}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-[9px] text-white/50">
            <span>SET {overlay.setNumber}</span>
            {overlay.banner ? <span className="mt-1 animate-pulse rounded bg-crimson px-1 py-0.5 text-[8px] font-black">{overlay.banner}</span> : null}
          </div>
          <div className="flex-1 border-r-4 border-crimson pr-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider">{overlay.teamB.name}</p>
            <p className="text-2xl font-black leading-none">{overlay.teamB.points}</p>
            <p className="text-[9px] text-volt">Sets {overlay.teamB.sets}</p>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-white/50">{t(locale, "Saque", "Serve", "Saque")} #{overlay.serverNumber} · {t(locale, "racha", "streak", "sequência")} {overlay.streak}</p>
        <a className={BTN} href="/overlay/tv" target="_blank" rel="noreferrer">
          /overlay/tv ↗
        </a>
      </div>
    </StationShell>
  );
}

/* 8 ---------------------------------------------------------------------- */

export function VarStation({ meta, locale, onSave }: StationProps) {
  const [text, setText] = useState("Líbero armando de dedos delante de la línea de 3 metros");
  const [toss, setToss] = useState<{ choice: string; side: string } | null>(null);
  const decision = useMemo(() => decideVar(text), [text]);

  const coinToss = (): void => {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    setToss({ choice: value % 2 === 0 ? "SAQUE" : "LADO", side: value % 4 < 2 ? "DERECHA" : "IZQUIERDA" });
  };

  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => setText("Toque de red en la banda superior blanca")}>
      <label className="text-xs">
        <span className={LABEL}>{t(locale, "Describe la jugada", "Describe the play", "Descreva a jogada")}</span>
        <input className={INPUT} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="mt-2 rounded-xl border border-white/10 bg-obsidian/60 p-3">
        <p className="text-xs font-bold text-volt">{decision.title}</p>
        <p className="mt-1 text-[11px] text-crimson">{decision.verdict}</p>
        <p className="mt-1 text-[10px] text-white/60">{decision.explanation}</p>
        <p className="mt-1 text-[10px] font-mono text-emerald">{decision.citation}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className={BTN} onClick={coinToss}>🪙 {t(locale, "Sortear", "Toss", "Sortear")}</button>
        {toss ? <span className="text-[11px] text-white/70">{toss.choice} · {toss.side}</span> : null}
      </div>
    </StationShell>
  );
}

/* 9 ---------------------------------------------------------------------- */

export function BeachStation({ meta, locale, onSave }: StationProps) {
  const [state, setState] = useState(() => ({ ...newBeach("Ana y Bea", "Carla y Dani"), pointsA: 18, pointsB: 17 }));
  const [flash, setFlash] = useState(false);

  const point = (team: "A" | "B"): void => {
    const result = awardBeachPoint(state, team);
    setState(result.state);
    setFlash(result.sideSwitchDue);
  };

  return (
    <StationShell meta={meta} locale={locale} rows={2} onSave={onSave} onExample={() => { setState({ ...newBeach(), pointsA: 18, pointsB: 17 }); setFlash(false); }}>
      <div className="rounded-xl bg-[#0b1a13] p-3">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-white/40">
          <span>Set {state.setNumber} · {beachSwitchInterval(state)} pts</span>
          <span>{state.serving === "A" ? state.teamA : state.teamB} saca</span>
        </div>
        <div className="mt-1 flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-white/60">{state.teamA}</p>
            <p className="text-3xl font-black text-white">{state.pointsA}</p>
            <p className="text-[9px] text-volt">Sets {state.setsA}</p>
          </div>
          <span className="text-white/30">—</span>
          <div className="text-center">
            <p className="text-[10px] text-white/60">{state.teamB}</p>
            <p className="text-3xl font-black text-white">{state.pointsB}</p>
            <p className="text-[9px] text-volt">Sets {state.setsB}</p>
          </div>
        </div>
      </div>
      {flash ? (
        <p className="mt-2 animate-pulse rounded-lg bg-volt px-2 py-1 text-center text-[11px] font-black text-obsidian">
          ↔ {t(locale, "CAMBIO DE LADO", "SWITCH SIDES", "TROCA DE LADO")}
        </p>
      ) : null}
      <div className="mt-2 flex justify-center gap-2">
        <button type="button" className={BTN_PRIMARY} onClick={() => point("A")}>+ A</button>
        <button type="button" className={BTN_PRIMARY} onClick={() => point("B")}>+ B</button>
      </div>
    </StationShell>
  );
}

/* 10 --------------------------------------------------------------------- */

const AXES: Axis[] = ["attack", "reception", "serve", "block", "defense", "setting"];
const AXIS_LABELS: Record<Axis, string> = { attack: "ATA", reception: "REC", serve: "SAQ", block: "BLQ", defense: "DEF", setting: "ARM" };

function RadarHex({ attributes }: { attributes: SixAttributes }) {
  const center = 110;
  const radius = 82;
  const points = AXES.map((axis, index) => {
    const angle = ((-90 + index * 60) * Math.PI) / 180;
    const value = attributes[axis] / 100;
    const labelRadius = radius + 20;
    return {
      axis,
      x: center + Math.cos(angle) * radius * value,
      y: center + Math.sin(angle) * radius * value,
      lx: center + Math.cos(angle) * labelRadius,
      ly: center + Math.sin(angle) * labelRadius,
      gx: center + Math.cos(angle) * radius,
      gy: center + Math.sin(angle) * radius,
    };
  });
  return (
    <svg viewBox="0 0 220 220" className="h-48 w-48" role="img" aria-label="Radar hexagonal de habilidades">
      {[0.33, 0.66, 1].map((scale) => (
        <polygon
          key={scale}
          points={AXES.map((_, index) => {
            const angle = ((-90 + index * 60) * Math.PI) / 180;
            return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
          }).join(" ")}
          fill="none"
          stroke="#ffffff22"
          strokeWidth="1"
        />
      ))}
      {points.map((point) => (
        <line key={point.axis} x1={center} y1={center} x2={point.gx} y2={point.gy} stroke="#ffffff18" />
      ))}
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="#E11D48aa" stroke="#F59E0B" strokeWidth="2" />
      {points.map((point) => (
        <text key={point.axis} x={point.lx} y={point.ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#ffffff88">
          {AXIS_LABELS[point.axis]}
        </text>
      ))}
    </svg>
  );
}

export function VolleycardStation({ meta, locale, onSave }: StationProps) {
  const [height, setHeight] = useState(190);
  const [reach, setReach] = useState(250);
  const [jump, setJump] = useState(78);
  const attributes: SixAttributes = { attack: 92, reception: 84, serve: 79, block: 71, defense: 76, setting: 55 };
  const card = useMemo(() => {
    try {
      return buildVolleyCard({ name: "Valentina Ríos", position: "punta", heightCm: height, standingReachCm: reach, jumpCm: jump, attributes });
    } catch {
      return null;
    }
  }, [height, reach, jump]);

  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => { setHeight(190); setReach(250); setJump(78); }}>
      <div className="grid grid-cols-3 gap-2">
          <label className="text-xs"><span className={LABEL}>{t(locale, "Altura", "Height", "Altura")}</span><input className={INPUT} type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label>
          <label className="text-xs"><span className={LABEL}>Reach</span><input className={INPUT} type="number" value={reach} onChange={(event) => setReach(Number(event.target.value))} /></label>
          <label className="text-xs"><span className={LABEL}>{t(locale, "Salto", "Jump", "Salto")}</span><input className={INPUT} type="number" value={jump} onChange={(event) => setJump(Number(event.target.value))} /></label>
      </div>
      {card ? (
        <div className="mt-3 flex items-center gap-2">
          <RadarHex attributes={card.attributes} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-xs font-bold text-volt">{card.name}</p>
            <p className="text-[10px] text-white/50">{card.archetype} · {card.rarity}</p>
          <p className="text-[11px]">{t(locale, "Ataque", "Attack", "Ataque")} <strong className="text-crimson">{card.spikeReachCm.toFixed(1)} cm</strong></p>
          <p className="text-[11px]">{t(locale, "Bloqueo", "Block", "Bloqueio")} <strong className="text-emerald">{card.blockReachCm.toFixed(1)} cm</strong></p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-crimson">{t(locale, "Revisá altura/reach (reach ≥ altura).", "Check height/reach (reach ≥ height).", "Verifique altura/reach (reach ≥ altura).")}</p>
      )}
    </StationShell>
  );
}

/* 11 --------------------------------------------------------------------- */

export function TempoStation({ meta, locale, onSave }: StationProps) {
  const [code, setCode] = useState<TempoCode>("second");
  const [offset, setOffset] = useState(15);
  const window = tempoWindow(code, 0);
  const timing = classifyTiming(code, offset);

  return (
    <StationShell meta={meta} locale={locale} rows={4} onSave={onSave} onExample={() => { setCode("first"); setOffset(-180); }}>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(TEMPO_SPECS) as TempoCode[]).map((value) => (
          <button key={value} type="button" onClick={() => setCode(value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${code === value ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/50"}`}>
            {value}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/60">{window.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label="Ideal" value={`${window.idealMs} ms`} tone="text-volt" />
        <Metric label={t(locale, "Ventana", "Window", "Janela")} value={`${window.startMs} / ${window.endMs}`} />
      </div>
      <label className="mt-2 block text-xs">
        <span className={LABEL}>Offset: {offset} ms</span>
        <input className="mt-1 w-full accent-crimson" type="range" min={-300} max={500} step={5} value={offset} onChange={(event) => setOffset(Number(event.target.value))} />
      </label>
      <p className={`mt-1 text-xs font-bold ${timing.status === "PERFECT" ? "text-emerald" : "text-crimson"}`}>{timing.status} · {timing.message}</p>
    </StationShell>
  );
}

/* 12 --------------------------------------------------------------------- */

function acwrDays(lastWeek: number): DailyJumps[] {
  return acwrSample().map((day, index) => (index >= 21 ? { ...day, jumps: lastWeek } : day));
}

export function AcwrStation({ meta, locale, onSave }: StationProps) {
  const [load, setLoad] = useState(() => {
    const stored = Number(window.localStorage.getItem("volleyos.acwrLoad") ?? "185");
    return Number.isFinite(stored) && stored > 0 ? stored : 185;
  });
  useEffect(() => {
    window.localStorage.setItem("volleyos.acwrLoad", String(load));
  }, [load]);
  const days = useMemo(() => acwrDays(load), [load]);
  const report = useMemo(() => jumpLoad(days), [days]);
  const tone = report.color === "emerald" ? "text-emerald" : report.color === "amber" ? "text-volt" : "text-crimson";
  const bg = report.color === "emerald" ? "bg-emerald" : report.color === "amber" ? "bg-volt" : "bg-crimson";

  return (
    <StationShell meta={meta} locale={locale} rows={28} onSave={onSave} onExample={() => setLoad(185)}>
      <div className="flex items-center gap-2">
        {[{ label: t(locale, "Suave", "Light", "Leve"), value: 110 }, { label: t(locale, "Carga", "Load", "Carga"), value: 150 }, { label: t(locale, "Alta", "High", "Alta"), value: 185 }].map((option) => (
          <button key={option.value} type="button" onClick={() => setLoad(option.value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${load === option.value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="Aguda 7d" value={String(report.acute)} />
        <Metric label={t(locale, "Crónica", "Chronic", "Crônica")} value={report.chronicWeekly.toFixed(1)} />
        <Metric label="ACWR" value={report.ratio.toFixed(2)} tone={tone} />
      </div>
      <div className={`mt-2 rounded-lg ${bg} px-2 py-1 text-center text-[11px] font-black text-obsidian`}>{report.zone}</div>
      <p className="mt-1 text-[10px] text-white/60">{report.recommendation}</p>
    </StationShell>
  );
}

/* 13 --------------------------------------------------------------------- */

export function BlockShadowStation({ meta, locale, onSave }: StationProps) {
  const [zone, setZone] = useState<AttackZone>("zone_4");
  const [blockers, setBlockers] = useState(3);
  const [scheme, setScheme] = useState<BlockScheme>("line");
  const [depth, setDepth] = useState(0.55);
  const report = computeBlockShadow({ attackZone: zone, blockers, scheme, blockDepth: depth });
  const moved = report.defenders.filter((defender) => defender.movedCm > 0).length;

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={8}
      onSave={onSave}
      onExample={() => {
        setZone("zone_4");
        setBlockers(3);
        setScheme("line");
        setDepth(0.55);
      }}
    >
      <div className="flex flex-wrap gap-1">
        {(["zone_4", "zone_2", "pipe_6", "quick_3"] as AttackZone[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setZone(value)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${zone === value ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/50"}`}
          >
            {value.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Bloqueadores", "Blockers", "Bloqueadores")}</span>
          <input className="mt-1 w-full accent-crimson" type="range" min={1} max={3} value={blockers} onChange={(event) => setBlockers(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Profundidad", "Depth", "Profundidade")}</span>
          <input className="mt-1 w-full accent-crimson" type="range" min={0.2} max={2} step={0.05} value={depth} onChange={(event) => setDepth(Number(event.target.value))} />
        </label>
      </div>
      <div className="mt-2 flex gap-1">
        {(["line", "cross"] as BlockScheme[]).map((value) => (
          <button key={value} type="button" onClick={() => setScheme(value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${scheme === value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {value}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 90 90" className="mt-3 h-44 w-full rounded-xl border border-white/10 bg-obsidian/60" role="img" aria-label={t(locale, "Cono de sombra del bloqueo", "Block shadow cone", "Cone de sombra do bloqueio")}>
        <polygon points={report.shadowPolygon.map((point) => `${point.x * 10},${point.y * 10}`).join(" ")} fill="rgba(220,20,60,0.25)" stroke="#dc143c" strokeWidth="0.8" />
        {report.defenders.map((defender) => (
          <g key={defender.role}>
            <circle cx={defender.x * 10} cy={defender.y * 10} r={defender.insideShadow ? 2.6 : 2} fill={defender.insideShadow ? "#dc143c" : "#2ee6a8"} />
            <text x={defender.x * 10} y={defender.y * 10 - 3.4} fill="#fff" fontSize="3" textAnchor="middle">{defender.role}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Cobertura", "Coverage", "Cobertura")} value={`${report.coveragePct}%`} tone="text-volt" />
        <Metric label={t(locale, "Área", "Area", "Área")} value={`${report.shadowAreaM2} m²`} />
        <Metric label={t(locale, "Sin cubrir", "Uncovered", "Sem cobertura")} value={`${report.uncoveredWidthM} m`} />
        <Metric label={t(locale, "Movidos", "Moved", "Movidos")} value={`${moved}/4`} tone={moved > 0 ? "text-emerald" : "text-crimson"} />
      </div>
    </StationShell>
  );
}

/* 14 --------------------------------------------------------------------- */

export function SeamRadarStation({ meta, locale, onSave }: StationProps) {
  const [formation, setFormation] = useState<SeamFormation>("line3");
  const [serveType, setServeType] = useState<ServeType>("jump_spin");
  const [landingX, setLandingX] = useState(4.8);
  const [landingY, setLandingY] = useState(5.6);
  const report = useMemo(
    () =>
      computeSeam({
        formation,
        rotation: 2,
        serveOrigin: "1",
        serveType,
        landingX,
        landingY,
        attackerReleaseAngle: 40,
      }),
    [formation, serveType, landingX, landingY],
  );
  const tone = report.priority === "CRITICAL" ? "text-crimson" : report.priority === "HIGH" ? "text-volt" : "text-emerald";

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={8}
      onSave={onSave}
      onExample={() => {
        setFormation("line3");
        setServeType("jump_spin");
        setLandingX(4.8);
        setLandingY(5.6);
      }}
    >
      <div className="flex flex-wrap gap-1">
        {(["line3", "line4"] as SeamFormation[]).map((value) => (
          <button key={value} type="button" onClick={() => setFormation(value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${formation === value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {value}
          </button>
        ))}
        <select className="rounded-lg border border-white/15 bg-obsidian px-2 py-1 text-[10px] text-white" value={serveType} onChange={(event) => setServeType(event.target.value as ServeType)} aria-label={t(locale, "Tipo de saque", "Serve type", "Tipo de saque")}>
          <option value="jump_spin">{t(locale, "Salto con efecto", "Jump spin", "Salto com efeito")}</option>
          <option value="jump_float">{t(locale, "Salto flotante", "Jump float", "Salto flutuante")}</option>
          <option value="short_drop">{t(locale, "Corto", "Short drop", "Curto")}</option>
        </select>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className={LABEL}>X: {landingX.toFixed(1)} m</span>
          <input className="mt-1 w-full accent-crimson" type="range" min={0} max={9} step={0.1} value={landingX} onChange={(event) => setLandingX(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>Y: {landingY.toFixed(1)} m</span>
          <input className="mt-1 w-full accent-crimson" type="range" min={0} max={9} step={0.1} value={landingY} onChange={(event) => setLandingY(Number(event.target.value))} />
        </label>
      </div>
      <svg viewBox="0 0 90 90" className="mt-3 h-44 w-full rounded-xl border border-white/10 bg-obsidian/60" role="img" aria-label={t(locale, "Radar de costuras", "Seam radar", "Radar de costuras")}>
        <line x1={report.seamX * 10} y1={report.seamY * 10 - 4} x2={report.seamX * 10} y2={report.seamY * 10 + 4} stroke="#2ee6a8" strokeWidth="1" />
        {report.receivers.map((receiver) => (
          <g key={receiver.id}>
            <circle cx={receiver.x * 10} cy={receiver.y * 10} r={receiver.id === report.primaryReceiver ? 2.8 : 2} fill={receiver.id === report.seamOwner ? "#dc143c" : "#2ee6a8"} />
            <text x={receiver.x * 10} y={receiver.y * 10 - 3.4} fill="#fff" fontSize="3" textAnchor="middle">{receiver.id}</text>
          </g>
        ))}
        <circle cx={landingX * 10} cy={landingY * 10} r={1.6} fill="#ffd60a" />
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Costura", "Seam gap", "Costura")} value={`${report.gapCm} cm`} />
        <Metric label={t(locale, "Prioridad", "Priority", "Prioridade")} value={report.priority} tone={tone} />
        <Metric label={t(locale, "Recibe", "Primary", "Recebe")} value={report.primaryReceiver} />
        <Metric label={t(locale, "Cierra", "Owner", "Fecha")} value={report.seamOwner} tone="text-volt" />
      </div>
      <p className="mt-2 text-[11px] text-white/65">{report.drill}</p>
    </StationShell>
  );
}

/* 15 --------------------------------------------------------------------- */

const SETTER_SAMPLE: SetDistribution[] = [
  { rotation: 1, quality: "+", target: "Z4", count: 9 },
  { rotation: 1, quality: "+", target: "Z3-Quick", count: 2 },
  { rotation: 2, quality: "+", target: "Z4", count: 5 },
  { rotation: 2, quality: "#", target: "Z2-Back", count: 4 },
  { rotation: 2, quality: "!", target: "Pipe-Z6", count: 2 },
  { rotation: 3, quality: "+", target: "Z4", count: 3 },
  { rotation: 3, quality: "#", target: "Z3-Quick", count: 5 },
  { rotation: 3, quality: "+", target: "Setter-Dump", count: 2 },
  { rotation: 4, quality: "+", target: "Z2-Back", count: 6 },
  { rotation: 4, quality: "#", target: "Z4", count: 3 },
  { rotation: 5, quality: "+", target: "Pipe-Z6", count: 4 },
  { rotation: 5, quality: "-", target: "Z4", count: 3 },
  { rotation: 6, quality: "+", target: "Z4", count: 4 },
  { rotation: 6, quality: "#", target: "Z3-Quick", count: 4 },
  { rotation: 6, quality: "!", target: "Z2-Back", count: 2 },
];

const SETTER_PREDICTABLE: SetDistribution[] = [
  { rotation: 1, quality: "+", target: "Z4", count: 12 },
  { rotation: 2, quality: "+", target: "Z4", count: 11 },
  { rotation: 3, quality: "+", target: "Z4", count: 10 },
  { rotation: 4, quality: "+", target: "Z4", count: 9 },
  { rotation: 5, quality: "+", target: "Z4", count: 10 },
  { rotation: 6, quality: "+", target: "Z4", count: 8 },
  { rotation: 5, quality: "#", target: "Z3-Quick", count: 2 },
];

export function SetterIQStation({ meta, locale, onSave }: StationProps) {
  const [preset, setPreset] = useState<"balanced" | "predictable">("balanced");
  const report = useMemo(
    () => computeSetterIQ(preset === "balanced" ? SETTER_SAMPLE : SETTER_PREDICTABLE),
    [preset],
  );
  const advice = report.bias
    ? t(locale, `El rival puede cargar el bloqueo a ${report.bias}.`, `Opponents can load the block on ${report.bias}.`, `O adversário pode carregar o bloqueio em ${report.bias}.`)
    : report.unpredictability < 45
      ? t(locale, "Distribución predecible: abre Pipe y Back.", "Predictable distribution: open Pipe and Back.", "Distribuição previsível: abra Pipe e Back.")
      : t(locale, "Distribución sana: mantén la dispersión.", "Healthy distribution: keep spreading the ball.", "Distribuição saudável: mantenha a dispersão.");
  const maxCount = Math.max(...report.targets.map((target) => target.count), 1);

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={15}
      onSave={onSave}
      onExample={() => setPreset("balanced")}
    >
      <div className="flex gap-1">
        {(["balanced", "predictable"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setPreset(value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${preset === value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {value === "balanced" ? t(locale, "Equilibrado", "Balanced", "Equilibrado") : t(locale, "Predecible", "Predictable", "Previsível")}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label={t(locale, "IQ", "IQ", "IQ")} value={`${report.unpredictability}`} tone={report.unpredictability >= 45 ? "text-emerald" : "text-crimson"} />
        <Metric label="HHI" value={`${report.hhi}`} />
        <Metric label={t(locale, "Armados", "Sets", "Levantamentos")} value={`${report.totalSets}`} />
      </div>
      <div className="mt-3 space-y-1.5">
        {report.targets.map((target) => (
          <div key={target.target} className="flex items-center gap-2 text-[10px]">
            <span className="w-20 shrink-0 font-semibold text-white/70">{target.target}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-volt" style={{ width: `${(target.count / maxCount) * 100}%` }} />
            </span>
            <span className="w-12 text-right tabular-nums text-white/60">{target.sharePct}%</span>
          </div>
        ))}
      </div>
      <p className="mt-2 rounded-lg border border-white/10 bg-obsidian/60 px-2 py-1 text-[10px] text-white/70">{advice}</p>
    </StationShell>
  );
}

/* 16 --------------------------------------------------------------------- */

const SHIRT_DEFAULTS: LineupNumbers = { setter: 1, opposite: 11, outside1: 4, outside2: 7, middle1: 14, middle2: 18 };

export function LineupSlipStation({ meta, locale, onSave }: StationProps) {
  const [rotation, setRotation] = useState(1);
  const [libero, setLibero] = useState(21);
  const [shirts, setShirts] = useState<LineupNumbers>(SHIRT_DEFAULTS);
  const roleLabels: Record<keyof LineupNumbers, string> = {
    setter: t(locale, "Armador", "Setter", "Levantador"),
    opposite: t(locale, "Opuesto", "Opposite", "Oposto"),
    outside1: t(locale, "Punta 1", "Outside 1", "Ponteiro 1"),
    outside2: t(locale, "Punta 2", "Outside 2", "Ponteiro 2"),
    middle1: t(locale, "Central 1", "Middle 1", "Central 1"),
    middle2: t(locale, "Central 2", "Middle 2", "Central 2"),
  };
  let report = null;
  let error: string | null = null;
  try {
    report = buildLineupSlip({ ...shirts, rotationStart: rotation, libero });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "invalid lineup";
  }
  const zoneOrder = [4, 3, 2, 5, 6, 1];
  const updateShirt = (role: keyof LineupNumbers, value: number): void => {
    setShirts((current) => ({ ...current, [role]: value }));
  };

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={7}
      onSave={onSave}
      onExample={() => {
        setRotation(1);
        setLibero(21);
        setShirts(SHIRT_DEFAULTS);
      }}
    >
      <label className="block text-xs">
        <span className={LABEL}>{t(locale, "Rotación inicial", "Starting rotation", "Rotação inicial")}: R{rotation}</span>
        <input className="mt-1 w-full accent-crimson" type="range" min={1} max={6} value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
      </label>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {(Object.keys(shirts) as Array<keyof LineupNumbers>).map((role) => (
          <label key={role} className="text-[9px] text-white/60">
            {roleLabels[role]}
            <input className="mt-0.5 w-full rounded border border-white/15 bg-obsidian px-1 py-0.5 text-xs text-white" type="number" min={1} max={99} value={shirts[role]} onChange={(event) => updateShirt(role, Number(event.target.value))} />
          </label>
        ))}
        <label className="text-[9px] text-white/60">
          {t(locale, "Líbero", "Libero", "Líbero")}
          <input className="mt-0.5 w-full rounded border border-white/15 bg-obsidian px-1 py-0.5 text-xs text-white" type="number" min={1} max={99} value={libero} onChange={(event) => setLibero(Number(event.target.value))} />
        </label>
      </div>
      {error ? <p className="mt-2 rounded-lg bg-crimson/20 px-2 py-1 text-[10px] text-crimson">{error}</p> : null}
      {report ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px]">
            {zoneOrder.map((zone) => {
              const slot = report.lineup.find((item) => item.zone === zone);
              return (
                <div key={zone} className="rounded-lg border border-white/10 bg-obsidian/60 p-1.5">
                  <p className="text-[8px] uppercase tracking-wider text-white/40">{slot?.roman} · Z{zone}</p>
                  <p className="text-base font-black text-volt">{slot?.number}</p>
                  <p className="text-[8px] text-white/50">{slot ? roleLabels[slot.role] : ""}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-white/65">{report.message}</p>
          <ul className="mt-1 space-y-0.5 text-[10px] text-emerald">
            {report.liberoWindows.map((window) => <li key={window.rotation}>#{libero} → Z{window.zone} · {window.note}</li>)}
          </ul>
        </>
      ) : null}
    </StationShell>
  );
}

/* 17 --------------------------------------------------------------------- */

const SEAL_PAYLOAD: JsonValue = {
  match_id: "ARG-BRA-2026-10-22",
  set: 3,
  score: { home: 26, away: 24 },
  teams: ["Tiburones", "Condores"],
};

function parseJsonValue(text: string): JsonValue {
  return JSON.parse(text) as JsonValue;
}

export function IntegritySealStation({ meta, locale, onSave }: StationProps) {
  const [text, setText] = useState(() => JSON.stringify(SEAL_PAYLOAD, null, 2));
  const [seal, setSeal] = useState<Awaited<ReturnType<typeof buildSeal>> | null>(null);
  const [check, setCheck] = useState<Awaited<ReturnType<typeof verifySeal>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    buildSeal(SEAL_PAYLOAD)
      .then((report) => {
        if (active) setSeal(report);
      })
      .catch(() => {
        if (active) setError("Web Crypto no está disponible en este navegador.");
      });
    return () => {
      active = false;
    };
  }, []);

  const sign = async (): Promise<void> => {
    try {
      const payload = parseJsonValue(text);
      setSeal(await buildSeal(payload));
      setCheck(null);
      setError(null);
    } catch {
      setError(t(locale, "JSON inválido.", "Invalid JSON.", "JSON inválido."));
    }
  };

  const verifyTampered = async (): Promise<void> => {
    try {
      const payload = parseJsonValue(text);
      const current = seal ?? (await buildSeal(payload));
      if (!seal) setSeal(current);
      const altered = parseJsonValue(text.replace(/"home"\s*:\s*26/, '"home": 27'));
      setCheck(await verifySeal(altered, current.seal, payload));
      setError(null);
    } catch {
      setError(t(locale, "JSON inválido.", "Invalid JSON.", "JSON inválido."));
    }
  };

  return (
    <StationShell meta={meta} locale={locale} rows={3} onSave={onSave} onExample={() => { setText(JSON.stringify(SEAL_PAYLOAD, null, 2)); setCheck(null); void sign(); }}>
      <textarea className={`${INPUT} h-32 font-mono text-[10px]`} value={text} onChange={(event) => setText(event.target.value)} aria-label={t(locale, "Acta JSON", "JSON match sheet", "Súmula JSON")} />
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN_PRIMARY} onClick={() => void sign()}>{t(locale, "Firmar acta", "Sign sheet", "Assinar súmula")}</button>
        <button type="button" className={BTN} onClick={() => void verifyTampered()}>{t(locale, "Probar alteración", "Test tampering", "Testar alteração")}</button>
      </div>
      {error ? <p className="mt-2 text-[10px] text-crimson">{error}</p> : null}
      {seal ? (
        <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-obsidian/60 p-2 text-[10px]">
          <p className="break-all font-mono text-volt">{seal.seal}</p>
          <p className="break-all font-mono text-white/40">SHA-256 {seal.sha256.slice(0, 32)}…</p>
          <p className="break-all font-mono text-white/30">{seal.canonical}</p>
        </div>
      ) : null}
      {check ? (
        <p className={`mt-2 rounded-lg px-2 py-1 text-[10px] font-bold ${check.tampered ? "bg-crimson/20 text-crimson" : "bg-emerald/20 text-emerald"}`}>
          {check.message} {check.changedFields.length > 0 ? `(${check.changedFields.join(", ")})` : ""}
        </p>
      ) : null}
    </StationShell>
  );
}

/* 18 --------------------------------------------------------------------- */

const CAPSULE_DATA: JsonValue = {
  kind: "rotation_board",
  team: "Tiburones",
  rotation: 3,
  lineup: { setter: 1, opposite: 11, outside1: 4, outside2: 7 },
};

export function CapsuleStation({ meta, locale, onSave }: StationProps) {
  const [report, setReport] = useState<Awaited<ReturnType<typeof exportCapsule>> | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    exportCapsule("Pizarra 5-1 Tiburones", CAPSULE_DATA)
      .then((capsule) => {
        if (active) setReport(capsule);
      })
      .catch(() => {
        if (active) setError("Web Crypto no está disponible en este navegador.");
      });
    return () => {
      active = false;
    };
  }, []);

  const download = (): void => {
    if (!report) return;
    const blob = new Blob([report.capsule], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = report.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const load = async (): Promise<void> => {
    try {
      setReport(await importCapsule(text));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "invalid capsule");
    }
  };

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={1}
      onSave={onSave}
      onExample={() => {
        setText("");
        setError(null);
        void exportCapsule("Pizarra 5-1 Tiburones", CAPSULE_DATA).then(setReport);
      }}
    >
      {report ? (
        <div className="grid grid-cols-2 gap-2">
          <Metric label={t(locale, "Archivo", "File", "Arquivo")} value={report.filename} />
          <Metric label={t(locale, "Bytes", "Bytes", "Bytes")} value={`${report.bytes}`} />
          <div className="col-span-2 rounded-lg border border-white/10 bg-obsidian/60 p-2">
            <p className="break-all font-mono text-[9px] text-emerald">{report.checksum}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN_PRIMARY} onClick={download}>{t(locale, "Descargar .volleyos", "Download .volleyos", "Baixar .volleyos")}</button>
        <button type="button" className={BTN} onClick={() => void exportCapsule("Pizarra 5-1 Tiburones", CAPSULE_DATA).then(setReport)}>{t(locale, "Reexportar", "Re-export", "Reexportar")}</button>
      </div>
      <textarea className={`${INPUT} mt-2 h-20 font-mono text-[9px]`} value={text} placeholder={t(locale, "Pega una cápsula .volleyos aquí", "Paste a .volleyos capsule here", "Cole uma cápsula .volleyos aqui")} onChange={(event) => setText(event.target.value)} aria-label={t(locale, "Cápsula para importar", "Capsule to import", "Cápsula para importar")} />
      <button type="button" className={`${BTN} mt-1`} onClick={() => void load()}>{t(locale, "Importar y verificar", "Import and verify", "Importar e verificar")}</button>
      {error ? <p className="mt-2 text-[10px] text-crimson">{error}</p> : null}
      {report?.action === "import" ? <p className="mt-1 text-[10px] text-emerald">{report.message}</p> : null}
    </StationShell>
  );
}

/* 19 --------------------------------------------------------------------- */

const CARD_BUTTON: Record<CardKind, string> = {
  WARNING_YELLOW: "border-amber-400/60 bg-amber-400/10 text-amber-200",
  PENALTY_RED: "border-crimson/60 bg-crimson/10 text-crimson",
  EXPULSION_JOINT: "border-orange-500/60 bg-orange-500/10 text-orange-200",
  DISQUALIFICATION_SEPARATE: "border-rose-700/60 bg-rose-700/10 text-rose-200",
  DELAY_WARNING: "border-sky-400/60 bg-sky-400/10 text-sky-200",
  DELAY_PENALTY: "border-indigo-400/60 bg-indigo-400/10 text-indigo-200",
};

export function RefereeConsoleStation({ meta, locale, onSave }: StationProps) {
  const [events, setEvents] = useState<RefereeEvent[]>([
    { team: "A", player: 4, kind: "WARNING_YELLOW" },
    { team: "B", kind: "DELAY_WARNING" },
  ]);
  const report = useMemo(
    () => refereeReport({ scoreA: 18, scoreB: 17, serving: "A", events }),
    [events],
  );

  const add = (event: RefereeEvent): void => setEvents((previous) => [...previous, event]);

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={report.sanctions.length}
      onSave={onSave}
      onExample={() => setEvents([])}
    >
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t(locale, "Marcador", "Score", "Placar")} value={`${report.scoreA}-${report.scoreB}`} tone="text-volt" />
        <Metric label={t(locale, "Saque", "Serve", "Saque")} value={report.serving} />
        <Metric label={t(locale, "Reloj", "Clock", "Relógio")} value={`${report.serveSeconds}s`} tone="text-emerald" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={() => add({ team: "A", player: 4, kind: "WARNING_YELLOW" })}>🟨 A #4</button>
        <button type="button" className={BTN} onClick={() => add({ team: "A", player: 4, kind: "WARNING_YELLOW" })}>🟨🟥 A #4</button>
        <button type="button" className={BTN} onClick={() => add({ team: "B", kind: "DELAY_WARNING" })}>⏱ B demora</button>
        <button type="button" className={BTN} onClick={() => add({ team: "B", player: 7, kind: "EXPULSION_JOINT" })}>🟥 B #7</button>
        <button type="button" className={BTN} onClick={() => playWhistle("double")}>🔊 {t(locale, "Silbato", "Whistle", "Apito")}</button>
      </div>
      <div className="mt-3 space-y-1">
        {report.sanctions.map((sanction) => (
          <div key={sanction.index} className={`rounded-lg border px-2 py-1 text-[10px] ${CARD_BUTTON[sanction.applied]}`}>
            <p className="font-bold">
              #{sanction.index} {sanction.team}{sanction.player ? ` #${sanction.player}` : ""} · {sanction.applied.replaceAll("_", " ")}
              {sanction.escalated ? " · ESCALADO" : ""}
            </p>
            <p className="text-white/60">{sanction.text}</p>
            <p className="tabular-nums text-white/40">{sanction.scoreA}-{sanction.scoreB} · saque {sanction.serving}</p>
          </div>
        ))}
        {report.sanctions.length === 0 ? <p className="text-[11px] text-white/40">{t(locale, "Sin sanciones: partido limpio.", "No sanctions: clean match.", "Sem sanções: jogo limpo.")}</p> : null}
      </div>
      <p className="mt-2 text-[10px] text-white/50">{t(locale, "Regla 21 FIVB · amarilla escala a roja · demora escala a castigo.", "FIVB Rule 21 · yellow escalates to red · delay escalates to penalty.", "Regra 21 FIVB · amarelo escala para vermelho · demora escala para castigo.")}</p>
    </StationShell>
  );
}

/* 20 --------------------------------------------------------------------- */

const SUB_SAMPLE: SubEvent[] = [
  { team: "A", outNumber: 5, inNumber: 15, position: 1 },
  { team: "A", outNumber: 6, inNumber: 16, position: 2 },
  { team: "A", outNumber: 15, inNumber: 5, position: 1 },
];

export function SubstitutionTrackerStation({ meta, locale, onSave }: StationProps) {
  const [events, setEvents] = useState<SubEvent[]>(SUB_SAMPLE);
  const report = useMemo(() => trackSubstitutions(events), [events]);

  const add = (event: SubEvent): void => setEvents((previous) => [...previous, event]);
  const fillSet = (): void => {
    const pairs: SubEvent[] = [4, 5, 6, 7, 8, 9].map((starter, index) => ({
      team: "A" as const,
      outNumber: starter,
      inNumber: starter + 10,
      position: index + 1,
    }));
    setEvents(pairs);
  };

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={report.events.length}
      onSave={onSave}
      onExample={() => setEvents(SUB_SAMPLE)}
    >
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t(locale, "Quedan A", "A left", "Restam A")} value={`${report.remainingSubs.A}`} tone="text-volt" />
        <Metric label={t(locale, "Quedan B", "B left", "Restam B")} value={`${report.remainingSubs.B}`} />
        <Metric label={t(locale, "Pares", "Pairs", "Pares")} value={`${report.pairs.length}`} tone="text-emerald" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={fillSet}>{t(locale, "Llenar set", "Fill set", "Preencher set")}</button>
        <button type="button" className={BTN} onClick={() => add({ team: "A", outNumber: 10, inNumber: 20, position: 6 })}>{t(locale, "Séptimo cambio", "Seventh sub", "Sétima troca")}</button>
        <button type="button" className={BTN} onClick={() => add({ team: "B", outNumber: 3, inNumber: 13, position: 3, exceptional: true })}>{t(locale, "Lesión B", "B injury", "Lesão B")}</button>
      </div>
      <div className="mt-3 space-y-1">
        {report.events.map((event) => (
          <div key={event.index} className={`rounded-lg px-2 py-1 text-[10px] ${event.status === "LEGAL" ? "bg-emerald/10 text-emerald" : "bg-crimson/10 text-crimson"}`}>
            <p className="font-bold">
              {event.team} · P{event.position} · #{event.outNumber} → #{event.inNumber} · {event.status.replaceAll("_", " ")}
            </p>
            <p className="text-white/60">{event.reason} · {t(locale, "quedan", "left", "restam")} {event.remainingSubs}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/50">{t(locale, "Máximo 6 por set · el par queda atado a su posición · la lesión excepcional no consume cupo.", "Max 6 per set · the pair is bound to its position · exceptional injury does not consume the limit.", "Máximo 6 por set · o par fica preso à posição · lesão excepcional não consome limite.")}</p>
    </StationShell>
  );
}

/* 21 --------------------------------------------------------------------- */

export function CourtSplitStation({ meta, locale, onSave }: StationProps) {
  const [mode, setMode] = useState<"pickup" | "tournament">("pickup");
  const [courtCost, setCourtCost] = useState(90);
  const [teams, setTeams] = useState(8);
  const report = useMemo(
    () =>
      splitCosts({
        mode,
        courtCost,
        extrasCost: 30,
        thirdHalfCost: 15,
        attendees: [
          { name: "Ana", deposit: 30 },
          { name: "Beto" },
          { name: "Caro", discountPct: 50 },
          { name: "Dani" },
        ],
        paymentAlias: "volleyos.demo",
        paymentHolder: "Tesoreria",
        teams,
        teamFee: 50,
        refereeCost: 20,
        prizesCost: 10,
      }),
    [courtCost, mode, teams],
  );

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={report.pickup?.rows.length ?? 1}
      onSave={onSave}
      onExample={() => {
        setMode("pickup");
        setCourtCost(90);
        setTeams(8);
      }}
    >
      <div className="flex gap-1">
        {(["pickup", "tournament"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={value === mode ? BTN_PRIMARY : BTN}
            onClick={() => setMode(value)}
          >
            {value === "pickup" ? t(locale, "Vaquita", "Pickup", "Rateio") : t(locale, "Torneo", "Tournament", "Torneio")}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Cancha", "Court", "Quadra")}</span>
          <input className={INPUT} type="number" min={0} value={courtCost} onChange={(event) => setCourtCost(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Equipos", "Teams", "Equipes")}</span>
          <input className={INPUT} type="number" min={1} value={teams} onChange={(event) => setTeams(Number(event.target.value))} />
        </label>
      </div>
      {report.pickup ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label={t(locale, "Total", "Total", "Total")} value={`${report.pickup.currency} ${report.pickup.total}`} tone="text-volt" />
            <Metric label={t(locale, "Personas", "People", "Pessoas")} value={`${report.pickup.rows.length}`} />
          </div>
          <div className="mt-2 space-y-1">
            {report.pickup.rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 text-[10px]">
                <span>{row.name} {row.discountPct ? `(-${row.discountPct}%)` : ""}</span>
                <span className="tabular-nums text-white/60">{row.share} · {row.status}</span>
              </div>
            ))}
          </div>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-obsidian/60 p-2 text-[9px] text-white/60">{report.pickup.whatsapp}</pre>
        </>
      ) : null}
      {report.tournament ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label={t(locale, "Ingresos", "Revenue", "Receita")} value={`${report.tournament.revenue}`} />
          <Metric label={t(locale, "Costos", "Costs", "Custos")} value={`${report.tournament.costs}`} />
          <Metric label={t(locale, "Resultado", "Profit", "Resultado")} value={`${report.tournament.profit}`} tone="text-emerald" />
          <Metric label="Break-even" value={`${report.tournament.breakEvenTeams}`} tone="text-volt" />
        </div>
      ) : null}
    </StationShell>
  );
}

/* 22 --------------------------------------------------------------------- */

const GESTURE_KEYS = Object.keys(REFEREE_GESTURES) as RefereeGesture[];

export function FanCompanionStation({ meta, locale, onSave }: StationProps) {
  const [gesture, setGesture] = useState<RefereeGesture>("touch_top_net");
  const [answers, setAnswers] = useState<Array<number | null>>(FAN_QUESTIONS.map(() => null));
  const decoded = useMemo(() => fanReport({ action: "decode", gesture }), [gesture]);
  const numeric = answers.filter((answer): answer is number => answer !== null);
  const trivia = numeric.length === FAN_QUESTIONS.length ? fanReport({ action: "trivia", answers: numeric }) : null;

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={trivia?.trivia?.score ?? 1}
      onSave={onSave}
      onExample={() => {
        setGesture("touch_top_net");
        setAnswers(FAN_QUESTIONS.map(() => null));
      }}
    >
      <label className="text-xs">
        <span className={LABEL}>{t(locale, "Gesto del árbitro", "Referee gesture", "Gesto do árbitro")}</span>
        <select className={INPUT} value={gesture} onChange={(event) => setGesture(event.target.value as RefereeGesture)}>
          {GESTURE_KEYS.map((key) => (
            <option key={key} value={key}>{REFEREE_GESTURES[key].call[locale]}</option>
          ))}
        </select>
      </label>
      {decoded.decision ? (
        <div className="mt-2 rounded-lg border border-volt/30 bg-volt/5 p-2 text-[11px]">
          <p className="font-bold text-volt">{decoded.decision.call[locale]} <span className="text-white/40">{decoded.decision.rule}</span></p>
          <p className="mt-1 text-white/70">{decoded.decision.why[locale]}</p>
          <p className="mt-1 text-white/50">{decoded.decision.example[locale]}</p>
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {FAN_QUESTIONS.map((question, index) => (
          <div key={question.id} className="rounded-lg border border-white/10 bg-obsidian/40 p-2 text-[10px]">
            <p className="font-semibold text-white/80">{index + 1}. {question.question[locale]}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {question.options[locale].map((option, optionIndex) => (
                <button
                  key={option}
                  type="button"
                  className={answers[index] === optionIndex ? BTN_PRIMARY : BTN}
                  onClick={() => setAnswers((previous) => previous.map((value, position) => (position === index ? optionIndex : value)))}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {trivia?.trivia ? (
        <div className="mt-2 rounded-lg border border-emerald/30 bg-emerald/5 p-2 text-[10px] text-emerald">
          <p className="font-bold">{trivia.trivia.score}/{trivia.trivia.total} · {trivia.trivia.rank}</p>
          {trivia.trivia.answers.map((answer) => (
            <p key={answer.id} className="text-white/60">#{answer.id} {answer.isCorrect ? "✓" : "✗"} {answer.explanation[locale]} ({answer.rule})</p>
          ))}
        </div>
      ) : null}
    </StationShell>
  );
}

/* 23 --------------------------------------------------------------------- */

const SETTER_SIGNAL_SAMPLE: Array<{ gesture: SetterGesture; play: SetterPlay }> = [
  { gesture: "index_finger", play: "A" },
  { gesture: "two_fingers", play: "B/Shoot" },
  { gesture: "three_fingers", play: "C/7" },
  { gesture: "fist", play: "D/Atras" },
  { gesture: "open_hand", play: "Pipe" },
  { gesture: "pinky", play: "Doble (Cruce)" },
  { gesture: "thumb_up", play: "A" },
];

export function SetterSignalsStation({ meta, locale, onSave }: StationProps) {
  const [assignments, setAssignments] = useState(SETTER_SIGNAL_SAMPLE);
  const report = useMemo(
    () => buildSignalSheet({ team: "Tiburones", setterName: "Sofi", assignments }),
    [assignments],
  );

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={report.assignments.length}
      onSave={onSave}
      onExample={() => setAssignments(SETTER_SIGNAL_SAMPLE)}
    >
      <div className="grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Válida", "Valid", "Válida")} value={report.valid ? "SÍ" : "NO"} tone={report.valid ? "text-emerald" : "text-crimson"} />
        <Metric label={t(locale, "Colisiones", "Collisions", "Colisões")} value={`${report.collisions.length}`} tone={report.collisions.length ? "text-crimson" : "text-emerald"} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={() => setAssignments([...assignments, { gesture: "index_finger", play: "Pipe" }])}>
          {t(locale, "Duplicar gesto", "Duplicate gesture", "Duplicar gesto")}
        </button>
        <button type="button" className={BTN} onClick={() => setAssignments(SETTER_SIGNAL_SAMPLE)}>{t(locale, "Reparar", "Repair", "Reparar")}</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        {report.assignments.map((assignment) => (
          <div key={`${assignment.gesture}-${assignment.play}`} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
            <span className="font-mono text-volt">{assignment.icon} {assignment.gesture.replaceAll("_", " ")}</span>
            <span className="font-bold">{assignment.play}</span>
          </div>
        ))}
      </div>
      {report.duplicatePlays.length > 0 ? <p className="mt-1 text-[10px] text-crimson">{t(locale, "Jugadas duplicadas", "Duplicate plays", "Jogadas duplicadas")}: {report.duplicatePlays.join(", ")}</p> : null}
      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-obsidian/60 p-2 text-[9px] text-white/60">{report.sheet}</pre>
    </StationShell>
  );
}

/* 24 --------------------------------------------------------------------- */

const MVP_SAMPLE: MvpPlayer[] = [
  { name: "Ana", team: "Tiburones", points: 22, blocks: 3, aces: 2, digs: 9, pressurePoints: 5, votes: 4 },
  { name: "Beto", team: "Marlins", points: 19, blocks: 7, aces: 1, digs: 6, assists: 4 },
  { name: "Caro", team: "Tiburones", points: 8, digs: 22, isLibero: true },
  { name: "Dani", team: "Marlins", points: 14, blocks: 2, aces: 3, pressurePoints: 3 },
];

export function MvpAwardsStation({ meta, locale, onSave }: StationProps) {
  const [report, setReport] = useState<Awaited<ReturnType<typeof awardMvp>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (): void => {
    awardMvp({ match: "Final · Tiburones vs Marlins", players: MVP_SAMPLE })
      .then((result) => {
        setReport(result);
        setError(null);
      })
      .catch(() => setError(t(locale, "Web Crypto no disponible.", "Web Crypto unavailable.", "Web Crypto indisponível.")));
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={report?.awards.length ?? 6}
      onSave={onSave}
      onExample={run}
    >
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {(report?.awards ?? []).map((award) => (
          <div key={award.key} className="rounded-lg border border-white/10 bg-obsidian/60 px-2 py-1">
            <p className="font-bold text-white/80">{award.emoji} {award.label}</p>
            <p className="text-volt">{award.winner} <span className="text-white/40">{award.value}</span></p>
          </div>
        ))}
      </div>
      {report ? (
        <>
          <div className="mt-2 rounded-lg border border-volt/30 bg-volt/5 p-2 text-[9px]">
            <p className="break-all font-mono text-volt">{report.seal}</p>
            <p className="break-all font-mono text-white/40">SHA-256 {report.sha256.slice(0, 32)}…</p>
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white/5 p-2 text-[10px] text-white/70">{report.card}</pre>
        </>
      ) : null}
      <button type="button" className={`${BTN} mt-2`} onClick={run}>{t(locale, "Re-sellar premios", "Re-seal awards", "Re-selar prêmios")}</button>
      {error ? <p className="mt-1 text-[10px] text-crimson">{error}</p> : null}
    </StationShell>
  );
}

/* 25 -------------------------------------------------------------------- */

const CHALK_SAMPLE = [
  { points: [{ x: 1, y: 1 }, { x: 4, y: 6 }, { x: 6, y: 12 }] },
  { points: [{ x: 6, y: 14 }, { x: 8, y: 17 }] },
];

export function TimeoutChalkboardStation({ meta, locale, onSave }: StationProps) {
  const [reason, setReason] = useState<ChalkReason>("stop_serve_run");
  const report = useMemo(
    () => buildChalkboard({ reason, rotation: 4, scoreA: 18, scoreB: 21, strokes: CHALK_SAMPLE }),
    [reason],
  );
  const reasons: Array<{ key: ChalkReason; label: string }> = [
    { key: "stop_serve_run", label: t(locale, "Cortar saque", "Stop serve run", "Cortar saque") },
    { key: "organize_sideout", label: t(locale, "Side-out", "Side-out", "Side-out") },
    { key: "match_point_defense", label: t(locale, "Defensa MP", "Match point D", "Defesa MP") },
  ];
  return (
    <StationShell meta={meta} locale={locale} rows={report.cues.length} onSave={onSave} onExample={() => setReason("stop_serve_run")}>
      <div className="flex flex-wrap gap-1">
        {reasons.map((item) => (
          <button key={item.key} type="button" className={reason === item.key ? BTN_PRIMARY : BTN} onClick={() => setReason(item.key)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-obsidian/60 px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-white/40">{t(locale, "Reloj FIVB", "FIVB clock", "Relógio FIVB")}</span>
        <span className="font-mono text-2xl font-black text-volt">{report.seconds.toFixed(1)}s</span>
      </div>
      <div className="mt-2 space-y-1">
        {report.cues.map((cue) => (
          <div key={cue.code} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-crimson">{cue.priority} · {cue.code}</p>
            <p className="text-[11px] text-white/70">{cue.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-white/40">{report.strokes.length} {t(locale, "trazos", "strokes", "traços")} · {report.totalLengthM.toFixed(2)} m</p>
    </StationShell>
  );
}

/* 26 -------------------------------------------------------------------- */

export function MomentumCoachStation({ meta, locale, onSave }: StationProps) {
  const [history, setHistory] = useState<Array<"A" | "B">>(["A", "A", "B", "B", "B"]);
  const report = useMemo(
    () => analyzeMomentum({ team: "A", history, rotations: [1, 2, 3, 3, 3].slice(0, history.length) }),
    [history],
  );
  const add = (team: "A" | "B"): void => setHistory((previous) => [...previous, team].slice(-20));
  return (
    <StationShell meta={meta} locale={locale} rows={history.length} onSave={onSave} onExample={() => setHistory(["A", "A", "B", "B", "B"])}>
      <div className="grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Momentum", "Momentum", "Momentum")} value={`${report.momentumIndex > 0 ? "+" : ""}${report.momentumIndex.toFixed(0)}`} tone={report.momentumIndex >= 0 ? "text-emerald" : "text-crimson"} />
        <Metric label={t(locale, "Racha rival", "Opponent run", "Sequência rival")} value={`${report.opponentRun}`} tone={report.opponentRun >= 3 ? "text-crimson" : "text-emerald"} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN_PRIMARY} onClick={() => add("A")}>+ A</button>
        <button type="button" className={BTN_PRIMARY} onClick={() => add("B")}>+ B</button>
        <button type="button" className={BTN} onClick={() => setHistory([])}>{t(locale, "Limpiar", "Clear", "Limpar")}</button>
      </div>
      <p className="mt-2 rounded-lg border border-white/10 bg-obsidian/60 px-2 py-2 text-[11px] text-white/70">{report.message}</p>
      <p className="mt-1 text-[10px] text-white/40">
        {report.recommendation} · {t(locale, "peor rotación", "worst rotation", "pior rotação")}: {report.worstRotation ?? "-"}
      </p>
    </StationShell>
  );
}

/* 27 -------------------------------------------------------------------- */

const DRAFT_SAMPLE: DraftPlayer[] = [
  { name: "Sofia", role: "setter", level: 5 },
  { name: "Valentina", role: "outside", level: 5 },
  { name: "Micaela", role: "middle", level: 5 },
  { name: "Carla", role: "opposite", level: 4 },
  { name: "Renata", role: "libero", level: 4 },
  { name: "Julieta", role: "outside", level: 4 },
  { name: "Martina", role: "middle", level: 3 },
  { name: "Lucia", role: "setter", level: 3 },
  { name: "Paula", role: "outside", level: 3 },
  { name: "Ines", role: "libero", level: 2 },
];

export function CaptainDraftStation({ meta, locale, onSave }: StationProps) {
  const [nonce, setNonce] = useState(0);
  const report = useMemo(
    () => snakeDraft({ captains: ["Tiburones", "Cóndores"], players: DRAFT_SAMPLE.map((player) => ({ ...player, level: player.level - (nonce % 2) }) ) }),
    [nonce],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={report.pickOrder.length} onSave={onSave} onExample={() => setNonce((value) => value + 1)}>
      <div className="grid grid-cols-2 gap-2">
        {report.teams.map((team) => (
          <div key={team.captain} className="rounded-lg border border-white/10 bg-obsidian/60 p-2">
            <p className="text-[11px] font-bold text-volt">{team.captain} · {team.averageLevel.toFixed(2)}</p>
            <p className="text-[9px] text-white/40">{team.balanced ? t(locale, "Equilibrado", "Balanced", "Equilibrado") : `${t(locale, "Falta", "Missing", "Falta")}: ${team.weakestDepartment}`}</p>
            <ul className="mt-1 space-y-0.5 text-[10px] text-white/70">
              {team.players.map((player) => <li key={player.name}>{player.name} <span className="text-white/30">{player.role}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/50">{t(locale, "Orden", "Order", "Ordem")}: {report.pickOrder.slice(0, 8).map((pick) => `${pick.captain[0]}:${pick.player.name}`).join(" · ")}</p>
      <p className="mt-1 text-[10px] text-emerald">{t(locale, "Mejor balance", "Best balance", "Melhor equilíbrio")}: {report.bestBalance} · {report.totalLevel} pts</p>
    </StationShell>
  );
}

/* 28 -------------------------------------------------------------------- */

const ROSTER_SAMPLE: RosterPlayerInput[] = [
  { name: "Sofia", number: 1, role: "setter", isCaptain: true },
  { name: "Valentina", number: 4, role: "outside" },
  { name: "Micaela", number: 7, role: "outside" },
  { name: "Renata", number: 9, role: "middle" },
  { name: "Carla", number: 11, role: "opposite" },
  { name: "Julieta", number: 14, role: "middle" },
  { name: "Martina", number: 21, role: "libero", isLibero: true },
];

export function RosterPassStation({ meta, locale, onSave }: StationProps) {
  const [report, setReport] = useState<Awaited<ReturnType<typeof buildRosterPass>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    buildRosterPass({ team: "Tiburones", tournament: "Copa Verano", players: ROSTER_SAMPLE })
      .then((result) => { if (alive) { setReport(result); setError(null); } })
      .catch(() => { if (alive) setError(t(locale, "Web Crypto no disponible.", "Web Crypto unavailable.", "Web Crypto indisponível.")); });
    return () => { alive = false; };
  }, [locale]);
  return (
    <StationShell meta={meta} locale={locale} rows={ROSTER_SAMPLE.length} onSave={onSave} onExample={() => undefined}>
      {report ? (
        <>
          <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
            <Metric label={t(locale, "Jugadores", "Players", "Jogadores")} value={`${ROSTER_SAMPLE.length}`} tone="text-white" />
            <Metric label={t(locale, "Liberos", "Liberos", "Líberos")} value={`${report.liberos}`} tone="text-white" />
            <Metric label={t(locale, "Capitán", "Captain", "Capitão")} value={report.captain} tone="text-volt" />
          </div>
          <p className="mt-2 break-all rounded-lg border border-volt/30 bg-volt/5 p-2 font-mono text-[11px] text-volt">{report.passCode}</p>
          <p className="mt-1 break-all font-mono text-[9px] text-white/40">{report.seal}</p>
          <p className="mt-1 text-[10px] text-emerald">{report.checks.join(" · ")}</p>
        </>
      ) : null}
      {error ? <p className="mt-1 text-[10px] text-crimson">{error}</p> : null}
    </StationShell>
  );
}

/* 29 -------------------------------------------------------------------- */

const EQUIPMENT_SAMPLE: Record<EquipmentCategory, { center: number; label: string }> = {
  men_indoor: { center: 243, label: "Masculino" },
  women_indoor: { center: 224, label: "Femenino" },
  mixed_recreational: { center: 235, label: "Mixto" },
  u18_boys: { center: 235, label: "U18 M" },
  u18_girls: { center: 218, label: "U18 F" },
  newcom_senior: { center: 243, label: "Newcom" },
};

export function EquipmentInspectorStation({ meta, locale, onSave }: StationProps) {
  const [category, setCategory] = useState<EquipmentCategory>("men_indoor");
  const [surface, setSurface] = useState<"indoor" | "beach">("indoor");
  const sample = EQUIPMENT_SAMPLE[category];
  const report = useMemo(
    () => inspectEquipment({
      category,
      centerHeightCm: sample.center,
      sideAHeightCm: sample.center,
      sideBHeightCm: sample.center - 1,
      ballPressureKgfCm2: surface === "beach" ? 0.2 : 0.31,
      surface,
    }),
    [category, sample.center, surface],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={5} onSave={onSave} onExample={() => { setCategory("men_indoor"); setSurface("indoor"); }}>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(EQUIPMENT_SAMPLE) as EquipmentCategory[]).map((key) => (
          <button key={key} type="button" className={category === key ? BTN_PRIMARY : BTN} onClick={() => setCategory(key)}>{EQUIPMENT_SAMPLE[key].label}</button>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        <button type="button" className={surface === "indoor" ? BTN_PRIMARY : BTN} onClick={() => setSurface("indoor")}>Indoor</button>
        <button type="button" className={surface === "beach" ? BTN_PRIMARY : BTN} onClick={() => setSurface("beach")}>Beach</button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Red", "Net", "Rede")} value={`${report.expectedCm} cm`} tone={report.netOk ? "text-emerald" : "text-crimson"} />
        <Metric label={t(locale, "Desvío", "Deviation", "Desvio")} value={`${report.maxDeviationCm} cm`} tone={report.maxDeviationCm <= 2 ? "text-emerald" : "text-crimson"} />
        <Metric label="PSI" value={`${report.pressurePsi}`} tone={report.ballOk ? "text-emerald" : "text-crimson"} />
        <Metric label="kPa" value={`${report.pressureKpa}`} tone={report.ballOk ? "text-emerald" : "text-crimson"} />
      </div>
      <p className="mt-2 text-[11px] text-white/70">{report.ballStatus} · {report.ballsStacked} {t(locale, "balones apilados", "stacked balls", "bolas empilhadas")}</p>
      <p className={`mt-1 text-[10px] ${report.status === "OK" ? "text-emerald" : "text-crimson"}`}>{report.message}</p>
    </StationShell>
  );
}

/* 30 -------------------------------------------------------------------- */

export function MatchPosterStation({ meta, locale, onSave }: StationProps) {
  const [theme, setTheme] = useState<PosterTheme>("obsidian");
  const [format, setFormat] = useState<"story" | "feed">("story");
  const [nonce, setNonce] = useState(0);
  const [report, setReport] = useState<Awaited<ReturnType<typeof buildMatchPoster>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    buildMatchPoster({
      homeTeam: "Tiburones",
      awayTeam: "Cóndores",
      setsHome: 3,
      setsAway: 1,
      periods: [{ home: 25, away: 21 }, { home: 22, away: 25 }, { home: 25, away: 19 }, { home: 25, away: 23 }],
      tournament: "Copa Verano",
      mvp: "Valentina",
      roomId: "TIB-2026",
      theme,
      format,
    })
      .then((result) => { if (alive) { setReport(result); setError(null); } })
      .catch(() => { if (alive) setError(t(locale, "Web Crypto no disponible.", "Web Crypto unavailable.", "Web Crypto indisponível.")); });
    return () => { alive = false; };
  }, [locale, theme, format, nonce]);
  const download = (): void => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report.svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = report.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <StationShell meta={meta} locale={locale} rows={4} onSave={onSave} onExample={() => setNonce((value) => value + 1)}>
      <div className="flex flex-wrap gap-1">
        {(["obsidian", "crimson", "volt"] as PosterTheme[]).map((key) => (
          <button key={key} type="button" className={theme === key ? BTN_PRIMARY : BTN} onClick={() => setTheme(key)}>{key}</button>
        ))}
        <button type="button" className={format === "story" ? BTN_PRIMARY : BTN} onClick={() => setFormat("story")}>9:16</button>
        <button type="button" className={format === "feed" ? BTN_PRIMARY : BTN} onClick={() => setFormat("feed")}>1:1</button>
      </div>
      {report ? (
        <>
          <img alt="Preview del poster SVG" className="mx-auto mt-2 max-h-72 w-auto rounded-lg border border-white/10" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(report.svg)}`} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="break-all font-mono text-[9px] text-volt">{report.seal}</p>
            <button type="button" className={BTN} onClick={download}>{t(locale, "Descargar SVG", "Download SVG", "Baixar SVG")}</button>
          </div>
        </>
      ) : null}
      {error ? <p className="mt-1 text-[10px] text-crimson">{error}</p> : null}
    </StationShell>
  );
}

/* 31 -------------------------------------------------------------------- */

export function ServeRadarStation({ meta, locale, onSave }: StationProps) {
  const [targetX, setTargetX] = useState(7.5);
  const [targetY, setTargetY] = useState(6.5);
  const [flight, setFlight] = useState(700);
  const report = useMemo(
    () => serveRadar({ originXm: 0, originYm: 0, targetXm: targetX, targetYm: targetY, flightTimeMs: flight }),
    [flight, targetX, targetY],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => { setTargetX(9); setTargetY(7); setFlight(400); }}>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="km/h" value={report.initialSpeedKmh.toString()} tone="text-volt" />
        <Metric label={t(locale, "Margen", "Margin", "Margem")} value={`${report.reactionMarginMs} ms`} tone="text-emerald" />
        <Metric label={t(locale, "Distancia", "Distance", "Distancia")} value={`${report.arcDistanceM} m`} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs">
          <span className={LABEL}>X</span>
          <input className={INPUT} type="number" step="0.5" value={targetX} onChange={(event) => setTargetX(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>Y</span>
          <input className={INPUT} type="number" step="0.5" value={targetY} onChange={(event) => setTargetY(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>ms</span>
          <input className={INPUT} type="number" min={250} max={3000} step="50" value={flight} onChange={(event) => setFlight(Number(event.target.value))} />
        </label>
      </div>
      <p className="mt-2 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-volt">{report.classification.replaceAll("_", " ")}</p>
      <p className="mt-1 text-[10px] text-white/60">{report.message}</p>
    </StationShell>
  );
}

/* 32 -------------------------------------------------------------------- */

const MATCHUP_ATTACK = [90, 72, 64, 58, 46, 38];
const MATCHUP_BLOCK = [52, 58, 64, 70, 76, 82];

export function MatchupMatrixStation({ meta, locale, onSave }: StationProps) {
  const report = useMemo(() => matchupMatrix({ opponentAttack: MATCHUP_ATTACK, ownBlock: MATCHUP_BLOCK }), []);
  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => undefined}>
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t(locale, "Mejor inicio", "Best start", "Melhor inicio")} value={report.bestStartingRotation} tone="text-emerald" />
        <Metric label={t(locale, "Evitar", "Avoid", "Evitar")} value={report.worstStartingRotation} tone="text-crimson" />
        <Metric label="Top rival" value={`R${report.topAttackerIndex + 1}`} tone="text-volt" />
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1">
        {report.matrix.flatMap((row, own) =>
          row.map((value, rival) => (
            <span
              key={`${own}-${rival}`}
              className={`rounded px-1 py-1 text-center text-[9px] font-bold tabular-nums ${value >= 0 ? "bg-emerald/15 text-emerald" : "bg-crimson/15 text-crimson"}`}
            >
              {value.toFixed(0)}
            </span>
          )),
        )}
      </div>
      <p className="mt-2 text-[10px] text-white/60">{report.message}</p>
    </StationShell>
  );
}

/* 33 -------------------------------------------------------------------- */

const BLOCKOUT_DECISION_LABELS: Record<BlockoutDecision, string> = {
  HIGH_OUTSIDE_HAND_WIPE: "Mano afuera",
  SEAM_SPLIT: "Costura",
  SOFT_RECYCLE_OFF_HANDS: "Reciclaje",
  CROSS_COURT_ROLL_SHOT: "Roll shot",
};

export function BlockoutLabStation({ meta, locale, onSave }: StationProps) {
  const [zone, setZone] = useState<"zone_4" | "zone_2">("zone_4");
  const [distance, setDistance] = useState<"tight_0_3m" | "normal_1_0m" | "off_net_2_5m">("tight_0_3m");
  const [closure, setClosure] = useState<"double_closed" | "seam_open" | "late_outside_hand">("double_closed");
  const report = useMemo(
    () => evaluateBlockout({ zone, setDistance: distance, blockClosure: closure, attackerReachCm: 342, blockReachCm: 326 }),
    [closure, distance, zone],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={4} onSave={onSave} onExample={() => { setZone("zone_2"); setDistance("off_net_2_5m"); setClosure("seam_open"); }}>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <select className={INPUT} value={zone} onChange={(event) => setZone(event.target.value as "zone_4" | "zone_2")} aria-label="Zona">
          <option value="zone_4">Zona 4</option>
          <option value="zone_2">Zona 2</option>
        </select>
        <select className={INPUT} value={distance} onChange={(event) => setDistance(event.target.value as "tight_0_3m" | "normal_1_0m" | "off_net_2_5m")} aria-label="Distancia">
          <option value="tight_0_3m">Apretado</option>
          <option value="normal_1_0m">Normal</option>
          <option value="off_net_2_5m">Lejos</option>
        </select>
        <select className={INPUT} value={closure} onChange={(event) => setClosure(event.target.value as "double_closed" | "seam_open" | "late_outside_hand")} aria-label="Bloqueo">
          <option value="double_closed">Cerrado</option>
          <option value="seam_open">Costura</option>
          <option value="late_outside_hand">Mano tarde</option>
        </select>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Recomendado", "Recommended", "Recomendado")} value={BLOCKOUT_DECISION_LABELS[report.recommended]} tone="text-emerald" />
        <Metric label={t(locale, "Muneca", "Wrist", "Punho")} value={`${report.wristAngleDeg} deg`} tone="text-volt" />
      </div>
      <ul className="mt-3 space-y-1">
        {report.options.map((option) => (
          <li key={option.decision} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[11px] ${option.decision === report.recommended ? "bg-emerald/15 text-emerald" : "bg-white/5 text-white/70"}`}>
            <span>{BLOCKOUT_DECISION_LABELS[option.decision]}</span>
            <span className="tabular-nums">{option.probabilityPct}% | EV {option.ev}</span>
          </li>
        ))}
      </ul>
    </StationShell>
  );
}

/* 34 -------------------------------------------------------------------- */

export function PracticePlannerStation({ meta, locale, onSave }: StationProps) {
  const [players, setPlayers] = useState(9);
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [focus, setFocus] = useState<PracticeFocus>("k1_reception");
  const report = useMemo(() => planPractice({ players, durationMin: duration, focus }), [duration, focus, players]);
  return (
    <StationShell meta={meta} locale={locale} rows={report.blocks.length} onSave={onSave} onExample={() => { setPlayers(12); setDuration(120); setFocus("serve_pressure"); }}>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Jugadores", "Players", "Jogadores")}</span>
          <input className={INPUT} type="number" min={4} max={24} value={players} onChange={(event) => setPlayers(Number(event.target.value))} />
        </label>
        <select className={INPUT} value={duration} onChange={(event) => setDuration(Number(event.target.value) as 60 | 90 | 120)} aria-label="Duracion">
          <option value={60}>60 min</option>
          <option value={90}>90 min</option>
          <option value={120}>120 min</option>
        </select>
        <select className={INPUT} value={focus} onChange={(event) => setFocus(event.target.value as PracticeFocus)} aria-label="Foco">
          <option value="k1_reception">K1</option>
          <option value="block_defense_transition">Bloqueo</option>
          <option value="serve_pressure">Saque</option>
          <option value="setter_tempo">Tempo</option>
        </select>
      </div>
      <ul className="mt-3 space-y-1">
        {report.blocks.map((block) => (
          <li key={block.label} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]">
            <span className="font-bold text-white/80">{block.label}</span>
            <span className="text-white/50">{block.startMin}-{block.endMin} min</span>
            <span className="text-volt">{block.scoringTarget}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-white/60">{report.message}</p>
    </StationShell>
  );
}

/* 35 -------------------------------------------------------------------- */

export function PlayByPlayStation({ meta, locale, onSave }: StationProps) {
  const report = useMemo(
    () =>
      buildPlayByPlay({
        homeTeam: "Tiburones",
        awayTeam: "Condores",
        events: [
          { kind: "point", team: "home", player: "Valentina", scoreHome: 1, scoreAway: 0, setNumber: 1 },
          { kind: "point", team: "away", scoreHome: 1, scoreAway: 2, setNumber: 1 },
          { kind: "point", team: "home", scoreHome: 3, scoreAway: 2, setNumber: 1 },
          { kind: "timeout", team: "away", scoreHome: 20, scoreAway: 20, setNumber: 3 },
          { kind: "point", team: "home", player: "Renata", scoreHome: 21, scoreAway: 20, setNumber: 3 },
          { kind: "card", team: "away", scoreHome: 21, scoreAway: 20, setNumber: 3 },
        ],
      }),
    [],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={report.feed.length} onSave={onSave} onExample={() => undefined}>
      <div className="grid grid-cols-3 gap-2">
        <Metric label={t(locale, "Clutch", "Clutch", "Clutch")} value={String(report.clutchPoints)} tone="text-volt" />
        <Metric label={t(locale, "Cambios", "Lead changes", "Viradas")} value={String(report.leadChanges)} tone="text-emerald" />
        <Metric label={t(locale, "Final", "Final", "Final")} value={report.finalScore} />
      </div>
      <ul className="mt-3 max-h-56 space-y-1 overflow-auto">
        {report.feed.map((entry) => (
          <li key={entry.index} className={`rounded-lg px-2 py-1 text-[11px] ${entry.clutch ? "bg-crimson/20 text-white" : "bg-white/5 text-white/75"}`}>
            <span className="font-bold text-volt">{entry.score}</span> {entry.commentary}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-white/55">{report.summary[locale]}</p>
    </StationShell>
  );
}

/* 36 -------------------------------------------------------------------- */

export function PlayerCareerStation({ meta, locale, onSave }: StationProps) {
  const report = useMemo(
    () =>
      buildCareerReport({
        player: "Valentina",
        measurements: [
          { period: "2026-01", verticalJumpCm: 52, attackReachCm: 305, serveSpeedKmh: 78, attackEfficiencyPct: 38, receptionPct: 52 },
          { period: "2026-06", verticalJumpCm: 61, attackReachCm: 318, serveSpeedKmh: 92, attackEfficiencyPct: 47, receptionPct: 61 },
        ],
      }),
    [],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={2} onSave={onSave} onExample={() => undefined}>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Index" value={`${report.evolutionIndex}/100`} tone="text-volt" />
        <Metric label={t(locale, "Categoria", "Category", "Categoria")} value={report.category.replaceAll("_", " ")} tone="text-emerald" />
        <Metric label={t(locale, "Cuello", "Bottleneck", "Gargalo")} value={report.bottleneck} tone="text-crimson" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[11px]">
        {Object.entries(report.deltas).map(([key, value]) => (
          <span key={key} className="flex justify-between rounded bg-white/5 px-2 py-1">
            <span className="text-white/55">{key}</span>
            <span className={value >= 0 ? "text-emerald" : "text-crimson"}>{value > 0 ? "+" : ""}{value}</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/60">{report.message} {t(locale, "Faltan", "Next gap", "Proximo gap")}: {report.gapToNext}.</p>
    </StationShell>
  );
}

export function QrSyncStation({ meta, locale, onSave }: StationProps) {
  const [mode, setMode] = useState<"emit" | "read">("emit");
  const [frames, setFrames] = useState<QrFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [svg, setSvg] = useState("");
  const [receiving, setReceiving] = useState(false);
  const [ingest, setIngest] = useState<IngestResult>(() => emptyIngest());
  const [status, setStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoop = useRef<number | null>(null);
  const ingestRef = useRef<IngestResult>(ingest);
  const lastScan = useRef<string>("");

  const payload = useMemo(() => {
    let live: ScoreboardState | null = null;
    try {
      const raw = window.localStorage.getItem("volleyos.liveScoreboard");
      if (raw) live = JSON.parse(raw) as ScoreboardState;
    } catch {
      live = null;
    }
    return { kind: "match", savedAt: new Date().toISOString(), state: live ?? newScoreboard("Local", "Visita", 3) };
  }, []);

  useEffect(() => {
    let active = true;
    void createQrFrames(payload).then((created) => {
      if (active) setFrames(created);
    });
    return () => {
      active = false;
    };
  }, [payload]);

  useEffect(() => {
    const frame = frames[frameIndex];
    if (!frame) return;
    let active = true;
    void renderQrSvg(frame.text).then((markup) => {
      if (active) setSvg(markup);
    });
    return () => {
      active = false;
    };
  }, [frames, frameIndex]);

  useEffect(() => {
    if (!playing || frames.length < 2 || mode !== "emit") return;
    const timer = window.setInterval(() => setFrameIndex((index) => (index + 1) % frames.length), 1200);
    return () => window.clearInterval(timer);
  }, [frames.length, mode, playing]);

  const stopCamera = (): void => {
    scanLoop.current !== null && window.cancelAnimationFrame(scanLoop.current);
    scanLoop.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReceiving(false);
  };

  useEffect(() => () => stopCamera(), []);

  const handleScan = async (value: string): Promise<void> => {
    if (value === lastScan.current) return;
    lastScan.current = value;
    const next = await ingestQrFrame(ingestRef.current, value);
    ingestRef.current = next;
    setIngest(next);
    if (next.complete) {
      setStatus(t(locale, "Estado completo. Aplicá al tablero.", "Full state received. Apply to the board.", "Estado completo. Aplique ao placar."));
      triggerCourtHaptics([60, 40, 90]);
    }
  };

  const scanTick = (): void => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === 4) {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code?.data) void handleScan(code.data);
      }
    }
    scanLoop.current = window.requestAnimationFrame(scanTick);
  };

  const startCamera = async (): Promise<void> => {
    setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReceiving(true);
      scanLoop.current = window.requestAnimationFrame(scanTick);
    } catch {
      setStatus(t(locale, "Sin acceso a cámara. Pegá el texto del frame manualmente.", "No camera access. Paste a frame manually.", "Sem acesso à câmera. Cole o texto do frame manualmente."));
    }
  };

  const applyClone = (): void => {
    const value = ingest.payload;
    if (typeof value !== "object" || value === null) return;
    const state = (value as { state?: ScoreboardState }).state;
    if (!state || !Array.isArray(state.lineupA)) {
      setStatus(t(locale, "El frame no contiene un tablero válido.", "Frame has no valid scoreboard.", "O frame não contém um placar válido."));
      return;
    }
    storeClonedScoreboard(state);
    window.localStorage.setItem("volleyos.liveScoreboard", JSON.stringify(state));
    setStatus(t(locale, "Tablero clonado. Abrí Cancha para seguir el partido.", "Board cloned. Open Court to keep scoring.", "Placar clonado. Abra Quadra para continuar."));
    triggerCourtHaptics([50, 40, 80]);
  };

  return (
    <StationShell meta={meta} locale={locale} rows={frames.length} onSave={onSave} onExample={() => { setFrameIndex(0); setPlaying(true); }}>
      <div className="flex gap-1" role="tablist" aria-label="QR mode">
        {(["emit", "read"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => { setMode(value); if (value === "emit") stopCamera(); }}
            className={`${BTN} flex-1 ${mode === value ? "border-volt bg-volt/15 text-volt" : ""}`}
          >
            {value === "emit" ? t(locale, "Emitir", "Broadcast", "Emitir") : t(locale, "Leer", "Scan", "Ler")}
          </button>
        ))}
      </div>

      {mode === "emit" ? (
        <div className="mt-3">
          <div className="mx-auto w-full max-w-[280px] rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="mt-2 flex items-center justify-between text-[10px] text-white/60">
            <span>{t(locale, "Frame", "Frame", "Frame")} {frames.length === 0 ? 0 : frameIndex + 1}/{frames.length}</span>
            <span>{payload.state.teamA} {payload.state.scoreA}-{payload.state.scoreB} {payload.state.teamB}</span>
          </div>
          <div className="mt-2 flex gap-1">
            <button type="button" className={BTN} onClick={() => setFrameIndex((index) => (index - 1 + frames.length) % Math.max(1, frames.length))} aria-label="Previous frame">‹</button>
            <button type="button" className={`${BTN} flex-1`} onClick={() => setPlaying((value) => !value)}>{playing ? "⏸" : "▶"}</button>
            <button type="button" className={BTN} onClick={() => setFrameIndex((index) => (index + 1) % Math.max(1, frames.length))} aria-label="Next frame">›</button>
          </div>
          <p className="mt-2 text-[10px] text-white/50">{t(locale, "Mostrá los frames seguidos al otro celular. Cada QR lleva índice y checksum.", "Show the frames in sequence to the other phone. Each QR carries index and checksum.", "Mostre os frames em sequência ao outro celular. Cada QR leva índice e checksum.")}</p>
        </div>
      ) : (
        <div className="mt-3">
          <video ref={videoRef} className="aspect-square w-full rounded-xl border border-white/15 bg-black object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-2 flex gap-1">
            <button type="button" className={`${BTN} flex-1`} onClick={() => { if (receiving) { stopCamera(); } else { void startCamera(); } }}>
              {receiving ? t(locale, "Detener", "Stop", "Parar") : t(locale, "Abrir cámara", "Open camera", "Abrir câmera")}
            </button>
            <button type="button" className={BTN} onClick={() => { ingestRef.current = emptyIngest(); setIngest(emptyIngest()); lastScan.current = ""; setStatus(null); }}>
              {t(locale, "Reiniciar", "Reset", "Reiniciar")}
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald transition-all" style={{ width: `${ingest.total === 0 ? 0 : Math.round((ingest.frames.size / ingest.total) * 100)}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-white/55">{ingest.frames.size}/{ingest.total || "?"} {t(locale, "frames", "frames", "frames")} {ingest.error ? `· ${ingest.error}` : ""}</p>
          {status ? <p className="mt-1 text-[10px] font-semibold text-emerald">{status}</p> : null}
          {ingest.complete ? (
            <div className="mt-2 rounded-xl border border-emerald/40 bg-emerald/10 p-2">
              <p className="text-[10px] text-emerald">✓ {t(locale, "Checksum verificado", "Checksum verified", "Checksum verificado")}</p>
              <button type="button" className={`${BTN_PRIMARY} mt-2 w-full`} onClick={applyClone}>
                {t(locale, "Aplicar al Tablero", "Apply to Scoreboard", "Aplicar ao Placar")}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </StationShell>
  );
}

export function VideoTelestratorStation({ meta, locale, onSave }: StationProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<TelestrationPoint[][]>([]);
  const [drawing, setDrawing] = useState<TelestrationPoint[] | null>(null);
  const report = useMemo(
    () => (strokes.length > 0 ? analyzeTelestration({ frameWidth: 100, frameHeight: 100, strokes, scaleCmPerPx: 1 }) : null),
    [strokes],
  );

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const pointFrom = (event: ReactPointerEvent<SVGSVGElement>): TelestrationPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const finish = (): void => {
    if (drawing && drawing.length >= 2) setStrokes((previous) => [...previous, drawing]);
    setDrawing(null);
  };

  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => setStrokes([])}>
      <input
        type="file"
        accept="video/*"
        aria-label={t(locale, "Video local", "Local video", "Video local")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setVideoUrl(URL.createObjectURL(file));
          setStrokes([]);
        }}
        className="mb-2 w-full text-[10px]"
      />
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {videoUrl ? <video src={videoUrl} controls playsInline className="h-full w-full object-contain" /> : (
          <p className="grid h-full place-items-center px-4 text-center text-[11px] text-white/45">
            {t(locale, "Elegí un video de tu galería. Nada sale del teléfono.", "Pick a video from your gallery. Nothing leaves the phone.", "Escolha um video da galeria. Nada sai do telefone.")}
          </p>
        )}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDrawing([pointFrom(event)]);
          }}
          onPointerMove={(event) => {
            if (!drawing) return;
            setDrawing((previous) => (previous ? [...previous, pointFrom(event)] : previous));
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          {strokes.map((stroke, index) => (
            <polyline
              key={`stroke-${index}`}
              points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#e11d48"
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {drawing ? (
            <polyline
              points={drawing.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#c8ff00"
              strokeWidth="0.8"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={() => setStrokes([])}>{t(locale, "Borrar trazos", "Clear strokes", "Apagar tracos")}</button>
        <span className={BTN}>{strokes.length} {t(locale, "trazos", "strokes", "tracos")}</span>
      </div>
      {report ? (
        <div className="mt-2 rounded-xl border border-white/10 p-2 text-[10px]">
          <p>{report.message}</p>
          <p className="text-white/50">
            {t(locale, "Angulo medio", "Mean angle", "Angulo medio")}: {report.meanAngleDeg}° · {t(locale, "Maximo", "Max", "Maximo")}: {report.maxAngleDeg}°
          </p>
        </div>
      ) : null}
    </StationShell>
  );
}

const PLAYBOOK_SAMPLE: PlaybookPhaseInput[] = [
  {
    phase: "serve",
    durationMs: 1200,
    targetZone: 1,
    players: [
      { number: 1, x: 50, y: 90 }, { number: 4, x: 30, y: 70 }, { number: 7, x: 70, y: 70 },
      { number: 9, x: 20, y: 50 }, { number: 11, x: 50, y: 55 }, { number: 14, x: 80, y: 50 },
    ],
  },
  {
    phase: "transition",
    durationMs: 1800,
    targetZone: 5,
    players: [
      { number: 1, x: 45, y: 85 }, { number: 4, x: 25, y: 60 }, { number: 7, x: 65, y: 55 },
      { number: 9, x: 30, y: 40 }, { number: 11, x: 55, y: 45 }, { number: 14, x: 75, y: 40 },
    ],
  },
  {
    phase: "attack",
    durationMs: 1000,
    targetZone: 9,
    players: [
      { number: 1, x: 40, y: 80 }, { number: 4, x: 20, y: 50 }, { number: 7, x: 60, y: 45 },
      { number: 9, x: 35, y: 30 }, { number: 11, x: 60, y: 25 }, { number: 14, x: 80, y: 30 },
    ],
  },
];

export function PlaybookAnimatorStation({ meta, locale, onSave }: StationProps) {
  const [phases] = useState(PLAYBOOK_SAMPLE);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const report = useMemo(() => buildPlaybookAnimation(phases), [phases]);
  const phase = phases[index] ?? phases[0];

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        if (current >= phases.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [playing, phases.length]);

  const vectors = report.phases[index]?.vectors ?? [];
  const previous = phases[index - 1];

  return (
    <StationShell meta={meta} locale={locale} rows={5} onSave={onSave} onExample={() => { setIndex(0); setPlaying(false); }}>
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-white/10 bg-obsidian">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <rect width="100" height="100" fill="#101010" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="#ffffff22" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff22" strokeDasharray="2 2" />
          {previous ? previous.players.map((player) => {
            const now = phase?.players.find((item) => item.number === player.number);
            if (!now) return null;
            return <line key={`vector-${player.number}`} x1={player.x} y1={player.y} x2={now.x} y2={now.y} stroke="#c8ff00" strokeWidth="0.7" markerEnd="url(#arrow)" />;
          }) : null}
          <defs>
            <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 z" fill="#c8ff00" />
            </marker>
          </defs>
          {phase?.players.map((player) => (
            <g key={`player-${player.number}`}>
              <circle cx={player.x} cy={player.y} r="3" fill="#e11d48" />
              <text x={player.x} y={player.y + 1.2} textAnchor="middle" fontSize="2.6" fill="white">{player.number}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button type="button" className={BTN} onClick={() => { setIndex(0); setPlaying((value) => !value); }}>
          {playing ? t(locale, "Pausar", "Pause", "Pausar") : t(locale, "Reproducir", "Play", "Reproduzir")}
        </button>
        {report.phases.map((frame) => (
          <button key={frame.phase} type="button" className={`${BTN} ${index === frame.order - 1 ? "border-volt text-volt" : ""}`} onClick={() => setIndex(frame.order - 1)}>
            {frame.phase}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/60">
        {t(locale, "Fase", "Phase", "Fase")} {index + 1}/3 · {phase?.durationMs} ms · {t(locale, "Zona", "Zone", "Zona")} {phase?.targetZone} · {vectors.length} {t(locale, "vectores", "vectors", "vetores")}
      </p>
      <p className="mt-1 text-[10px] text-white/40">{report.message}</p>
    </StationShell>
  );
}

const HEATMAP_SAMPLE = [
  { x: 16, y: 16, result: "kill" as ShotResult },
  { x: 50, y: 16, result: "kill" as ShotResult },
  { x: 50, y: 16, result: "kill" as ShotResult },
  { x: 84, y: 16, result: "blocked" as ShotResult },
  { x: 16, y: 50, result: "error" as ShotResult },
  { x: 50, y: 50, result: "kill" as ShotResult },
  { x: 84, y: 50, result: "kill" as ShotResult },
  { x: 16, y: 84, result: "in_play" as ShotResult },
  { x: 50, y: 84, result: "error" as ShotResult },
  { x: 84, y: 84, result: "kill" as ShotResult },
];

export function ShotHeatmapStation({ meta, locale, onSave }: StationProps) {
  const [shots, setShots] = useState(HEATMAP_SAMPLE);
  const [result, setResult] = useState<ShotResult>("kill");
  const report = useMemo(
    () => (shots.length > 0
      ? buildShotHeatmap({ shots })
      : { total: 0, kills: 0, errors: 0, blocked: 0, efficiencyPct: 0, hotZone: 1, cells: Array.from({ length: 9 }, (_, index) => ({ zone: index + 1, count: 0, sharePct: 0 })), message: "Sin remates." }),
    [shots],
  );

  return (
    <StationShell meta={meta} locale={locale} rows={5} onSave={onSave} onExample={() => setShots(HEATMAP_SAMPLE)}>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <select value={result} onChange={(event) => setResult(event.target.value as ShotResult)} className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[10px]">
          <option value="kill">Kill</option>
          <option value="error">Error</option>
          <option value="blocked">Blocked</option>
          <option value="in_play">In play</option>
        </select>
        <button type="button" className={BTN} onClick={() => setShots([])}>{t(locale, "Limpiar", "Clear", "Limpar")}</button>
        <button type="button" className={BTN} onClick={() => setShots(HEATMAP_SAMPLE)}>{t(locale, "Ejemplo", "Example", "Exemplo")}</button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {report.cells.map((cell) => (
          <button
            key={cell.zone}
            type="button"
            aria-label={`Zona ${cell.zone}`}
            onClick={() => {
              const column = (cell.zone - 1) % 3;
              const row = Math.floor((cell.zone - 1) / 3);
              setShots((previous) => [...previous, { x: column * 33.4 + 16.7, y: row * 33.4 + 16.7, result }]);
            }}
            className="relative h-16 rounded-lg border border-white/10 text-left"
            style={{ backgroundColor: `rgba(225, 29, 72, ${Math.max(0.08, cell.sharePct / 100)})` }}
          >
            <span className="absolute left-1 top-1 text-[9px] text-white/50">Z{cell.zone}</span>
            <span className="absolute bottom-1 right-1 text-sm font-black tabular-nums">{cell.count}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px]">
        {t(locale, "Zona caliente", "Hot zone", "Zona quente")}: <strong className="text-volt">Z{report.hotZone}</strong> · {report.total} {t(locale, "remates", "shots", "ataques")} · {t(locale, "eficiencia", "efficiency", "eficiência")} {report.efficiencyPct}%
      </p>
      <p className="mt-1 text-[10px] text-white/40">{t(locale, "Tocá una zona para sumar un remate con el resultado elegido.", "Tap a zone to add a shot with the selected result.", "Toque uma zona para somar um ataque com o resultado escolhido.")}</p>
    </StationShell>
  );
}

export function EnginePreviewStation({ meta, locale, onSave }: StationProps) {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async (): Promise<void> => {
      const previews: Record<string, () => Record<string, unknown> | Promise<Record<string, unknown>>> = {
        "ball-aerodynamics": () => analyzeAerodynamics({ speedKmh: 68, spinRps: 0.8, launchAngleDeg: 12, impactHeightM: 2.1 }) as unknown as Record<string, unknown>,
        "rally-clipper": () => buildClipPlan({ playerNumber: 7, minDurationSec: 3, rallies: [{ startSec: 0, endSec: 4.5, playerNumber: 7, skill: "spike", outcome: "kill" }, { startSec: 5.5, endSec: 10, playerNumber: 7, skill: "ace", outcome: "ace" }] }) as unknown as Record<string, unknown>,
        "recruiting-dossier": () => buildRecruitingDossier({ graduationYear: 2028, position: "outside", heightCm: 188, reachOneHandCm: 245, reachTwoHandCm: 248, verticalJumpCm: 78, attackReachCm: 323, kills: 280, attackEfficiencyPct: 46 }) as unknown as Promise<Record<string, unknown>>,
        "system-transition": () => analyzeSystem({ setters: 2, pureHitters: 5, transitionReadGrade: 8, rotation: 1 }) as unknown as Record<string, unknown>,
        "deception-reader": () => readDeception({ approachSpeedKmh: 19, elbowHeightCm: 172, ballFrontOffsetCm: 8, setterFrontZoneJump: true, blockersCommitted: 2 }) as unknown as Record<string, unknown>,
        "inclusive-adaptive": () => buildAdaptiveRulebook({ mode: "sitting", sex: "male", players: 6 }) as unknown as Record<string, unknown>,
        "elo-ranking": () => calculateElo({ teamARating: 1820, teamBRating: 1760, kWeight: 40, result: "3-1" }) as unknown as Record<string, unknown>,
        "team-treasury": () => buildTreasury({ jerseyCostTotal: 360, monthlyFeePerPlayer: 12.5, months: 3, ballFund: 90, registrationFee: 60, players: [{ name: "Valentina", paid: 80 }, { name: "Carla", paid: 45 }] }) as unknown as Record<string, unknown>,
        "house-rules": () => validateHouseRules({ format: "mixed_6v6", teamAGenders: ["M", "F", "M", "F", "M", "F"], teamBGenders: ["F", "M", "F", "M", "F", "M"], benchOrder: ["Ana"], scoreA: 14, scoreB: 14 }) as unknown as Record<string, unknown>,
        "arena-dj": () => buildArenaCue({ event: "MONSTER_BLOCK" }) as unknown as Record<string, unknown>,
        "court-slang": () => translateSlang({ term: "pipe", origin: "AR" }) as unknown as Record<string, unknown>,
        "qr-sync": () => buildQrSync({ kind: "match", payload: { home: "Tiburones", score_a: 24 }, matrixSize: 21 }) as unknown as Promise<Record<string, unknown>>,
        "fivb-escoresheet": () => buildScoresheet({ teamA: "Tiburones", teamB: "Cóndores", sets: [{ a: 25, b: 21 }, { a: 23, b: 25 }, { a: 25, b: 19 }, { a: 25, b: 22 }], substitutions: 6, sanctions: 2 }) as unknown as Record<string, unknown>,
        "tournament-nutrition": () => planMatchNutrition({ weightKg: 78, matches: 2, minutesPerMatch: 90, tempC: 31, sweatRateLh: 1.1 }) as unknown as Record<string, unknown>,
        "injury-prehab": () => assessPrehab({ weeklyJumps: 420, weeklySpikes: 260, sleepHours: 6.5, kneePain: 3, shoulderPain: 0, priorInjury: true }) as unknown as Record<string, unknown>,
        "tiebreak-commander": () => commandTiebreak({ scoreA: 13, scoreB: 12, serving: "A", bestOf: 3, goldenPoint: true }) as unknown as Record<string, unknown>,
        "bracket-architect": () => buildBracket({ teams: ["Tiburones", "Lobos", "Titanes", "Vinchas", "Piranhas"] }) as unknown as Record<string, unknown>,
        "sponsor-deck": () => buildSponsorDeck({ impressions: 24000, reach: 8000, cpm: 12, engagementPct: 6, currency: "USD" }) as unknown as Record<string, unknown>,
        "head-to-head": () => buildHeadToHead({ teamA: "Tiburones", teamB: "Lobos", matches: [{ setsA: 3, setsB: 1 }, { setsA: 2, setsB: 3 }, { setsA: 3, setsB: 0 }] }) as unknown as Record<string, unknown>,
        "peripheral-reflex": () => scoreReflex({ timesMs: [210, 195, 240, 205, 220] }) as unknown as Record<string, unknown>,
        "club-white-label": () => buildWhiteLabel({ club: "Tiburones Voley", primary: "#0f766e", secondary: "#111827", accent: "#f59e0b" }) as unknown as Record<string, unknown>,
      };
      const preview = previews[meta.slug];
      if (!preview) return;
      const value = await preview();
      if (alive) setReport(value);
    };
    void load();
    return () => { alive = false; };
  }, [meta.slug]);
  return (
    <StationShell meta={meta} locale={locale} rows={2} onSave={onSave} onExample={() => setReport(null)}>
      {report && meta.slug === "arena-dj" ? (
        <button
          type="button"
          className={BTN}
          onClick={() => playArenaCue(String(report.event ?? "MONSTER_BLOCK") as ArenaCue)}
        >
          ▶ {t(locale, "Sonar cue", "Play cue", "Tocar cue")}
        </button>
      ) : null}
      {report ? (
        <div className="grid gap-1 text-[11px]">
          {Object.entries(report).filter(([key]) => key !== "svg" && key !== "rallies" && key !== "selected").map(([key, value]) => (
            <span key={key} className="flex justify-between gap-3 rounded bg-white/5 px-2 py-1">
              <span className="text-white/55">{key}</span>
              <span className="truncate text-right text-white/85">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-white/55">{t(locale, "Calculando...", "Computing...", "Calculando...")}</p>
      )}
    </StationShell>
  );
}
export function GymScreenStation({ meta, locale, onSave }: StationProps) {
  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => undefined}>
      <GymScreenModule locale={locale} onClose={() => {}} />
    </StationShell>
  );
}

export const STATIONS: Record<string, (props: StationProps) => ReactNode> = {
  biomechanics: BiomechanicsStation,
  rotation: RotationStation,
  scouting: ScoutingStation,
  scoreboard: ScoreboardStation,
  tournament: TournamentStation,
  pickup: PickupStation,
  overlay: OverlayStation,
  var: VarStation,
  beach: BeachStation,
  volleycard: VolleycardStation,
  tempo: TempoStation,
  acwr: AcwrStation,
  "block-shadow": BlockShadowStation,
  "seam-radar": SeamRadarStation,
  "setter-iq": SetterIQStation,
  "lineup-slip": LineupSlipStation,
  "integrity-seal": IntegritySealStation,
  "capsule-io": CapsuleStation,
  "referee-console": RefereeConsoleStation,
  "substitution-tracker": SubstitutionTrackerStation,
  "court-split": CourtSplitStation,
  "fan-companion": FanCompanionStation,
  "setter-signals": SetterSignalsStation,
  "mvp-awards": MvpAwardsStation,
  "timeout-chalkboard": TimeoutChalkboardStation,
  "momentum-coach": MomentumCoachStation,
  "captain-draft": CaptainDraftStation,
  "roster-pass": RosterPassStation,
  "equipment-inspector": EquipmentInspectorStation,
  "match-poster": MatchPosterStation,
  "serve-radar": ServeRadarStation,
  "matchup-matrix": MatchupMatrixStation,
  "blockout-lab": BlockoutLabStation,
  "practice-planner": PracticePlannerStation,
  "play-by-play": PlayByPlayStation,
  "player-career": PlayerCareerStation,
  "ball-aerodynamics": EnginePreviewStation,
  "rally-clipper": EnginePreviewStation,
  "recruiting-dossier": EnginePreviewStation,
  "system-transition": EnginePreviewStation,
  "deception-reader": EnginePreviewStation,
  "inclusive-adaptive": EnginePreviewStation,
  "elo-ranking": EnginePreviewStation,
  "team-treasury": EnginePreviewStation,
  "house-rules": EnginePreviewStation,
  "arena-dj": EnginePreviewStation,
  "court-slang": EnginePreviewStation,
  "qr-sync": QrSyncStation,
  "gym-screen": GymScreenStation,
  "fivb-escoresheet": EnginePreviewStation,
  "video-telestrator": VideoTelestratorStation,
  "playbook-animator": PlaybookAnimatorStation,
  "shot-heatmap": ShotHeatmapStation,
  "tournament-nutrition": EnginePreviewStation,
  "injury-prehab": EnginePreviewStation,
  "tiebreak-commander": EnginePreviewStation,
  "bracket-architect": EnginePreviewStation,
  "sponsor-deck": EnginePreviewStation,
  "head-to-head": EnginePreviewStation,
  "peripheral-reflex": EnginePreviewStation,
  "club-white-label": EnginePreviewStation,
};
