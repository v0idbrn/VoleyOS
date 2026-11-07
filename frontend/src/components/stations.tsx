"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import jsQR from "jsqr";

import { announceCourtVoice, playArenaCue, playCourtTableBuzzer, playWhistle as playCourtWhistle, type ArenaCue } from "@/lib/court-audio";
import {
  type ApproachTempo,
  loadCrowdAmbience,
  playApproachCadence,
  playBuzzer,
  playLevelUpArpeggio,
  playPicaditoCue,
  playScorePop,
  playSetWinFanfare,
  playSneakerSqueak,
  playWarmupTick,
  playWhistle,
  saveCrowdAmbience,
  TTS_TOAST_EVENT,
} from "@/lib/sound-effects";
import { announceScoreTTS, isMatchActive, persistLiveScoreboard, persistTtsEnabled, readLiveScoreboard, TTS_ENABLED_EVENT, triggerCourtHaptics } from "@/lib/court-ux";
import { isUserProEntitled } from "@/lib/pro-entitlement";
import { clearClonedScoreboard, createQrFrames, emptyIngest, ingestQrFrame, readClonedScoreboard, renderQrSvg, storeClonedScoreboard, type IngestResult, type QrFrame } from "@/lib/qr-transfer";
import { localizeReactTree } from "@/lib/engine-l10n";
import { COPY, t } from "@/lib/i18n";
import {
  SAMPLE_DEMO_DVW,
  exportMatchToDvw,
  lintScoutLogSequence,
  parseScoutCode,
  scoutLinesToLogEntries,
  translateScoutCodeLive,
  tryParseDvwFile,
  computeFivbPoolStandings,
  validateFivbRotationOverlap,
  applyAutoLiberoSwap,
  type FivbPoolMatch,
  type RotationPosition,
  type RotationSlot,
} from "@/lib/datavolley-courtside-engine";
import {
  MMR_MVP_DELTA,
  MMR_MUFA_DELTA,
  applyPlayerMmrDelta,
  debtReminderText,
  generateMatchStoryCardDataUrl,
  loadPlayerMmr,
  loadPipelineTeams,
  loadVaquitaDebts,
  parseWhatsAppListAndBalanceTeams,
  parseWhatsAppPlayerNames,
  savePipelineTeams,
  saveVaquitaDebts,
  setVaquitaDebt,
  type PipelineTeams,
  type TeamBalance,
  type VaquitaDebt,
} from "@/lib/community-match-pipeline";
import { BenchRotator, FlowWizard, PlayerChips } from "@/components/CasualPlayerSuite";
import { LiveCastModal } from "@/components/LiveCastModal";
import { bridgeSaveData, downloadBlob, sharePng } from "@/lib/png-exporter";
import {
  careerCardStats,
  flightTimeJump,
  loadAthleteRecords,
  recordsSparkline,
  saveAthleteRecord,
  type AthleteJumpRecord,
  type CareerCardStats,
} from "@/lib/athlete-records";
import {
  buildPacket,
  createBenchPin,
  createHostSecret,
  createRoomId,
  encodeWhatsAppFreePulse,
  publishLiveUpdate,
  pushLocalLiveServer,
  subscribeLiveRoom,
  type CastMode,
  type LiveMatchPacket,
  type RoomAccessMode,
} from "@/lib/live-cast-engine";
import { loadSeason, saveSeasonMatch, seasonMatchFromState, seasonStats } from "@/lib/season-vault";
import { syncWidgetSnapshot } from "@/lib/widget-bridge";
import {
  K1_BLEED_THRESHOLD,
  SCOUT_ACTIONS,
  ZONE_PRESETS,
  amendLastScoutTag,
  bleedingAlertMessage,
  bleedingRotation,
  clearLiveScoutShots,
  loadLiveScoutShots,
  loadScoutSession,
  recordScoutPoint,
  redoScoutPoint,
  resetScoutSession,
  rotationStats,
  saveLiveScoutShots,
  saveScoutSession,
  sessionShots,
  tagLastScoutPoint,
  totalStats,
  undoScoutPoint,
  type RotationStats,
  type ScoutAction,
  type ScoutSession,
  type ZonePreset,
} from "@/lib/live-scouting-engine";
import {
  RADAR_GATES,
  REACTION_MAX_MS,
  fireReaction,
  missReaction,
  newRadarSession,
  newReactionDrill,
  radarStats,
  reactionDelayMs,
  reactionSummary,
  recordRadarShot,
  speedTier,
  startReaction,
  tapReaction,
  undoRadarShot,
  type RadarSession,
  type ReactionDrill as ReactionDrillState,
} from "@/lib/ball-radar-engine";
import { loadPickupAwards, nextServeStreak, rememberPlayerNames, serveCapHit, serveCapMessage, type ServeCapLimit } from "@/lib/casual-engines";
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
  roleZones,
  zoneNeighbors,
  type RotationRole,
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
  type SystemName,
  type TempoCode,
  type ZonePoint,
  type BlockoutDecision,
  type PracticeFocus,
  type ScoreboardState,
  type SetHistoryEntry,
  type TeamRoster,
  type TelestrationPoint,
  loadTeams,
  saveTeam,
  deleteTeam,
  newTeam,
  teamFromRosterSheet,
  type KingOfCourtState,
} from "@/lib/local-engines";
import { humanizeKey, translateEnum, translateInputLabel, translateOutputKey } from "@/lib/module-labels";
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
  "station-card flex flex-col gap-4 rounded-2xl border border-white/10 bg-panel/80 p-5 shadow-2xl shadow-black/40 backdrop-blur";
const BTN =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const BTN_PRIMARY =
  "rounded-lg bg-crimson px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-imperial focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const INPUT =
  "w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-volt";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50";

/**
 * v10.3.0 — Reddit QA: the active match must survive a tab reload or an app
 * restart, so the full board (points, sets, set history, names, colours,
 * format, serve and sides) is mirrored into localStorage under a versioned
 * key. Skipped under Vitest so every test always boots at 0-0.
 */
const TABLE_MATCH_KEY = "voleyos_live_match_state_v1";

const isTestEnv =
  typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));

/** A timestamped Courtside clip attached to the telestrator timeline. */
interface TelestrationClip {
  id: string;
  timeMs: number;
  code: string;
  rotation: number | null;
}

/** Bottom dock glass pill shared by the five Modo Mesa controls. */
const DOCK_BTN: CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.07)",
  color: "rgba(255,255,255,0.9)",
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

/** Window surface the Android bridge exposes to the page (v10.3.0 Modo Mesa). */
type VosBridgeWindow = Window & {
  VoleyOSBridge?: {
    setTableLandscapeLock?: (lockLandscape: boolean) => void;
    setKeepScreenAwake?: (keepAwake: boolean) => void;
    setVolumeKeyScoring?: (enabled: boolean) => void;
    setHardwareScoreMode?: (enabled: boolean) => void;
    triggerHapticPattern?: (patternType: string) => void;
    isSystemAutoRotateEnabled?: () => boolean;
    setSensorAutoRotateMode?: (mode: string) => void;
    /** v11.0.3 — native TextToSpeech announcer (spec signature). */
    speakTts?: (text: string, langTag: string) => boolean;
  };
  /** Android Back probe: the Activity asks the page before leaving the app. */
  __vosHandleAndroidBack?: () => string | undefined;
};

function readTableMatchSnapshot(): ScoreboardState | null {
  try {
    const raw = window.localStorage.getItem(TABLE_MATCH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const snapshot = parsed as Partial<ScoreboardState>;
    if (typeof snapshot.teamA !== "string" || typeof snapshot.teamB !== "string") return null;
    if (typeof snapshot.scoreA !== "number" || typeof snapshot.scoreB !== "number") return null;
    const base = newScoreboard(snapshot.teamA, snapshot.teamB, 3, {
      matchFormat: snapshot.matchFormat === "short15" || snapshot.matchFormat === "bo5" ? snapshot.matchFormat : "bo3",
    });
    return { ...base, ...snapshot } as ScoreboardState;
  } catch {
    return null;
  }
}

function writeTableMatchSnapshot(state: ScoreboardState): void {
  try {
    window.localStorage.setItem(TABLE_MATCH_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

function defaultOpenGuide(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("volleyos.guided") === "novice";
}

/**
 * v11.1.0 — live interactive stations keep the court clean: no guide banner
 * and no "load example / save report" calculator footer. A scoreboard, a
 * timeout board or the gym TV has no report to save and no data to load.
 */
const LIVE_STATION_SLUGS = new Set([
  "scoreboard",
  "rotation",
  "beach",
  "referee-console",
  "timeout-chalkboard",
  "gym-screen",
  "system-transition",
]);
/* v11.2.0 — Reactive Live Match State Bus (shared across all stations) */
export const LIVE_MATCH_BUS_KEY = "voleyos_live_match_bus_v1";

export interface LiveMatchSnapshot {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  setsA: number;
  setsB: number;
  serving: "A" | "B";
  rotation: number;
  sanctions: Array<{ type: string; minute: number }>;
}

export function readLiveMatchSnapshot(): LiveMatchSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LIVE_MATCH_BUS_KEY);
    return raw ? (JSON.parse(raw) as LiveMatchSnapshot) : null;
  } catch {
    return null;
  }
}

function broadcastLiveMatchSnapshot(state: LiveMatchSnapshot): void {
  try {
    window.localStorage.setItem(LIVE_MATCH_BUS_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("voleyos-live-match-sync", { detail: state }));
  } catch {
    /* storage unavailable */
  }
}

/** v11.2.0 — hook: subscribe this station to the shared match snapshot. */
function useLiveMatchBus(initial: LiveMatchSnapshot): LiveMatchSnapshot {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const onSync = (event: Event): void => {
      const detail = (event as CustomEvent<LiveMatchSnapshot>).detail;
      if (detail) setState(detail);
    };
    const stored = readLiveMatchSnapshot();
    if (stored) setState(stored);
    window.addEventListener("voleyos-live-match-sync", onSync);
    return () => window.removeEventListener("voleyos-live-match-sync", onSync);
  }, []);
  return state;
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
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const loadExample = (): void => onExample();
    window.addEventListener("voleyos:demo", loadExample);
    return () => window.removeEventListener("voleyos:demo", loadExample);
  }, [onExample]);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 2600);
    return () => window.clearTimeout(id);
  }, [note]);

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
      {LIVE_STATION_SLUGS.has(meta.slug) ? null : <ModuleGuideBanner slug={meta.slug} locale={locale} defaultOpen={defaultOpenGuide()} />}
      <div className="flex-1 text-sm text-white/80">{localizeReactTree(children, locale)}</div>
      {LIVE_STATION_SLUGS.has(meta.slug) ? null : (
        <footer className="mt-1 flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            data-testid="station-load-example"
            className={BTN_PRIMARY}
            onClick={() => {
              onExample();
              setNote(t(locale, "🔄 Datos de prueba cargados.", "🔄 Test data loaded.", "🔄 Dados de teste carregados."));
            }}
          >
            🔄 {t(locale, "Cargar Datos de Prueba", "Load Test Data", "Carregar Dados de Teste")}
          </button>
          <button
            type="button"
            data-testid="station-save-report"
            className={BTN}
            onClick={() => {
              onSave(meta.slug, rows);
              setNote(t(locale, "📥 Guardado en la Bóveda Local.", "📥 Saved to the Local Vault.", "📥 Salvo na Cofre Local."));
            }}
          >
            📥 {t(locale, "Guardar en Bóveda Local", "Save to Local Vault", "Salvar no Cofre Local")}
          </button>
        </footer>
      )}
      {note ? (
        <p role="status" data-testid="station-toast" className="vos-toast">
          {note}
        </p>
      ) : null}
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

/** v11.0.3 — Lab & IA statuses speak the coach's language, not engine codes. */
function statusLabel(status: string, locale: Locale): string {
  const labels: Record<string, [string, string, string]> = {
    OPTIMAL: ["ÓPTIMO", "OPTIMAL", "ÓTIMO"],
    OPTICAL_WINDOW_11_OCLOCK: ["VENTANA ÓPTIMA 11H", "OPTICAL WINDOW 11 OCLOCK", "JANELA ÓTIMA 11H"],
    LATE_WINDOW_12_OCLOCK: ["VENTANA TARDÍA 12H", "LATE WINDOW 12 OCLOCK", "JANELA TARDIA 12H"],
    TRANSITION_WINDOW: ["VENTANA EN TRANSICIÓN", "TRANSITION WINDOW", "JANELA EM TRANSIÇÃO"],
    NEAR_EXTENSION: ["EXTENSIÓN CASI PERFECTA", "NEAR EXTENSION", "EXTENSÃO QUASE PERFEITA"],
    TOO_DEEP: ["RODILLA MUY PROFUNDA", "TOO DEEP", "JOELHO MUITO PROFUNDO"],
    TOO_STRAIGHT: ["RODILLA MUY RÍGIDA", "TOO STRAIGHT", "JOELHO MUITO RÍGIDO"],
    OVER_DRAWN: ["BRAZO MUY ATRASADO", "OVER DRAWN", "BRAÇO MUITO ATRASADO"],
    UNDER_DRAWN: ["BRAZO MUY ADELANTADO", "UNDER DRAWN", "BRAÇO MUITO ADIANTADO"],
    T_REX_ARM: ["BRAZO T-REX", "T-REX ARM", "BRAÇO T-REX"],
    ASYMMETRIC: ["ASIMÉTRICO", "ASYMMETRIC", "ASSIMÉTRICO"],
  };
  const hit = labels[status];
  return hit ? t(locale, hit[0], hit[1], hit[2]) : status.replaceAll("_", " ");
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
  const [cadence, setCadence] = useState<ApproachTempo | null>(null);
  const [cadenceLoop, setCadenceLoop] = useState(false);

  // v9.5: hands-free approach rehearsal - replay the tempo every 5 seconds.
  useEffect(() => {
    if (!cadence || !cadenceLoop) return;
    const id = window.setInterval(() => {
      playApproachCadence(cadence);
    }, 5000);
    return () => window.clearInterval(id);
  }, [cadence, cadenceLoop]);

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={5}
      onSave={onSave}
      onExample={() => {
        setTakeoff(0);
        setLanding(540);
        setCadence(null);
        setCadenceLoop(false);
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
      <div className="mt-3 rounded-xl border border-white/10 bg-obsidian/60 p-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
          🎵 {t(locale, "Metrónomo de aproximación", "Approach metronome", "Metrónomo de aproximação")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {(["1st", "2nd", "3rd"] as const).map((tempo) => (
            <button
              key={tempo}
              type="button"
              data-testid={`cadence-${tempo}`}
              aria-pressed={cadence === tempo}
              className={`${BTN} ${cadence === tempo ? "border-volt text-volt" : ""}`}
              onClick={() => {
                setCadence(tempo);
                playApproachCadence(tempo);
              }}
            >
              {tempo === "1st"
                ? `🏃 ${t(locale, "1er Tiempo / Central", "1st Tempo / Quick", "1º Tempo / Central")}`
                : tempo === "2nd"
                  ? `🚀 ${t(locale, "2do Tiempo / Pipe", "2nd Tempo / Pipe", "2º Tempo / Pipe")}`
                  : `🎯 ${t(locale, "3er Tiempo / Pelota Alta", "3rd Tempo / High Ball", "3º Tempo / Bola Alta")}`}
            </button>
          ))}
          <button
            type="button"
            data-testid="cadence-loop"
            aria-pressed={cadenceLoop}
            className={BTN}
            onClick={() => setCadenceLoop((on) => !on)}
          >
            🔁 {t(locale, "Repetir cada 5s", "Repeat every 5s", "Repetir a cada 5s")}
          </button>
          {cadence ? (
            <button
              type="button"
              data-testid="cadence-stop"
              className={BTN}
              onClick={() => {
                setCadence(null);
                setCadenceLoop(false);
              }}
            >
              ⏹ {t(locale, "Detener", "Stop", "Parar")}
            </button>
          ) : null}
        </div>
        {cadence ? (
          <p data-testid="cadence-steps" className="mt-1 text-[10px] text-white/60">
            {t(
              locale,
              `Izquierdo → Derecho-Izquierdo (planta) → ¡Despegue! → ¡Impacto Hora 11! · pasos ${APPROACH_CADENCE_LABEL[cadence]}`,
              `Left → Right-Left (plant) → Takeoff! → Hora 11 contact! · steps ${APPROACH_CADENCE_LABEL[cadence]}`,
              `Esquerdo → Direito-Esquerdo (apoio) → Salto! → Contato Hora 11! · passos ${APPROACH_CADENCE_LABEL[cadence]}`,
            )}
          </p>
        ) : null}
      </div>
      <ul className="mt-3 space-y-1">
        {report.frames.map((frame) => (
          <li key={frame.frame} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]">
            <span className="text-white/60">F{frame.frame}</span>
            <span className="truncate text-white/70">{frame.detail}</span>
            <span className={`whitespace-nowrap font-bold ${statusTone(frame.status)}`}>{statusLabel(frame.status, locale)}</span>
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

const ROLE_LABELS: Record<RotationRole, Record<Locale, string>> = {
  all: { es: "Todos", en: "All", pt: "Todos" },
  S: { es: "Armador (S)", en: "Setter (S)", pt: "Levantador (S)" },
  OH1: { es: "Punta Delantero (OH1)", en: "Outside Front (OH1)", pt: "Ponta Da Frente (OH1)" },
  OH2: { es: "Punta Zaguero (OH2)", en: "Outside Back (OH2)", pt: "Ponta De Trás (OH2)" },
  MB: { es: "Central (MB)", en: "Middle (MB)", pt: "Central (MB)" },
  OPP: { es: "Opuesto (OPP)", en: "Opposite (OPP)", pt: "Oposto (OPP)" },
  L: { es: "Líbero (L)", en: "Libero (L)", pt: "Líbero (L)" },
};

const DUTY_LINES: Record<RotationRole, Record<Locale, string>> = {
  all: { es: "", en: "", pt: "" },
  S: {
    es: "Armá desde tu zona; recibí solo si la pelota viene directo a vos.",
    en: "Set from your zone; pass only if the ball comes straight to you.",
    pt: "Levante da sua zona; receba só se a bola vier direto em você.",
  },
  OH1: {
    es: "Recibí en K1 y atacá por el 4; en K2 salí por la banda.",
    en: "Pass in K1 and attack out of 4; in K2 go wide.",
    pt: "Receba no K1 e ataque pelo 4; no K2 saia pela ponta.",
  },
  OH2: {
    es: "Cubrí el 6 en recepción y atacá por el pipe.",
    en: "Cover 6 in reception and hit the pipe.",
    pt: "Cubra o 6 na recepção e ataque pelo pipe.",
  },
  MB: {
    es: "Bloqueá en el eje y salí a finta; en K1 dejá la recepción al líbero.",
    en: "Block in the middle and run the quick; leave reception to the libero.",
    pt: "Bloqueie no eixo e saia de finta; no K1 deixe a recepção ao líbero.",
  },
  OPP: {
    es: "Sacá en K2 y atacá por el 2; en K1 cubrí el 1.",
    en: "Serve in K2 and attack out of 2; in K1 cover 1.",
    pt: "Sirva no K2 e ataque pelo 2; no K1 cubra o 1.",
  },
  L: {
    es: "Reemplazá al central en recepción: sin bloqueo ni saque.",
    en: "Replace the middle in reception: no blocks or serves.",
    pt: "Substitua o central na recepção: sem bloqueio ou saque.",
  },
};

/** v11.0.4 — color-coded role medallions for the 5-1 chalkboard. */
const ROLE_COLORS: Record<string, string> = {
  S: "#F59E0B",
  OH1: "#E11D48",
  OH2: "#E11D48",
  MB1: "#10B981",
  "MB2/L": "#10B981",
  OPP: "#8B5CF6",
  L: "#0EA5E9",
};

export function RotationStation({ meta, locale, onSave }: StationProps) {
  const [rotation, setRotation] = useState(1);
  const [points, setPoints] = useState<ZonePoint[]>(() => defaultPositions(1));
  const [report, setReport] = useState(() => validateOverlap(defaultPositions(1)));
  const [trackedRole, setTrackedRole] = useState<RotationRole>("all");
  const [servePhase, setServePhase] = useState<"K1" | "K2">("K1");
  // v11.0.4 — draggable giant medallions with live FIVB overlap check.
  const courtRef = useRef<SVGSVGElement | null>(null);
  const dragZone = useRef<number | null>(null);

  const trackedZones = roleZones(trackedRole, rotation);
  const primaryZone = trackedZones[0] ?? null;
  const trackedNeighbors = primaryZone === null ? [] : zoneNeighbors(primaryZone);
  const trackedPoint = primaryZone === null ? null : points.find((point) => point.zone === primaryZone) ?? null;

  // v11.0.3 — 5-1 role at each zone for this rotation (S/OPP/OH/MB home zones).
  const zoneRoleLabel = (zone: number): string => {
    const home = ((((zone - 1 + (rotation - 1)) % 6) + 6) % 6) + 1;
    if (home === 1) return "S";
    if (home === 2) return "OPP";
    if (home === 4) return "OH1";
    if (home === 6) return "OH2";
    return home === 3 ? "MB1" : "MB2/L";
  };

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
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className={LABEL}>👤 {t(locale, "Seguir Mi Puesto", "Track My Position", "Acompanhar Meu Posto")}</span>
        {(Object.keys(ROLE_LABELS) as RotationRole[]).map((role) => (
          <button
            key={role}
            type="button"
            data-testid={`role-${role}`}
            aria-pressed={trackedRole === role}
            className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${
              trackedRole === role ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/55"
            }`}
            onClick={() => setTrackedRole(role)}
          >
            {ROLE_LABELS[role][locale]}
          </button>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className={LABEL}>{t(locale, "Fase", "Phase", "Fase")}</span>
        <button
          type="button"
          data-testid="phase-k1"
          aria-pressed={servePhase === "K1"}
          className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${
            servePhase === "K1" ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/55"
          }`}
          onClick={() => setServePhase("K1")}
        >
          🛡️ {t(locale, "Recibiendo Saque (K1)", "Receiving Serve (K1)", "Recebendo Saque (K1)")}
        </button>
        <button
          type="button"
          data-testid="phase-k2"
          aria-pressed={servePhase === "K2"}
          className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${
            servePhase === "K2" ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/55"
          }`}
          onClick={() => setServePhase("K2")}
        >
          🚀 {t(locale, "Sacando Nosotros (K2)", "We Serve (K2)", "Nós Sacamos (K2)")}
        </button>
      </div>
      <svg
        ref={courtRef}
        viewBox="0 0 900 700"
        className="mt-2 w-full touch-none rounded-xl border border-white/10 bg-[#0b1a13]"
        role="img"
        aria-label={t(locale, "Cancha 9x9 con posiciones 5-1", "9x9 court with 5-1 positions", "Quadra 9x9 com posições 5-1")}
        onPointerMove={(event) => {
          const zone = dragZone.current;
          const svg = courtRef.current;
          if (zone === null || !svg) return;
          const rect = svg.getBoundingClientRect();
          const x = Math.max(40, Math.min(860, ((event.clientX - rect.left) / rect.width) * 900));
          const y = Math.max(60, Math.min(660, ((event.clientY - rect.top) / rect.height) * 700));
          const next = points.map((point) => (point.zone === zone ? { ...point, x, y } : point));
          setPoints(next);
          setReport(validateOverlap(next));
        }}
        onPointerUp={() => {
          dragZone.current = null;
        }}
        onPointerLeave={() => {
          dragZone.current = null;
        }}
      >
        <rect x="0" y="0" width="900" height="700" fill="#0b1a13" />
        {/* Net band + attack line + floor zones */}
        <rect x="0" y="0" width="900" height="16" fill="rgba(245, 158, 11, 0.35)" />
        <line x1="0" y1="16" x2="900" y2="16" stroke="#F59E0B" strokeWidth="4" />
        <text x="450" y="40" textAnchor="middle" fontSize="15" fontWeight="900" fill="#F59E0B" opacity="0.85">RED / NET</text>
        <line x1="0" y1="300" x2="900" y2="300" stroke="#F59E0B" strokeDasharray="12 10" strokeWidth="3" />
        <text x="16" y="292" fontSize="13" fontWeight="800" fill="#F59E0B" opacity="0.7">{t(locale, "LÍNEA DE 3M", "3M LINE", "LINHA DE 3M")}</text>
        {([[4, 180, 130], [3, 450, 130], [2, 720, 130], [5, 180, 620], [6, 450, 620], [1, 720, 620]] as Array<[number, number, number]>).map(([zone, zx, zy]) => (
          <text key={zone} x={zx} y={zy} textAnchor="middle" fontSize="14" fontWeight="800" fill="#ffffff" opacity="0.16">{t(locale, `ZONA ${zone}`, `ZONE ${zone}`, `ZONA ${zone}`)}</text>
        ))}
        {/* Alignment lines: front 4-3-2, back 5-6-1, and 4-5 / 3-6 / 2-1 columns */}
        {([[4, 3], [3, 2], [5, 6], [6, 1], [4, 5], [3, 6], [2, 1]] as Array<[number, number]>).map(([from, to]) => {
          const a = points.find((point) => point.zone === from);
          const b = points.find((point) => point.zone === to);
          if (!a || !b) return null;
          const faulted = report.faults.some((item) => item.offender === from || item.offender === to);
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={faulted ? "#DC2626" : "#10B981"}
              strokeWidth="3"
              strokeDasharray="9 7"
              opacity="0.75"
            />
          );
        })}
        {points.map((zone) => {
          const fault = report.faults.find((item) => item.offender === zone.zone);
          const role = zoneRoleLabel(zone.zone);
          const color = ROLE_COLORS[role] ?? "#E11D48";
          const tracked = trackedZones.includes(zone.zone);
          return (
            <g
              key={zone.zone}
              onPointerDown={(event) => {
                event.preventDefault();
                dragZone.current = zone.zone;
              }}
              style={{ cursor: "grab" }}
            >
              <circle
                cx={zone.x}
                cy={zone.y}
                r={32}
                fill={color}
                stroke={fault ? "#DC2626" : tracked ? "#c8ff00" : "#fff"}
                strokeWidth={fault || tracked ? 5 : 3}
                data-testid={tracked ? `tracked-zone-${zone.zone}` : undefined}
              />
              <text x={zone.x} y={zone.y - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">
                {zone.zone}
              </text>
              <rect x={zone.x - 27} y={zone.y + 8} width="54" height="17" rx="8.5" fill="#0F172A" opacity="0.92" />
              <text x={zone.x} y={zone.y + 20.5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#F8FAFC">
                {role}
              </text>
            </g>
          );
        })}
        {trackedNeighbors.map((neighbor) => {
          const matePoint = points.find((point) => point.zone === neighbor.mate);
          if (!trackedPoint || !matePoint) return null;
          return (
            <line
              key={`${neighbor.side}-${neighbor.mate}`}
              data-testid={`constraint-line-${neighbor.side}-${neighbor.mate}`}
              x1={trackedPoint.x}
              y1={trackedPoint.y}
              x2={matePoint.x}
              y2={matePoint.y}
              stroke={neighbor.side === "behind" || neighbor.side === "ahead" ? "#F59E0B" : "#c8ff00"}
              strokeWidth="4"
              strokeDasharray="10 8"
            />
          );
        })}
        {trackedPoint && primaryZone !== null ? (
          <text x={trackedPoint.x} y={trackedPoint.y - 48} textAnchor="middle" fontSize="20" fontWeight="900" fill="#c8ff00">
            {ROLE_LABELS[trackedRole][locale]}
          </text>
        ) : null}
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
      {trackedRole !== "all" ? (
        <div data-testid="role-card" className="mt-2 space-y-1 rounded-xl border border-volt/40 bg-volt/5 p-2 text-[11px]">
          <p className="font-bold text-volt">👤 {ROLE_LABELS[trackedRole][locale]}</p>
          <p>
            📍 <strong>{t(locale, "Dónde pararte antes del silbato", "Where to stand before the whistle", "Onde ficar antes do apito")}</strong>{" "}
            {trackedRole === "L"
              ? t(locale, "El líbero no rota: entra por recepción sin pisar a los delanteros.", "The libero does not rotate: enter for reception without crossing the fronts.", "O líbero não gira: entra na recepção sem cruzar os da frente.")
              : t(
                  locale,
                  `Zona ${primaryZone} en la rotación ${rotation}`,
                  `Zone ${primaryZone} in rotation ${rotation}`,
                  `Zona ${primaryZone} na rotação ${rotation}`,
                )}
          </p>
          <ul data-testid="role-constraints" className="space-y-0.5 text-[10px] text-white/70">
            {trackedNeighbors.map((neighbor) => (
              <li key={`${neighbor.side}-${neighbor.mate}`}>
                {neighbor.side === "behind"
                  ? t(locale, `⬆️ No pasar adelante de #${neighbor.mate}`, `⬆️ Do not move in front of #${neighbor.mate}`, `⬆️ Não passe à frente de #${neighbor.mate}`)
                  : neighbor.side === "ahead"
                    ? t(locale, `⬇️ No quedarte atrás de #${neighbor.mate}`, `⬇️ Do not fall behind #${neighbor.mate}`, `⬇️ Não fique atrás de #${neighbor.mate}`)
                    : neighbor.side === "left"
                      ? t(locale, `↔️ No cruzar a la izquierda de #${neighbor.mate}`, `↔️ Do not cross to the left of #${neighbor.mate}`, `↔️ Não cruze para a esquerda de #${neighbor.mate}`)
                      : t(locale, `↔️ No cruzar a la derecha de #${neighbor.mate}`, `↔️ Do not cross to the right of #${neighbor.mate}`, `↔️ Não cruze para a direita de #${neighbor.mate}`)}
              </li>
            ))}
          </ul>
          <p>
            🔄 <strong>{t(locale, "Por dónde correr al enroque apenas golpean el saque", "Where to run on the switch as soon as they serve", "Por onde correr na troca assim que sacarem")}</strong>{" "}
            {trackedRole === "L"
              ? t(locale, "Entrá por el central en recepción y salí apenas pase el balón.", "Enter for the middle on reception and leave once the ball passes.", "Entre pelo central na recepção e saia assim que a bola passar.")
              : servePhase === "K1"
                ? t(
                    locale,
                    `Apenas saquen ellos, corré de la zona ${primaryZone} a tu posición de enroque.`,
                    `As soon as they serve, run from zone ${primaryZone} to your switch position.`,
                    `Assim que sacarem, corra da zona ${primaryZone} para a sua posição de troca.`,
                  )
                : t(
                    locale,
                    `Sacá desde la zona ${primaryZone} y volvé a tu base antes del pase K1.`,
                    `Serve from zone ${primaryZone} and return to base before the K1 pass.`,
                    `Sirva da zona ${primaryZone} e volte à base antes do passe K1.`,
                  )}
          </p>
          <p>
            🎯 <strong>{t(locale, "Tu responsabilidad de recepción/ataque", "Your reception/attack duty", "Sua responsabilidade de recepção/ataque")}</strong>{" "}
            {DUTY_LINES[trackedRole][locale]}
          </p>
        </div>
      ) : null}
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
  // v10.2.0: the active set is always derived from the set tally, never from
  // the (possibly stale) setNumber counter.
  const currentSet = state.setsA + state.setsB + 1;
  const target = state.targetPoints ?? (state.matchFormat === "short15" || currentSet === state.bestOf ? 15 : 25);
  return (state.scoreA >= target - 1 && state.scoreA - state.scoreB >= 0) || (state.scoreB >= target - 1 && state.scoreB - state.scoreA >= 0);
}

/**
 * v10.2.0 — keeps the set pills in lockstep with an edited set tally: the
 * result always holds exactly `home` sets won by A and `away` won by B, so
 * the `SET home+away+1` badge is instantly truthful after a manual edit.
 */
function rebuildSetHistory(existing: SetHistoryEntry[], home: number, away: number): SetHistoryEntry[] {
  const keep: SetHistoryEntry[] = [];
  const take = (winner: "A" | "B", count: number): void => {
    let pending = count;
    for (const entry of existing) {
      if (pending <= 0) break;
      const homeWon = entry.scoreA > entry.scoreB;
      if (homeWon === (winner === "A") && !keep.includes(entry)) {
        keep.push(entry);
        pending -= 1;
      }
    }
    while (pending > 0) {
      keep.push(winner === "A" ? { setNumber: 0, scoreA: 25, scoreB: 0 } : { setNumber: 0, scoreA: 0, scoreB: 25 });
      pending -= 1;
    }
  };
  take("A", Math.max(0, home));
  take("B", Math.max(0, away));
  return keep.map((entry, index) => ({ ...entry, setNumber: index + 1 }));
}

/** v10.2.2 — rebuilds a scorable board from a room packet (co-admin sync). */
function stateFromPacket(packet: LiveMatchPacket): ScoreboardState {
  const entries = packet.setHistory
    .split(",")
    .map((row) => row.trim())
    .filter((row) => row.length > 0)
    .map((row, index) => {
      const parts = row.split("-");
      const scoreA = Number.parseInt(parts[0] ?? "", 10);
      const scoreB = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return null;
      return { setNumber: index + 1, scoreA, scoreB };
    })
    .filter((entry): entry is { setNumber: number; scoreA: number; scoreB: number } => entry !== null);
  return newScoreboard(packet.homeName, packet.awayName, 3, {
    matchFormat: packet.mode === "picadito" ? "short15" : "bo3",
    scoreA: packet.homeScore,
    scoreB: packet.awayScore,
    setsA: packet.homeSets,
    setsB: packet.awaySets,
    serving: packet.servingSide,
    isCourtSwapped: packet.isCourtSwapped,
    colorA: packet.homeColor,
    colorB: packet.awayColor,
    setHistory: entries,
    status: "live",
    winner: null,
  });
}

/** Minimal structural type... (removed — shared interface lives near ScoutingStation) */

/**
 * v11.2.0 — official FIVB-style match sheet (Acta / Súmula): teams, sets,
 * points, K1/K2/Side-Out percentages and the R1–R6 rotation orders. Stats come
 * from the live scout session; without scout data they render as "—"
 * instead of NaN.
 */
function buildMatchSheetText(
  state: ScoreboardState,
  locale: Locale,
  statsA: RotationStats,
  statsB: RotationStats,
  sideOutA: number,
  sideOutB: number,
): string {
  const rotationRow = (lineup: number[]): string =>
    lineup.slice(0, 6).map((number, index) => `R${index + 1} #${number}`).join(" · ") || "—";
  const setsText =
    (state.setHistory ?? []).map((entry) => `${entry.scoreA}-${entry.scoreB}`).join(" | ") || `${state.scoreA}-${state.scoreB}`;
  return [
    `🏐 VoleyOS — ${t(locale, "Planilla / Acta Oficial", "Official Match Sheet", "Súmula Oficial")}`,
    `${t(locale, "Equipos", "Teams", "Equipes")}: ${state.teamA} vs ${state.teamB}`,
    `${t(locale, "Sets", "Sets", "Sets")}: ${state.setsA}-${state.setsB}  (${setsText})`,
    `${t(locale, "Puntos (set en juego)", "Points (current set)", "Pontos (set em jogo)")}: ${state.scoreA}-${state.scoreB}`,
    `K1% ${fmtSheetPct(statsA.k1Pct)} / ${fmtSheetPct(statsB.k1Pct)} · K2% ${fmtSheetPct(statsA.k2Pct)} / ${fmtSheetPct(statsB.k2Pct)} · Side-Out% ${fmtSheetPct(sideOutA)} / ${fmtSheetPct(sideOutB)}`,
    `${state.teamA}: ${rotationRow(state.lineupA)}`,
    `${state.teamB}: ${rotationRow(state.lineupB)}`,
  ].join("\n");
}

/** Zero-NaN guard: scout-free matches print an em dash, never "NaN%". */
function fmtSheetPct(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
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
    const snapshot = readTableMatchSnapshot();
    if (snapshot) return newScoreboardHistory(snapshot);
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
  // v10.2.0 — every set-dependent read derives from the tally, so a manual
  // edit can never leave a stale set counter or a stuck match behind.
  const currentSet = state.setsA + state.setsB + 1;
  const swapped = state.isCourtSwapped === true;
  // v11.3.2 — exactly ONE team ever wears the red SAQUE/SERVER badge.
  const leftServing = state.serving === (swapped ? "B" : "A");
  const rightServing = !leftServing;
  const matchDone = state.status === "finished" && state.winner !== null;
  const continuousSets = state.matchFormat === "short15" && preset !== "king";
  const setTarget = state.targetPoints ?? (state.matchFormat === "short15" || currentSet === state.bestOf ? 15 : 25);
  const [serveCap, setServeCap] = useState<ServeCapLimit>(0);
  const [serveCapBanner, setServeCapBanner] = useState<string | null>(null);
  const [undoPill, setUndoPill] = useState(false);
  const [burst, setBurst] = useState<"set" | "match" | null>(null);
  const [voiceOn, setVoiceOn] = useState(
    () =>
      window.localStorage.getItem("voleyos_tts_enabled") === "true" ||
      window.localStorage.getItem("volleyos.voice") === "1",
  );
  const [crowdOn, setCrowdOn] = useState(() => loadCrowdAmbience() > 0.01);
  // v10.1.0 teams-only board + Simple/Pro shell.
  const [soloTeams, setSoloTeams] = useState(() => window.localStorage.getItem("volleyos.soloTeams") === "1");
  const [uiMode, setUiMode] = useState<"simple" | "pro">(() =>
    window.localStorage.getItem("volleyos.uiMode") === "simple" ? "simple" : "pro",
  );
  const [editingTeams, setEditingTeams] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ a: "", b: "" });
  const [editingScore, setEditingScore] = useState<ScoreboardState["serving"] | null>(null);
  // Draft backing the ✏️ editor: typed here, committed on blur or Apply.
  const [scoreDraft, setScoreDraft] = useState({ a: "0", b: "0", sa: "0", sb: "0" });
  // v10.2.0 — native hardware volume keys score through MainActivity.
  const [volumeScoring, setVolumeScoring] = useState(() => window.localStorage.getItem("volleyos.volumeScoring") === "1");
  // v10.3.0 — Courtside / DataVolley console (Modo Pro only).
  const [dvwCommand, setDvwCommand] = useState("");
  const [dvwLog, setDvwLog] = useState<string[]>([]);
  const [dvwNotice, setDvwNotice] = useState<string | null>(null);
  // v11.2.0 — official match sheet (Acta) toggle.
  const [sheetOpen, setSheetOpen] = useState(false);
  // v11.3.2 — scoreboard-first: setup/config rows collapse behind a drawer so
  // the team cards and primary toolbar are the first thing a scorer sees.
  // Vitest keeps them expanded unless it explicitly opts into clean court.
  const [cleanCourt, setCleanCourt] = useState(() => {
    // Vitest opts into the clean layout explicitly; production defaults to it.
    if (isTestEnv) return window.localStorage.getItem("voleyos_test_clean_court") === "1";
    const saved = window.localStorage.getItem("voleyos_clean_court");
    if (saved === "1") return true;
    if (saved === "0") return false;
    return !isTestEnv;
  });
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(() => !cleanCourt);
  const [scoutDrawerOpen, setScoutDrawerOpen] = useState(() => !cleanCourt);
  const [ttsTestFlash, setTtsTestFlash] = useState(false);
  // v11.3.2 — 🖥️ Pantalla Gigante launcher straight from the court toolbar.
  const [gymBoardOpen, setGymBoardOpen] = useState(false);
  const toggleCleanCourt = (): void => {
    setCleanCourt((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem("voleyos_clean_court", next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      setSetupDrawerOpen(!next);
      setScoutDrawerOpen(!next);
      triggerCourtHaptics(8);
      return next;
    });
  };
  const dvwFileRef = useRef<HTMLInputElement | null>(null);
  // v11.0.4 — pointer drag-to-scroll for the jersey chip strip.
  const jerseyDrag = useRef<{ x: number; left: number } | null>(null);

  // The hub toggle and this board share one persisted mode; both dispatch the
  // same event so a switch made on either side stays in sync.
  useEffect(() => {
    const onUiMode = (event: Event): void => {
      const mode = (event as CustomEvent<{ mode?: string }>).detail?.mode;
      if (mode === "simple" || mode === "pro") {
        setUiMode(mode);
        return;
      }
      setUiMode(window.localStorage.getItem("volleyos.uiMode") === "simple" ? "simple" : "pro");
    };
    window.addEventListener("volleyos:uimode", onUiMode);
    return () => window.removeEventListener("volleyos:uimode", onUiMode);
  }, []);

  // v11.2.0 — this board is the source of truth for the Live Match Bus.
  useEffect(() => {
    broadcastLiveMatchSnapshot({
      teamA: state.teamA,
      teamB: state.teamB,
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      setsA: state.setsA,
      setsB: state.setsB,
      serving: state.serving,
      rotation: state.setNumber,
      sanctions: [],
    });
  }, [state.teamA, state.teamB, state.scoreA, state.scoreB, state.setsA, state.setsB, state.serving, state.setNumber]);
  const undoTimerRef = useRef<number | null>(null);
  /** v10.3.0 — always holds the freshest keyboard closure (no stale hotkeys). */
  const keyHandlerRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  const burstTimerRef = useRef<number | null>(null);
  const serveStreakRef = useRef(0);
  const prevPointRef = useRef<{ total: number; serving: ScoreboardState["serving"] } | null>(null);
  // v9.3.0 live broadcast: one room + host secret per scorer session.
  const [castOpen, setCastOpen] = useState(false);
  const [castActive, setCastActive] = useState(false);
  const [cloudRelay, setCloudRelay] = useState(false);
  const roomRef = useRef<string>("");
  const secretRef = useRef<string>("");
  const seqRef = useRef(0);
  if (!roomRef.current) roomRef.current = createRoomId();
  if (!secretRef.current) secretRef.current = createHostSecret();
  // v10.2.2 multi-admin co-scoring: room access mode, my table nickname and
  // the 4-digit Admin PIN shared by the co-admin link and the hotspot mesh.
  const [accessMode, setAccessMode] = useState<RoomAccessMode>(() => {
    const saved = window.localStorage.getItem("volleyos.accessMode");
    return saved === "coadmin" || saved === "open" ? saved : "spectator";
  });
  const [actorName, setActorName] = useState(() => window.localStorage.getItem("volleyos.actorName") ?? "");
  const [adminPin] = useState(() => createBenchPin());
  const [coActor, setCoActor] = useState<string | null>(null);
  /** Monotonic writer counter: higher revision always wins the room. */
  const revisionRef = useRef(0);
  /** Set right after a higher-revision packet is applied so we never echo it. */
  const remoteAppliedRef = useRef(false);
  const coActorTimerRef = useRef<number | null>(null);
  const bootedRef = useRef(false);
  // v9.4 physical-court ergonomics: pocket lock, outdoor sun mode, OLED saver.
  const [pocketLock, setPocketLock] = useState(() => window.localStorage.getItem("volleyos.pocketLock") === "1");
  const [sunMode, setSunMode] = useState(() => window.localStorage.getItem("volleyos.sunMode") === "1");
  const [oledDim, setOledDim] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  // v10.0.0 live micro-scout: one record per scored point + a 2.5s tag bar.
  const [scout, setScout] = useState<ScoutSession>(() => loadScoutSession());
  const [scoutBar, setScoutBar] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [pendingZone, setPendingZone] = useState<{ originZone: number; targetZone: number } | null>(null);
  const [pendingScorer, setPendingScorer] = useState<string | null>(null);
  const scoutTimerRef = useRef<number | null>(null);
  const lineupARef = useRef<number[]>([...state.lineupA]);
  const lineupBRef = useRef<number[]>([...state.lineupB]);

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

  // v9.3.0: every point/set/side change streams to the active transports — the
  // pure-Java LAN server, local tabs, and (when armed) the ntfy cloud relay.
  // v10.2.2: each broadcast carries a monotonic `revision` + `lastActor` so
  // every phone in the room can write and still converge conflict-free.
  const flashCoActor = (actor: string | null): void => {
    setCoActor(actor);
    if (coActorTimerRef.current) window.clearTimeout(coActorTimerRef.current);
    coActorTimerRef.current = window.setTimeout(() => setCoActor(null), 6000);
  };

  // Restore this room's revision counter after a tab/module remount so our
  // next local write still outranks packets the room already saw.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    try {
      const saved = Number.parseInt(window.sessionStorage.getItem("volleyos.roomRevision") ?? "0", 10);
      if (Number.isFinite(saved) && saved > revisionRef.current) revisionRef.current = saved;
    } catch {
      /* private mode: start the counter from zero */
    }
  }, []);

  // The native :8765 server gates POST /co-admin-action on this mode.
  useEffect(() => {
    const bridge = (window as Window & { VoleyOSBridge?: { setCoAdminMode?: (mode: string) => void } }).VoleyOSBridge;
    bridge?.setCoAdminMode?.(accessMode);
  }, [accessMode]);

  useEffect(() => {
    if (!castActive) return;
    let alive = true;
    // A higher-revision packet from another admin just landed on this board:
    // never echo it back into the room (everyone already has it).
    if (remoteAppliedRef.current) {
      remoteAppliedRef.current = false;
      return;
    }
    void (async () => {
      try {
        seqRef.current += 1;
        revisionRef.current += 1;
        const castMode: CastMode = state.matchFormat === "short15" ? "picadito" : "oficial";
        const packet = await buildPacket(state, {
          roomId: roomRef.current,
          seq: seqRef.current,
          mode: castMode,
          hostSecret: secretRef.current,
          homeColor: state.colorA,
          awayColor: state.colorB,
          revision: revisionRef.current,
          updatedAt: Date.now(),
          accessMode,
          adminPin,
          lastActor: actorName.trim() ? actorName.trim() : undefined,
        });
        if (!alive) return;
        pushLocalLiveServer(packet);
        const skipCloud = async (): Promise<{ ok: boolean }> => ({ ok: false });
        await publishLiveUpdate(packet, cloudRelay ? undefined : skipCloud);
        try {
          window.sessionStorage.setItem("volleyos.roomRevision", String(revisionRef.current));
        } catch {
          /* private mode: in-memory counter is enough for this session */
        }
      } catch {
        /* the LAN server keeps serving even if every relay is offline */
      }
    })();
    return () => {
      alive = false;
    };
  }, [state, castActive, cloudRelay, accessMode, adminPin, actorName]);

  // v10.2.2 — every phone in the room (host included) follows newer
  // revisions from co-admins and "Todos Anotan" scorers: apply + badge.
  useEffect(() => {
    if (!castActive) return;
    let alive = true;
    const stop = subscribeLiveRoom(roomRef.current, (packet) => {
      if (!alive) return;
      const incoming = packet.revision ?? 0;
      if (incoming <= revisionRef.current) return;
      revisionRef.current = incoming;
      remoteAppliedRef.current = true;
      try {
        window.sessionStorage.setItem("volleyos.roomRevision", String(incoming));
      } catch {
        /* private mode */
      }
      setHistory((previous) => commitScoreboard(previous, stateFromPacket(packet)));
      flashCoActor(packet.lastActor ?? null);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [castActive]);

  // v10.2.2 — "🎮 Abrir en mi Cancha como Co-Admin": a joiner hands its room
  // board over to this scoreboard with the revision it already reached.
  useEffect(() => {
    const onAdopt = (event: Event): void => {
      const detail = (event as CustomEvent<{ state?: ScoreboardState; revision?: number; actor?: string }>).detail;
      const adopted = detail?.state;
      if (!adopted) return;
      revisionRef.current = Math.max(revisionRef.current, detail?.revision ?? 0);
      setHistory((previous) => commitScoreboard(previous, adopted));
      flashCoActor(detail.actor ?? null);
      setMessage(
        t(locale, "🎮 Sala abierta en Cancha como Co-Admin.", "🎮 Room opened in Court as Co-Admin.", "🎮 Sala aberta na Quadra como Co-Admin."),
      );
      triggerCourtHaptics(25);
    };
    window.addEventListener("voleyos:coadopt", onAdopt);
    return () => window.removeEventListener("voleyos:coadopt", onAdopt);
  });

  // v10.2.2 — native hotspot friends (:8765 POST /co-admin-action) score
  // straight into this board; re-registered every render for fresh closures.
  useEffect(() => {
    type CoAction = { action?: string; actor?: string };
    const target = window as unknown as { __vosApplyCoAdminAction?: (payload: CoAction) => void };
    target.__vosApplyCoAdminAction = (payload) => {
      const rawActor = typeof payload?.actor === "string" ? payload.actor.trim().slice(0, 24) : "";
      const actor = rawActor || t(locale, "Mesa", "Table", "Mesa");
      const action = payload?.action;
      if (action === "home_plus") point("A");
      else if (action === "away_plus") point("B");
      else if (action === "home_minus") subtractPoint("A");
      else if (action === "away_minus") subtractPoint("B");
      else if (action === "reset_set") resetSet();
      else if (action === "reset_match") resetMatch();
      else if (action === "swap_serve") setServe(state.serving === "A" ? "B" : "A");
      else return;
      flashCoActor(actor);
      triggerCourtHaptics([25, 20, 25]);
    };
    return () => {
      target.__vosApplyCoAdminAction = undefined;
    };
  });

  const flashScoutBar = (): void => {
    setScoutBar(true);
    if (scoutTimerRef.current) window.clearTimeout(scoutTimerRef.current);
    scoutTimerRef.current = window.setTimeout(() => setScoutBar(false), 2500);
  };

  /** Rotation (R1–R6) of a lineup relative to the order it started the match. */
  const rotationOf = (lineup: number[], ref: { current: number[] }): number => {
    const index = ref.current.indexOf(lineup[0] ?? -1);
    if (index < 0) {
      // A roster swap replaced the lineup wholesale: restart the count.
      ref.current = [...lineup];
      return 1;
    }
    return index + 1;
  };

  const recordScout = (preState: ScoreboardState, team: "A" | "B", rotated: boolean): void => {
    setScout((previous) =>
      recordScoutPoint(previous, {
        setNumber: preState.setNumber,
        scoredBy: team,
        servingBefore: preState.serving,
        sideOut: rotated,
        rotationA: rotationOf(preState.lineupA, lineupARef),
        rotationB: rotationOf(preState.lineupB, lineupBRef),
      }),
    );
    setPendingZone(null);
    setPendingScorer(null);
    flashScoutBar();
  };

  const scoutActionLabel = (action: ScoutAction): string =>
    action === "attack"
      ? t(locale, "💥 Ataque", "💥 Attack", "💥 Ataque")
      : action === "block"
        ? t(locale, "🧱 Bloqueo", "🧱 Block", "🧱 Bloqueio")
        : action === "ace"
          ? t(locale, "🎯 Ace", "🎯 Ace", "🎯 Ace")
          : action === "set"
            ? t(locale, "🎩 Toque", "🎩 Tip", "🎩 Toque")
            : t(locale, "❌ Error Rival", "❌ Opponent Error", "❌ Erro do Rival");

  const scoutZoneLabel = (id: ZonePreset["id"]): string =>
    id === "z4z5"
      ? "Z4 → Z5"
      : id === "z2z1"
        ? "Z2 → Z1"
        : id === "z3short"
          ? t(locale, "Z3 Corta", "Z3 Quick", "Z3 Curta")
          : "Pipe Z6";

  const scoutPlayers = (state.rosterA?.players ?? []).slice(0, 6);

  useEffect(() => {
    saveScoutSession(scout);
    saveLiveScoutShots(sessionShots(scout));
  }, [scout]);

  // A fresh 0-0 match re-anchors R1 for both lineups and drops stale scouting.
  const freshMatch =
    state.setNumber === 1 && state.setsA === 0 && state.setsB === 0 && state.scoreA === 0 && state.scoreB === 0;
  useEffect(() => {
    if (!freshMatch) return;
    lineupARef.current = [...state.lineupA];
    lineupBRef.current = [...state.lineupB];
    setScout((previous) => (previous.events.length > 0 || previous.undone.length > 0 ? resetScoutSession() : previous));
  }, [freshMatch, state.lineupA, state.lineupB]);

  // v10.0.0 perf: memoize the O(events) scout derives off the event log.
  const scoutAlert = useMemo(() => bleedingRotation(scout, "A"), [scout]);
  const boxRows = useMemo(
    () => (boxOpen ? [rotationStats(scout, "A"), rotationStats(scout, "B")] : null),
    [boxOpen, scout],
  );

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
      if (scoutTimerRef.current) window.clearTimeout(scoutTimerRef.current);
      if (coActorTimerRef.current) window.clearTimeout(coActorTimerRef.current);
    };
  }, []);

  // v10.2.2 — room access mode + table nickname, persisted for every match.
  const changeAccessMode = (mode: RoomAccessMode): void => {
    setAccessMode(mode);
    window.localStorage.setItem("volleyos.accessMode", mode);
    triggerCourtHaptics(14);
    setMessage(
      mode === "open"
        ? t(locale, "🍻 Todos Anotan: cualquier celular de la sala puede puntuar.", "🍻 Open Table: any phone in the room can score.", "🍻 Mesa Aberta: qualquer celular da sala pode pontuar.")
        : mode === "coadmin"
          ? t(locale, "🤝 Co-Admins: anotan los que tengan el link o el PIN.", "🤝 Co-Admins: link or PIN holders can score.", "🤝 Co-Admins: quem tem link ou PIN pontua.")
          : t(locale, "👁️ Solo espectadores: solo el Host anota.", "👁️ Spectators only: only the Host scores.", "👁️ Só espectadores: só o Host pontua."),
    );
  };

  const changeActorName = (name: string): void => {
    setActorName(name);
    window.localStorage.setItem("volleyos.actorName", name);
  };

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
    // v11.0.3 — one shared switch: Ajustes and Cancha stay in sync instantly.
    persistTtsEnabled(next);
    triggerCourtHaptics(18);
    if (next) {
      announceScoreTTS(
        t(locale, "Voz del marcador activada.", "Score voice on.", "Voz do marcador ativada."),
        true,
        ttsLang,
      );
    }
  };

  // v11.0.3 — Ajustes ↔ Cancha TTS sync + visual announcer toast fallback.
  const [ttsToast, setTtsToast] = useState("");
  useEffect(() => {
    const syncTts = (event: Event): void => {
      setVoiceOn((event as CustomEvent<string>).detail === "true");
    };
    const showToast = (event: Event): void => {
      const text = (event as CustomEvent<string>).detail;
      if (text) setTtsToast(`🗣️ ${t(locale, "Locutor", "Announcer", "Locutor")}: "${text}"`);
    };
    window.addEventListener(TTS_ENABLED_EVENT, syncTts);
    window.addEventListener(TTS_TOAST_EVENT, showToast);
    return () => {
      window.removeEventListener(TTS_ENABLED_EVENT, syncTts);
      window.removeEventListener(TTS_TOAST_EVENT, showToast);
    };
  }, [locale]);

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
      rememberPlayerNames(
        rosterSheet
          .split(/\n+/)
          .map((line) => line.replace(/^\s*\d+\s+/, "").replace(/\s+(C\/L|C|L|S|OH|MB|OPP)$/i, "").trim())
          .filter((name) => name.length >= 2),
      );
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

  /** v9.4 morse haptics: native patterns on device, navigator.vibrate on the web. */
  const nativeHaptic = (pattern: "home_point" | "away_point" | "set_point" | "set_win"): void => {
    try {
      const bridge = (window as Window & { VoleyOSBridge?: { triggerHapticPattern?: (patternType: string) => void } }).VoleyOSBridge;
      if (bridge?.triggerHapticPattern) {
        bridge.triggerHapticPattern(pattern);
        return;
      }
    } catch {
      /* web build: fall through to the vibration API */
    }
    triggerCourtHaptics(
      pattern === "set_win"
        ? [450]
        : pattern === "set_point"
          ? [80, 50, 80]
          : pattern === "away_point"
            ? [40, 60, 40]
            : 30,
    );
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
      const liberoLineupA = applyAutoLibero("A", result.state.lineupA);
      const liberoLineupB = applyAutoLibero("B", result.state.lineupB);
      setHistory(
        commitScoreboard(
          history,
          result.rotated
            ? { ...result.state, lineupA: liberoLineupA, lineupB: liberoLineupB }
            : result.state,
        ),
      );
      if (result.rotated) triggerCourtHaptics([50, 40, 50, 40, 80]);
      flashUndoPill();
      recordScout(state, team, result.rotated);
      if (result.matchFinished) flashBurst("match");
      else if (result.setFinished) flashBurst("set");
      if (result.matchFinished) saveSeasonMatch(seasonMatchFromState(result.state, preset));
      if (result.matchFinished) window.dispatchEvent(new CustomEvent("voleyos:support-moment", { detail: "match" }));
      if (result.matchFinished) setHubOpen(true);
      setMessage(
        `${result.message}${result.rotated ? t(locale, " · rotación", " · rotation", " · rotação") : ""}${
          result.sideSwitchDue ? t(locale, " · cambio de lado", " · switch sides", " · troca de lado") : ""
        }${
          result.matchFinished
            ? t(locale, " · guardado en Mi Temporada", " · saved in My Season", " · salvo em Minha Temporada")
            : ""
        }`,
      );
      if (result.setFinished || result.matchFinished) nativeHaptic("set_win");
      else if (pressurePoint(result.state)) nativeHaptic("set_point");
      else nativeHaptic(team === "A" ? "home_point" : "away_point");
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
    playCourtWhistle("double");
    triggerCourtHaptics([40, 30, 40]);
    setFlashSwap(true);
    window.setTimeout(() => setFlashSwap(false), 450);
    setMessage(t(locale, "🔄 Cancha cambiada — columnas invertidas.", "🔄 Sides swapped — columns inverted.", "🔄 Quadra trocada — colunas invertidas."));
  };

  const undo = (): void => {
    setHistory((previous) => undoScoreboard(previous));
    setScout((previous) => undoScoutPoint(previous));
    setMessage(t(locale, "Jugada deshecha.", "Play undone.", "Jogada desfeita."));
    triggerCourtHaptics([140]);
  };

  useEffect(() => {
    persistLiveScoreboard(state);
    clearClonedScoreboard();
    syncWidgetSnapshot();
  }, [state]);

  // v10.3.0 — same snapshot under the versioned key the app boots from.
  useEffect(() => {
    if (isTestEnv) return;
    writeTableMatchSnapshot(state);
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
        setScout((previous) => undoScoutPoint(previous, 2));
        setMessage(t(locale, "Dos puntos deshechos desde volumen.", "Two points undone from volume.", "Dois pontos desfeitos pelo volume."));
        triggerCourtHaptics([40, 30, 40]);
      }
    };
    window.addEventListener("voleyos:hardware-key", onHardwareKey);
    return () => window.removeEventListener("voleyos:hardware-key", onHardwareKey);
  }, [hardwareMode, locale, point]);

  // v10.2.0 — native hardware volume scoring. MainActivity consumes Vol± in
  // dispatchKeyEvent and calls back into this handler; desktop browsers never
  // deliver those keys, so the arrow keys stand in as a fallback.
  useEffect(() => {
    type VolumeWindow = Window & {
      __vosHardwareVolumeKey?: (dir: "up" | "down") => void;
      VoleyOSBridge?: { setVolumeKeyScoring?: (enabled: boolean) => void };
    };
    const target = window as VolumeWindow;
    target.VoleyOSBridge?.setVolumeKeyScoring?.(volumeScoring);
    if (!volumeScoring) {
      target.__vosHardwareVolumeKey = undefined;
      return;
    }
    const onVolumeDir = (dir: "up" | "down"): void => {
      // "up" always feeds the team shown on the left, "down" the right one,
      // so the physical buttons mirror the columns on screen after a swap.
      const leftIsTeamA = !(state.isCourtSwapped === true);
      const side = dir === "up" ? (leftIsTeamA ? "A" : "B") : leftIsTeamA ? "B" : "A";
      point(side);
    };
    target.__vosHardwareVolumeKey = onVolumeDir;
    const onKeyDown = (event: KeyboardEvent): void => {
      const el = event.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      onVolumeDir(event.key === "ArrowUp" ? "up" : "down");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (target.__vosHardwareVolumeKey === onVolumeDir) target.__vosHardwareVolumeKey = undefined;
    };
  }, [volumeScoring, state.isCourtSwapped, point]);

  const redo = (): void => {
    setHistory((previous) => redoScoreboard(previous));
    setScout((previous) => redoScoutPoint(previous));
    setMessage(t(locale, "Jugada rehecha.", "Play redone.", "Jogada refeita."));
  };

  const handleScoreboardKey = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
    const key = event.key;
    const lower = key.toLowerCase();
    // The hardware-volume listener owns the arrows while Vol± scoring is armed.
    if ((key === "ArrowUp" || key === "ArrowDown") && volumeScoring) return;
    if (lower === "a" || key === "ArrowUp" || lower === "l" || key === "ArrowDown") {
      event.preventDefault();
      point(lower === "a" || key === "ArrowUp" ? leftSide : rightSide);
    } else if (lower === "z" || key === "Backspace") {
      event.preventDefault();
      undo();
    } else if (lower === "s") {
      event.preventDefault();
      setServe(state.serving === "A" ? "B" : "A");
    } else if (lower === "c") {
      event.preventDefault();
      swapSides();
    } else if (lower === "m") {
      event.preventDefault();
      if (isTableLandscapeMode) exitTableMode();
      else enterTableMode();
    } else if (lower === "w") {
      event.preventDefault();
      playCourtWhistle("short");
    } else if (lower === "b") {
      event.preventDefault();
      playBuzzer();
    }
  };
  keyHandlerRef.current = handleScoreboardKey;

  useEffect(() => {
    const dispatch = (event: KeyboardEvent): void => keyHandlerRef.current(event);
    window.addEventListener("keydown", dispatch);
    return () => window.removeEventListener("keydown", dispatch);
  }, []);

  const togglePocketLock = (): void => {
    const next = !pocketLock;
    setPocketLock(next);
    window.localStorage.setItem("volleyos.pocketLock", next ? "1" : "0");
    // v10.2.0: pocket mode is scored from the physical Vol± keys, so it arms
    // native volume scoring automatically.
    if (next) {
      setVolumeScoring(true);
      window.localStorage.setItem("volleyos.volumeScoring", "1");
    }
    triggerCourtHaptics(20);
    setMessage(
      next
        ? t(locale, "🔒 Modo bolsillo: solo el volumen puntúa.", "Pocket mode: only volume keys score.", "Modo bolso: só o volume pontua.")
        : t(locale, "🔓 Modo bolsillo apagado.", "Pocket mode off.", "Modo bolso desligado."),
    );
  };

  const toggleSunMode = (): void => {
    const next = !sunMode;
    setSunMode(next);
    window.localStorage.setItem("volleyos.sunMode", next ? "1" : "0");
    triggerCourtHaptics(16);
  };

  const toggleSoloTeams = (): void => {
    const next = !soloTeams;
    setSoloTeams(next);
    window.localStorage.setItem("volleyos.soloTeams", next ? "1" : "0");
    triggerCourtHaptics(14);
  };

  const toggleUiMode = (): void => {
    const next = uiMode === "simple" ? "pro" : "simple";
    setUiMode(next);
    window.localStorage.setItem("volleyos.uiMode", next);
    window.dispatchEvent(new CustomEvent("volleyos:uimode", { detail: { mode: next } }));
    triggerCourtHaptics(14);
    setMessage(
      next === "simple"
        ? t(locale, "⚡ Modo Simple: solo el marcador.", "⚡ Simple mode: scoreboard only.", "⚡ Modo Simples: só o placar.")
        : t(locale, "🛠️ Modo Pro: paneles completos.", "🛠️ Pro mode: full panels.", "🛠️ Modo Pro: painéis completos."),
    );
  };

  const openTeamEditor = (): void => {
    setTeamDraft({ a: state.teamA, b: state.teamB });
    setEditingTeams(true);
  };

  const commitTeamDraft = (): void => {
    const a = teamDraft.a.trim();
    const b = teamDraft.b.trim();
    if ((a && a !== state.teamA) || (b && b !== state.teamB)) {
      setHistory((previous) =>
        commitScoreboard(previous, {
          ...previous.present,
          teamA: a || previous.present.teamA,
          teamB: b || previous.present.teamB,
        }),
      );
    }
    setEditingTeams(false);
  };

  /**
   * v10.2.0 — single normalization pass for every manual edit. One undo entry
   * per change, the active set is re-derived from the tally, setHistory is
   * rebuilt to match, and the match is re-opened or closed from the edited
   * sets so scoring can never get stuck behind a stale banner.
   */
  const manualCommit = (patch: Partial<ScoreboardState>): void => {
    setHistory((previous) => {
      const base: ScoreboardState = { ...previous.present, ...patch };
      const totalSets = Math.max(0, base.setsA) + Math.max(0, base.setsB);
      const setsNeeded = base.matchFormat === "bo5" ? 3 : 2;
      const decided =
        base.setsA >= setsNeeded ||
        base.setsB >= setsNeeded ||
        base.setsA > Math.floor(base.bestOf / 2) ||
        base.setsB > Math.floor(base.bestOf / 2);
      const next: ScoreboardState = {
        ...base,
        setNumber: Math.max(1, totalSets + 1),
        setHistory: rebuildSetHistory(previous.present.setHistory ?? [], base.setsA, base.setsB),
        status: decided ? "finished" : "live",
        winner: decided ? (base.setsA > base.setsB ? "A" : "B") : null,
        isDecider: totalSets + 1 === base.bestOf,
        streak: Math.max(1, base.streak),
      };
      return commitScoreboard(previous, next);
    });
  };

  const toggleScoreEditor = (): void => {
    if (editingScore !== null) {
      setEditingScore(null);
      return;
    }
    setScoreDraft({
      a: String(state.scoreA),
      b: String(state.scoreB),
      sa: String(state.setsA),
      sb: String(state.setsB),
    });
    setEditingScore("A");
  };

  /** ✏️ Apply: commit the whole draft at once, synced and undoable. */
  const applyManualScore = (): void => {
    const parse = (raw: string, max: number): number => {
      const value = Number.parseInt(raw, 10);
      return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
    };
    manualCommit({
      scoreA: parse(scoreDraft.a, 99),
      scoreB: parse(scoreDraft.b, 99),
      setsA: parse(scoreDraft.sa, 9),
      setsB: parse(scoreDraft.sb, 9),
    });
    setEditingScore(null);
    setMessage(
      t(locale, "✏️ Marcador ajustado — seguí jugando.", "✏️ Score adjusted — keep playing.", "✏️ Placar ajustado — continue jogando."),
    );
    triggerCourtHaptics(20);
  };

  /** 🔄 Nuevo Partido (0-0): full reset, one undo away from restoring it. */
  const resetMatch = (): void => {
    setHistory((previous) =>
      commitScoreboard(previous, {
        ...previous.present,
        scoreA: 0,
        scoreB: 0,
        setsA: 0,
        setsB: 0,
        setNumber: 1,
        serving: previous.present.firstServing,
        streak: 1,
        status: "live",
        winner: null,
        setHistory: [],
        isCourtSwapped: false,
        isDecider: false,
        isTieBreak: false,
        sideSwitchedAt8: false,
      }),
    );
    setBurst(null);
    setMessage(
      t(locale, "🔄 Partido nuevo 0-0 — ↶ Deshacer lo restaura.", "🔄 New match 0-0 — ↶ Undo restores it.", "🔄 Partida nova 0-0 — ↶ Desfazer restaura."),
    );
    triggerCourtHaptics([30, 25, 30]);
  };

  /** ↺ Reiniciar Set: points only — sets, setHistory and sides stay put. */
  const resetSet = (): void => {
    setHistory((previous) =>
      commitScoreboard(previous, { ...previous.present, scoreA: 0, scoreB: 0, streak: 1, sideSwitchedAt8: false }),
    );
    setMessage(t(locale, "↺ Set reiniciado 0-0 — los sets se mantienen.", "↺ Set reset 0-0 — sets preserved.", "↺ Set zerado 0-0 — sets mantidos."));
    triggerCourtHaptics(20);
  };

  /** ▶️ picadito/king: close the set banner and keep the rally counting. */
  const followNextSet = (): void => {
    setHistory((previous) => {
      const base = previous.present;
      return commitScoreboard(previous, {
        ...base,
        scoreA: 0,
        scoreB: 0,
        status: "live",
        winner: null,
        setNumber: Math.max(1, base.setsA + base.setsB + 1),
        serving: base.firstServing,
        streak: 1,
        sideSwitchedAt8: false,
      });
    });
    setBurst(null);
    setMessage(t(locale, "▶️ ¡Siguiente set!", "▶️ Next set!", "▶️ Próximo set!"));
    triggerCourtHaptics([30, 25, 30]);
  };

  /** 🆕 Nuevo Partido (Limpiar todo): a brand-new 0-0 board, same teams. */
  const brandNewMatch = (): void => {
    setHistory((previous) =>
      commitScoreboard(
        previous,
        newScoreboard(previous.present.teamA, previous.present.teamB, previous.present.bestOf, {
          matchFormat: previous.present.matchFormat,
          targetPoints: previous.present.targetPoints,
          goldenPoint: previous.present.goldenPoint,
          colorA: previous.present.colorA,
          colorB: previous.present.colorB,
          rosterA: previous.present.rosterA,
          rosterB: previous.present.rosterB,
          lineupA: previous.present.lineupA,
          lineupB: previous.present.lineupB,
          firstServing: "A",
          serving: "A",
        }),
      ),
    );
    setBurst(null);
    setMessage(t(locale, "🆕 Partido nuevo — tablero limpio 0-0.", "🆕 New match — clean 0-0 board.", "🆕 Partida nova — placar limpo 0-0."));
    triggerCourtHaptics([30, 25, 30]);
  };

  /** One-tap serve handover from the 🏐 SACA badge on either team card. */
  const setServe = (side: ScoreboardState["serving"]): void => {
    setHistory((previous) => commitScoreboard(previous, { ...previous.present, serving: side }));
    triggerCourtHaptics(14);
  };

  /** −1: never blocked, even right after a set rollover. */
  const subtractPoint = (side: ScoreboardState["serving"]): void => {
    setHistory((previous) => {
      const base = previous.present;
      return commitScoreboard(previous, {
        ...base,
        scoreA: side === "A" ? Math.max(0, base.scoreA - 1) : base.scoreA,
        scoreB: side === "B" ? Math.max(0, base.scoreB - 1) : base.scoreB,
      });
    });
    triggerCourtHaptics(14);
  };

  const toggleVolumeScoring = (): void => {
    const next = !volumeScoring;
    setVolumeScoring(next);
    window.localStorage.setItem("volleyos.volumeScoring", next ? "1" : "0");
    triggerCourtHaptics(next ? [30, 25, 30] : 18);
    setMessage(
      next
        ? t(locale, "🔊 Vol+ suma a la izquierda · Vol- a la derecha.", "🔊 Vol+ scores left · Vol- right.", "🔊 Vol+ soma à esquerda · Vol- à direita.")
        : t(locale, "🔉 Puntaje por volumen apagado.", "🔉 Volume scoring off.", "🔉 Pontuação por volume desligada."),
    );
  };

  const editScoreTo = (side: ScoreboardState["serving"], raw: string): void => {
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(0, Math.min(99, value));
    manualCommit(side === "A" ? { scoreA: clamped } : { scoreB: clamped });
  };

  const editSetsTo = (side: ScoreboardState["serving"], raw: string): void => {
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(0, Math.min(9, value));
    manualCommit(side === "A" ? { setsA: clamped } : { setsB: clamped });
  };

  // Quick faculty chips for tournament days: one tap renames the side and the
  // new name flows into the header, the voice announcer and the live cast.
  const applyFaculty = (side: ScoreboardState["serving"], name: string): void => {
    setTeamDraft((draft) => (side === "A" ? { ...draft, a: name } : { ...draft, b: name }));
    setHistory((previous) =>
      commitScoreboard(previous, side === "A" ? { ...previous.present, teamA: name } : { ...previous.present, teamB: name }),
    );
    triggerCourtHaptics(12);
  };

  // v9.4 OLED table saver: FLAG_KEEP_SCREEN_ON during a live match, released
  // the moment the board goes idle.
  useEffect(() => {
    const bridge = (window as Window & { VoleyOSBridge?: { setKeepScreenAwake?: (keep: boolean) => void } }).VoleyOSBridge;
    const live = state.status === "live" && isMatchActive(state);
    bridge?.setKeepScreenAwake?.(live);
    if (!live) setOledDim(false);
    return () => bridge?.setKeepScreenAwake?.(false);
  }, [state]);

  // v10.1.0 web back-gesture guard: while points are on the board an
  // accidental back/swipe must not wipe the match. We hold one extra history
  // entry (merging Next's own fields) and bounce popstate straight back.
  useEffect(() => {
    if (state.status !== "live" || !isMatchActive(state)) return;
    if (!(window.history.state as { vosBackGuard?: number } | null)?.vosBackGuard) {
      window.history.pushState({ ...(window.history.state ?? {}), vosBackGuard: 1 }, "");
    }
    const onPop = (): void => {
      window.history.pushState({ ...(window.history.state ?? {}), vosBackGuard: 1 }, "");
      setMessage(
        t(
          locale,
          "⚠️ Partido en curso: para salir, usá el menú de la app.",
          "⚠️ Match in progress: leave through the in-app menu.",
          "⚠️ Partida em andamento: saia pelo menu do app.",
        ),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [state, locale]);

  // v9.4: dim non-essential chrome after 30s of stillness; any touch revives it.
  useEffect(() => {
    let timer: number | null = null;
    const wake = (): void => {
      setOledDim(false);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setOledDim(true), 30_000);
    };
    wake();
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // ------------------------------------------------ v10.3.0 Courtside console
  const dvwTranslation = translateScoutCodeLive(dvwCommand, locale);
  const dvwIssues = useMemo(
    () => lintScoutLogSequence(scoutLinesToLogEntries(dvwLog), locale),
    [dvwLog, locale],
  );
  const dvwLatestIssue = dvwIssues.length > 0 ? dvwIssues[dvwIssues.length - 1] : null;

  const submitDvwCommand = (): void => {
    if (!dvwTranslation.valid) {
      setDvwNotice(dvwTranslation.summary);
      return;
    }
    const code = dvwCommand.trim();
    setDvwLog((previous) => [...previous, code]);
    setDvwCommand("");
    setDvwNotice(null);
    triggerCourtHaptics(10);
  };

  const loadDvwText = (text: string, label: string): void => {
    const file = tryParseDvwFile(text);
    if (!file) {
      setDvwNotice(t(locale, "Archivo .DVW inválido.", "Invalid .DVW file.", "Arquivo .DVW inválido."));
      return;
    }
    const codes = file.sets.flatMap((set) => set.scout);
    setHistory((previous) =>
      commitScoreboard(previous, { ...previous.present, teamA: file.homeTeam, teamB: file.awayTeam }),
    );
    setDvwLog(codes);
    setDvwNotice(
      `${label} · ${file.sets.length} ${t(locale, "sets", "sets", "sets")} · ${codes.length} ${t(locale, "códigos", "codes", "códigos")}`,
    );
    triggerCourtHaptics(14);
  };

  const exportDvwFile = (): void => {
    const text = exportMatchToDvw(state, [dvwLog]);
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${state.teamA}-${state.teamB}.dvw`.replace(/\s+/g, "_");
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      /* download blocked: the notice below still confirms the export */
    }
    setDvwNotice(t(locale, "📤 .DVW exportado.", "📤 .DVW exported.", "📤 .DVW exportado."));
    triggerCourtHaptics(14);
  };

  // ------------------------------------------- v11.0.0 Cancha overhaul state
  const [focusMode, setFocusMode] = useState(false);
  const [oledMode, setOledMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [scoutDepth, setScoutDepth] = useState(0);
  const [autoLiberoOn, setAutoLiberoOn] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [taggerJersey, setTaggerJersey] = useState(14);
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [overlapSwapped, setOverlapSwapped] = useState(false);
  const [triText, setTriText] = useState("");
  const [triRows, setTriRows] = useState<ReturnType<typeof computeFivbPoolStandings>>([]);
  const [rosterSwapCode, setRosterSwapCode] = useState("");
  const [mvpVote, setMvpVote] = useState("");
  const [mufaVote, setMufaVote] = useState("");
  const [vaquitaDebts, setVaquitaDebts] = useState<VaquitaDebt[]>(() => loadVaquitaDebts());
  const [vaquitaAlias, setVaquitaAlias] = useState("");
  const liberoInRef = useRef<{ libero: number; replaced: number; side: "A" | "B" } | null>(null);
  const pipelineIngestedRef = useRef(false);

  // WhatsApp pipeline teams saved from Picadito land in Cancha on first mount.
  useEffect(() => {
    if (pipelineIngestedRef.current) return;
    pipelineIngestedRef.current = true;
    const teams = loadPipelineTeams();
    if (!teams) return;
    setHistory((previous) =>
      commitScoreboard(previous, {
        ...previous.present,
        teamA: teams.teamA.join(" · "),
        teamB: teams.teamB.join(" · "),
      }),
    );
  }, []);

  // Pure #000000 OLED battery-saver background.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.backgroundColor = oledMode ? "#000000" : "";
  }, [oledMode]);

  const statsA = totalStats(scout, "A");
  const statsB = totalStats(scout, "B");
  const fmtPct = (value: number): string => (Number.isFinite(value) ? `${value.toFixed(1)}%` : "—");
  const sideOutPct = (side: "A" | "B"): number => {
    const row = side === "A" ? statsA : statsB;
    return row.sideOutAttempts > 0 ? (row.sideOutWins / row.sideOutAttempts) * 100 : 0;
  };

  const appendDvwCode = (code: string): void => {
    setDvwLog((previous) => [...previous, code]);
    triggerCourtHaptics(12);
  };

  // Deterministic DataVolley codes from the quick tagger: *NN attack H / block B / ace A, rival error =.
  const taggerCode = (action: ScoutAction, jersey: number): string => {
    const digits = String(jersey).padStart(2, "0");
    if (action === "attack") return `*${digits}AH#`;
    if (action === "block") return `*${digits}B#`;
    if (action === "ace") return `*${digits}A#`;
    return "=";
  };
  const SWIPE_CODES: Record<"up" | "down" | "right" | "left", string> = {
    up: "#",
    down: "=",
    right: "+",
    left: "/",
  };

  const startVoiceScout = (): void => {
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceFallback(true);
      return;
    }
    try {
      const engine = new Recognition();
      engine.lang = navigator.language || "es-ES";
      engine.onresult = (event) => {
        const heard = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ");
        if (heard.trim()) applyVoiceCommand(heard.trim());
      };
      engine.onerror = () => setVoiceFallback(true);
      engine.start();
    } catch {
      setVoiceFallback(true);
    }
  };

  const applyVoiceCommand = (text: string): void => {
    const clean = text.toLowerCase();
    if (clean.includes("punto local") || clean.includes("punto visitante")) {
      point(clean.includes("punto local") ? "A" : "B");
      return;
    }
    const attack = clean.match(/(\d{1,2})\s*(?:ataque|ataca)/);
    if (attack) {
      appendDvwCode(taggerCode("attack", Number(attack[1])));
      return;
    }
    setMessage(
      t(
        locale,
        '🎙️ Frase no reconocida. Probá "punto local" o "14 ataque punto".',
        '🎙️ Phrase not recognised. Try "punto local" or "14 attack point".',
        '🎙️ Frase não reconhecida. Tente "ponto local" ou "14 ataque ponto".',
      ),
    );
  };

  // v11 auto-libero: middle blocker ↔ libero swap on back-row landings — never a counted sub.
  const applyAutoLibero = (side: "A" | "B", lineup: number[]): number[] => {
    if (!autoLiberoOn) return lineup;
    const roster = (side === "A" ? state.rosterA : state.rosterB)?.players ?? [];
    if (roster.length === 0) return lineup;
    const active =
      liberoInRef.current && liberoInRef.current.side === side
        ? { libero: liberoInRef.current.libero, replaced: liberoInRef.current.replaced }
        : null;
    const applied = applyAutoLiberoSwap(lineup, roster, active);
    liberoInRef.current = applied.active ? { ...applied.active, side } : null;
    return applied.lineup;
  };

  const canonicalRotation: Record<RotationSlot, RotationPosition> = {
    1: { x: 5, y: 8 },
    2: { x: 5, y: 1 },
    3: { x: 3, y: 1 },
    4: { x: 1, y: 1 },
    5: { x: 1, y: 8 },
    6: { x: 3, y: 8 },
  };
  const demoRotation: Record<RotationSlot, RotationPosition> = overlapSwapped
    ? { ...canonicalRotation, 1: canonicalRotation[2], 2: canonicalRotation[1] }
    : canonicalRotation;
  const demoOverlap = validateFivbRotationOverlap(demoRotation) as { legal: boolean; violations: string[] };

  const runTriangular = (): void => {
    const matches: FivbPoolMatch[] = [];
    for (const line of triText.split(/\r?\n/)) {
      const parsed = line.trim().match(/^(\S+)\s+((?:\d{1,3}-\d{1,3}\s*)+)(\S+)$/);
      if (!parsed || !parsed[1] || !parsed[2] || !parsed[3]) continue;
      const setScores = parsed[2]
        .trim()
        .split(/\s+/)
        .map((pair): [number, number] | null => {
          const halves = pair.split("-");
          const a = Number(halves[0] ?? NaN);
          const b = Number(halves[1] ?? NaN);
          return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
        })
        .filter((pair): pair is [number, number] => pair !== null);
      if (setScores.length > 0) matches.push({ teamA: parsed[1], teamB: parsed[3], setScores });
    }
    setTriRows(computeFivbPoolStandings(matches));
  };

  const copyRosterSwapCode = (): void => {
    const code = `${state.lineupA.slice(0, 6).join(",")}|${state.lineupB.slice(0, 6).join(",")}`;
    void navigator.clipboard?.writeText(code).catch(() => undefined);
    setRosterSwapCode(code);
    setMessage(t(locale, "📥 Código de alineación copiado — pegalo en otro dispositivo.", "📥 Lineup code copied — paste it on another device.", "📥 Código de escalación copiado — cole noutro dispositivo."));
  };

  const applyRosterSwapCode = (): void => {
    const parts = rosterSwapCode.split("|");
    const parseLineup = (raw: string): number[] =>
      raw
        .split(",")
        .map((piece) => Number(piece))
        .filter((number_) => Number.isInteger(number_) && number_ > 0)
        .slice(0, 6);
    if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
      setMessage(t(locale, "Código de alineación inválido.", "Invalid lineup code.", "Código de escalación inválido."));
      return;
    }
    const lineA = parseLineup(parts[0]);
    const lineB = parseLineup(parts[1]);
    if (lineA.length !== 6 || lineB.length !== 6) {
      setMessage(t(locale, "Código de alineación inválido.", "Invalid lineup code.", "Código de escalación inválido."));
      return;
    }
    setHistory((previous) =>
      commitScoreboard(previous, { ...previous.present, lineupA: lineA, lineupB: lineB }),
    );
    setMessage(t(locale, "🔄 Alineación intercambiada por código.", "🔄 Lineups swapped by code.", "🔄 Escalações trocadas por código."));
  };

  const copyWhatsAppSummary = (): void => {
    const setHistoryText = (state.setHistory ?? []).map((entry) => `${entry.scoreA}-${entry.scoreB}`).join(" | ");
    const summary = `🏐 VoleyOS | ${left.name} ${left.sets} - ${right.sets} ${right.name} (${setHistoryText || "0-0"} | Set actual: ${state.scoreA}-${state.scoreB})`;
    void navigator.clipboard?.writeText(summary).catch(() => undefined);
    triggerCourtHaptics(12);
    setMessage(t(locale, "📋 Resumen WhatsApp copiado.", "📋 WhatsApp summary copied.", "📋 Resumo WhatsApp copiado."));
  };

  const exportMatchCard = async (): Promise<void> => {
    const dataUrl = await generateMatchStoryCardDataUrl({
      title: `${left.name} vs ${right.name}`,
      finalScore: `${left.score}-${right.score}`,
      setsLine: `${t(locale, "Sets", "Sets", "Sets")} ${left.sets}-${right.sets}`,
      mvp: mvpVote.trim() || undefined,
    });
    if (!dataUrl) {
      setMessage(t(locale, "📸 Tarjeta no disponible.", "📸 Card unavailable.", "📸 Cartão indisponível."));
      return;
    }
    try {
      const bin = atob(dataUrl.split(",")[1] ?? "");
      const bytes = Uint8Array.from(bin, (char) => char.charCodeAt(0));
      const saved = downloadBlob(new Blob([bytes], { type: "image/png" }), "voleyos-match-card.png");
      setMessage(
        saved
          ? t(locale, "📸 Tarjeta descargada.", "📸 Card downloaded.", "📸 Cartão baixado.")
          : t(locale, "📸 Tarjeta lista (descarga bloqueada).", "📸 Card ready (download blocked).", "📸 Cartão pronto (download bloqueado)."),
      );
    } catch {
      setMessage(t(locale, "📸 Tarjeta lista.", "📸 Card ready.", "📸 Cartão pronto."));
    }
  };

  const toggleVaquitaDebt = (alias: string, paid: boolean): void => {
    const next = setVaquitaDebt(vaquitaDebts, alias, paid);
    setVaquitaDebts(next);
    saveVaquitaDebts(next);
  };

  const copyDebtReminder = (alias: string): void => {
    void navigator.clipboard?.writeText(debtReminderText(vaquitaDebts, alias)).catch(() => undefined);
    triggerCourtHaptics(12);
    setMessage(t(locale, "📲 Reclamo copiado.", "📲 Reminder copied.", "📲 Cobrança copiada."));
  };

  const applyVotes = (): void => {
    if (mvpVote.trim()) applyPlayerMmrDelta(mvpVote.trim(), MMR_MVP_DELTA);
    if (mufaVote.trim()) applyPlayerMmrDelta(mufaVote.trim(), MMR_MUFA_DELTA);
    setMvpVote("");
    setMufaVote("");
    setMessage(t(locale, "🏆 Votos aplicados al MMR local.", "🏆 Votes applied to local MMR.", "🏆 Votos aplicados ao MMR local."));
  };

  const left = swapped
    ? { name: state.teamB, score: state.scoreB, sets: state.setsB, serving: state.serving === "B", color: state.colorB }
    : { name: state.teamA, score: state.scoreA, sets: state.setsA, serving: state.serving === "A", color: state.colorA };
  const right = swapped
    ? { name: state.teamA, score: state.scoreA, sets: state.setsA, serving: state.serving === "A", color: state.colorA }
    : { name: state.teamB, score: state.scoreB, sets: state.setsB, serving: state.serving === "B", color: state.colorB };
  const leftSide: ScoreboardState["serving"] = swapped ? "B" : "A";
  const rightSide: ScoreboardState["serving"] = swapped ? "A" : "B";
  const showPoint8 = point8SwitchDue(state);

  // ------------------------------------------------------- v10.3.0 Modo Mesa
  // 50/50 landscape flip scoreboard. It arms itself while the phone lies
  // horizontal (and was not dismissed for this orientation), and can be forced
  // from the Cancha top bar on any screen size.
  const [isTableLandscapeMode, setIsTableLandscapeMode] = useState(false);
  const [landscapeDismissed, setLandscapeDismissed] = useState(false);
  const tableModeBootstrappedRef = useRef(false);
  const tableManualRef = useRef(false);

  // v11.0.2 — user-selectable bypass of the Android rotation lock. Default ON:
  // laying the phone on the table just works, or one tap respects the OS lock.
  const [bypassOsRotationLock, setBypassOsRotationLock] = useState(() => {
    try {
      return window.localStorage.getItem("voleyos_bypass_os_rotation_lock") !== "0";
    } catch {
      return true;
    }
  });
  const bypassRef = useRef(bypassOsRotationLock);
  useEffect(() => {
    bypassRef.current = bypassOsRotationLock;
    try {
      window.localStorage.setItem("voleyos_bypass_os_rotation_lock", bypassOsRotationLock ? "1" : "0");
    } catch {
      // storage full or blocked: keep the in-memory choice
    }
    if (!isTableLandscapeMode) {
      (window as VosBridgeWindow).VoleyOSBridge?.setSensorAutoRotateMode?.(
        bypassOsRotationLock ? "bypass_os_lock" : "respect_os_lock",
      );
    }
  }, [bypassOsRotationLock, isTableLandscapeMode]);

  const toggleBypassOsRotationLock = (): void => {
    setBypassOsRotationLock((previous) => !previous);
    triggerCourtHaptics(12);
  };

  const enterTableMode = (): void => {
    tableManualRef.current = true;
    setLandscapeDismissed(true);
    setIsTableLandscapeMode(true);
    (window as VosBridgeWindow).VoleyOSBridge?.setTableLandscapeLock?.(true);
    triggerCourtHaptics([20, 15, 20]);
  };

  const exitTableMode = (): void => {
    tableManualRef.current = false;
    setIsTableLandscapeMode(false);
    (window as VosBridgeWindow).VoleyOSBridge?.setTableLandscapeLock?.(false);
    triggerCourtHaptics(12);
  };

  // Auto arm/disarm on rotation: horizontal + short viewport = phone on the
  // table; back to portrait always leaves the mode and re-arms detection.
  useEffect(() => {
    const sync = (): void => {
      if (window.innerHeight > window.innerWidth) {
        if (!tableManualRef.current) setIsTableLandscapeMode(false);
        setLandscapeDismissed(false);
        return;
      }
      // v11.0.2 — when the user chose to respect the OS lock and auto-rotate is
      // disabled system-wide, only the 📱 Modo Mesa button may enter the mode.
      if (!bypassRef.current) {
        const sysRotate = (window as VosBridgeWindow).VoleyOSBridge?.isSystemAutoRotateEnabled?.() ?? true;
        if (!sysRotate) return;
      }
      if (window.innerHeight <= 560 && !landscapeDismissed) setIsTableLandscapeMode(true);
    };
    if (!tableModeBootstrappedRef.current) {
      tableModeBootstrappedRef.current = true;
      sync();
    }
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [landscapeDismissed]);

  // Android Back / Escape leave Modo Mesa instead of the app.
  useEffect(() => {
    const target = window as VosBridgeWindow;
    if (!isTableLandscapeMode) return;
    const previous = target.__vosHandleAndroidBack;
    target.__vosHandleAndroidBack = () => {
      exitTableMode();
      return "handled";
    };
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      exitTableMode();
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
      if (target.__vosHandleAndroidBack) target.__vosHandleAndroidBack = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTableLandscapeMode]);

  // v11.2.1 — Modo Mesa tells the hub to hide its top header and bottom nav.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("voleyos-immersive-mode", { detail: { active: isTableLandscapeMode } }));
    return () => {
      window.dispatchEvent(new CustomEvent("voleyos-immersive-mode", { detail: { active: false } }));
    };
  }, [isTableLandscapeMode]);

  const tableHalves = [
    { key: "left", side: leftSide, data: left },
    { key: "right", side: rightSide, data: right },
  ] as const;

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
      <div className={`mb-2 flex flex-wrap items-center gap-1${focusMode ? " hidden" : ""}`} data-testid="cancha-topbar">
        <span
          data-testid="set-badge"
          className="rounded-full border border-volt/40 bg-volt/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-volt"
        >
          SET {currentSet} · {t(locale, `Meta: ${setTarget} pts`, `Target: ${setTarget} pts`, `Meta: ${setTarget} pts`)} ·{" "}
          {state.goldenPoint
            ? t(locale, "Punto de oro", "Golden point", "Ponto de ouro")
            : t(locale, "Dif de 2", "Win by 2", "Dif de 2")}
        </span>
        <button
          type="button"
          data-testid="reset-match-btn"
          onClick={resetMatch}
          className="rounded-lg border border-crimson/60 bg-crimson/20 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-crimson/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
        >
          🔄 {t(locale, "Nuevo Partido (0-0)", "New Match (0-0)", "Nova Partida (0-0)")}
        </button>
        <button
          type="button"
          data-testid="reset-set-btn"
          onClick={resetSet}
          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/80 transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
        >
          ↺ {t(locale, "Reiniciar Set", "Reset Set", "Reiniciar Set")}
        </button>
        <button
          type="button"
          data-testid="copy-match-summary-btn"
          onClick={() => {
            const setHistoryText = (state.setHistory ?? []).map((entry) => `${entry.scoreA}-${entry.scoreB}`).join(" | ");
            const summary = `🏐 VoleyOS | ${left.name} ${left.sets} - ${right.sets} ${right.name} (${setHistoryText || "0-0"} | Set actual: ${state.scoreA}-${state.scoreB})`;
            void navigator.clipboard?.writeText(summary).catch(() => undefined);
            triggerCourtHaptics(12);
            setMessage(t(locale, "📋 Resumen copiado.", "📋 Match summary copied.", "📋 Resumo copiado."));
          }}
          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/80 transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
        >
          📋 {t(locale, "Copiar Resumen", "Copy Summary", "Copiar Resumo")}
        </button>
        <button
          type="button"
          data-testid="export-match-sheet-btn"
          aria-pressed={sheetOpen}
          onClick={() => {
            setSheetOpen((current) => !current);
            triggerCourtHaptics(12);
          }}
          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/80 transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
        >
          📄 {t(locale, "Planilla / Acta Oficial", "Official Match Sheet", "Súmula Oficial")}
        </button>
        <span
          data-testid="pc-shortcuts-hint"
          className="hidden rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/45 lg:inline-block"
        >
          ⌨️{" "}
          {t(
            locale,
            "Atajos PC: [A] +1 Izq · [L] +1 Der · [Z] Deshacer · [M] Mesa",
            "PC keys: [A] +1 Left · [L] +1 Right · [Z] Undo · [M] Table",
            "Atalhos PC: [A] +1 Esq · [L] +1 Dir · [Z] Desfazer · [M] Mesa",
          )}
        </span>
        <button
          type="button"
          data-testid="focus-mode-toggle"
          aria-pressed={focusMode}
          onClick={() => {
            setFocusMode((previous) => !previous);
            triggerCourtHaptics(10);
          }}
          className={BTN}
        >
          🎯 {t(locale, "Modo Concentración", "Focus Mode", "Modo Foco")}
        </button>
        <button
          type="button"
          data-testid="score-edit-open"
          aria-expanded={editingScore !== null}
          className={BTN}
          onClick={toggleScoreEditor}
        >
          ✏️ {t(locale, "Editar Puntos / Sets", "Edit Points / Sets", "Editar Pontos / Sets")}
        </button>
        <button
          type="button"
          data-testid="os-rotation-bypass-toggle"
          aria-pressed={bypassOsRotationLock}
          className={BTN}
          onClick={toggleBypassOsRotationLock}
        >
          {bypassOsRotationLock
            ? `🔓 ${t(locale, "Giro Libre (Saltar Lock Android)", "Free Rotation (Bypass Android Lock)", "Giro Livre (Pular Lock Android)")}`
            : `🔒 ${t(locale, "Respetar Lock del Celu", "Respect Phone Lock", "Respeitar Lock do Celular")}`}
        </button>
      </div>
      {sheetOpen ? (
        <div data-testid="official-match-sheet-card" className="mb-2 rounded-xl border border-volt/40 bg-obsidian/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-volt">
            📄 {t(locale, "Planilla / Acta Oficial", "Official Match Sheet", "Súmula Oficial")}
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/85">
{buildMatchSheetText(state, locale, statsA, statsB, sideOutPct("A"), sideOutPct("B"))}
          </pre>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(buildMatchSheetText(state, locale, statsA, statsB, sideOutPct("A"), sideOutPct("B"))).catch(() => undefined);
                triggerCourtHaptics(12);
                setMessage(t(locale, "📋 Acta copiada.", "📋 Match sheet copied.", "📋 Súmula copiada."));
              }}
              className={BTN}
            >
              📋 {t(locale, "Copiar Acta", "Copy Sheet", "Copiar Súmula")}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const blob = new Blob([buildMatchSheetText(state, locale, statsA, statsB, sideOutPct("A"), sideOutPct("B"))], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = `acta-${state.teamA}-${state.teamB}.txt`.replace(/\s+/g, "_");
                  anchor.click();
                  URL.revokeObjectURL(url);
                } catch {
                  /* download blocked: the copy button still works */
                }
                setMessage(t(locale, "📤 Acta descargada.", "📤 Match sheet downloaded.", "📤 Súmula baixada."));
              }}
              className={BTN}
            >
              ⬇️ {t(locale, "Descargar .TXT", "Download .TXT", "Baixar .TXT")}
            </button>
          </div>
        </div>
      ) : null}
      {uiMode === "pro" ? (
        <div className="mb-2 flex flex-wrap gap-1">
          <button type="button" onClick={() => startPicadito()} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "picadito" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>⚡ {t(locale, "Picadito", "Pickup", "Rachinha")}</button>
          <button type="button" onClick={() => setPreset("king")} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "king" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>👑 {t(locale, "Ganador en cancha", "Winner stays", "Vencedor fica")}</button>
          <button type="button" onClick={() => { setPreset("oficial"); setKing(null); }} className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${preset === "oficial" ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>🏆 {t(locale, "Oficial", "Official", "Oficial")}</button>
        </div>
      ) : null}
      <div
        data-testid="inline-live-metrics-strip"
        className={`mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/60 tabular-nums${focusMode ? " hidden" : ""}`}
      >
        <span className="text-volt">📊</span>
        <span>K1 {fmtPct(statsA.k1Pct)}</span>
        <span>K2 {fmtPct(statsA.k2Pct)}</span>
        <span>SO {fmtPct(sideOutPct("A"))}</span>
        <span>{t(locale, "Efic.", "Eff.", "Efic.")} {fmtPct(statsA.efficiency)}</span>
        <span className="text-crimson">
          B: K1 {fmtPct(statsB.k1Pct)} · SO {fmtPct(sideOutPct("B"))}
        </span>
      </div>
      <div className={`mb-2${focusMode ? " hidden" : ""}`}>
        <button
          type="button"
          data-testid="inline-rules-drawer-btn"
          aria-expanded={rulesOpen}
          onClick={() => {
            setRulesOpen((previous) => !previous);
            triggerCourtHaptics(8);
          }}
          className={BTN}
        >
          ⚖️ {t(locale, "El Juez — Consulta Reglamento", "El Juez — Rules Check", "O Juiz — Consulta Regras")}
        </button>
        {rulesOpen ? (
          <div
            data-testid="inline-rules-drawer"
            className="mt-1 rounded-xl border border-volt/40 bg-volt/5 p-2 text-[10px] leading-relaxed text-white/70"
          >
            <strong className="text-volt">{t(locale, "Reglamento exprés", "Express rules", "Regras expressas")}</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>{t(locale, "Máximo 3 toques por equipo; el bloqueo no cuenta.", "Max 3 team contacts; the block does not count.", "Máximo 3 toques por equipe; o bloqueio não conta.")}</li>
              <li>{t(locale, "Doble toque / levantamiento llevado = falta.", "Double contact / lifted set = fault.", "Duplo toque / levantamento carregado = falta.")}</li>
              <li>{t(locale, "Líbero: no ataca, no bloquea, no saca (FIVB 2022+ sí puede sacar).", "Libero: no attack, no block, no serve (FIVB 2022+ may serve).", "Líbero: não ataca, não bloqueia, não sacava (FIVB 2022+ pode sacar).")}</li>
              <li>{t(locale, "Sancciones: amonestación (amarilla) → expulsión (roja) → descalificación (roja y amarilla juntas).", "Sanctions: warning (yellow) → expulsion (red) → disqualification (yellow+red).", "Sanções: advertência (amarela) → expulsão (vermelha) → desqualificação.")}</li>
              <li>{t(locale, "Invasión bajo la red solo falta si interfiere la jugada.", "Under-net invasion only faults when play is interfered.", "Invasão sob a rede só falta se interferir a jogada.")}</li>
            </ul>
          </div>
        ) : null}
      </div>
      {matchDone && preset !== "king" ? (
        continuousSets ? (
          <div data-testid="set-won-banner" className="mb-2 rounded-xl border border-volt/50 bg-volt/10 p-3 text-center">
            <p className="text-sm font-black text-volt">
              🎉 {t(locale, `¡Set ganado! ${state.setsA}-${state.setsB}`, `Set won! ${state.setsA}-${state.setsB}`, `Set ganho! ${state.setsA}-${state.setsB}`)}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                data-testid="next-set-btn"
                onClick={followNextSet}
                className="rounded-lg bg-volt px-3 py-2 text-xs font-black uppercase tracking-wider text-obsidian transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
              >
                ▶️ {t(locale, "Seguir Próximo Set", "Continue Next Set", "Seguir Próximo Set")}
              </button>
              <button
                type="button"
                data-testid="banner-new-match-btn"
                onClick={brandNewMatch}
                className={BTN}
              >
                🔄 {t(locale, "Nuevo Partido 0-0", "New Match 0-0", "Nova Partida 0-0")}
              </button>
            </div>
          </div>
        ) : (
          <div data-testid="match-winner-banner" className="mb-2 rounded-xl border border-crimson/60 bg-crimson/10 p-3 text-center">
            <p className="text-base font-black text-white">
              🏆 {state.winner === "A" ? state.teamA : state.teamB} · {state.setsA}-{state.setsB}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                data-testid="rematch-btn"
                onClick={resetMatch}
                className="rounded-lg bg-crimson px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-imperial focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
              >
                🔄 {t(locale, "Jugar Revancha (0-0, mismos equipos)", "Rematch (0-0, same teams)", "Revanche (0-0, mesmos times)")}
              </button>
              <button
                type="button"
                data-testid="banner-new-match-btn"
                onClick={brandNewMatch}
                className={BTN}
              >
                🆕 {t(locale, "Nuevo Partido (Limpiar todo)", "New Match (Clear all)", "Nova Partida (Limpar tudo)")}
              </button>
              <button
                type="button"
                data-testid="banner-undo-btn"
                onClick={() => {
                  undo();
                  setBurst(null);
                }}
                className={BTN}
              >
                ↶ {t(locale, "Deshacer último punto (Seguir jugando)", "Undo last point (Keep playing)", "Desfazer último ponto (Continuar)")}
              </button>
            </div>
          </div>
        )
      ) : null}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/40">
          🏐 {t(locale, "Cancha en Vivo", "Live Court", "Quadra ao Vivo")}
        </span>
        <button
          type="button"
          data-testid="clean-court-toggle"
          aria-pressed={cleanCourt}
          onClick={toggleCleanCourt}
          className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${cleanCourt ? "border-volt/60 bg-volt/10 text-volt" : "border-white/15 bg-white/5 text-white/60"}`}
        >
          {cleanCourt
            ? t(locale, "✨ Vista Limpia", "✨ Clean View", "✨ Vista Limpa")
            : t(locale, "🎛️ Vista Completa", "🎛️ Full View", "🎛️ Vista Completa")}
        </button>
      </div>
      <div data-testid="score-card" data-hardware-volume-score={hardwareMode ? "true" : "false"} className={`vos-score-arena relative rounded-xl${sunMode ? " vos-sun" : ""}${oledDim ? " vos-oled-dim" : ""}`}>
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
      >        🔒 {t(locale, "Modo Partido (botones de volumen)", "Match mode (volume keys)", "Modo Partida (botões de volume)")}
      </button>
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          data-testid="solo-teams-toggle"
          aria-pressed={soloTeams}
          onClick={toggleSoloTeams}
          className={`${BTN} flex-1 ${soloTeams ? "border-volt text-volt" : ""}`}
        >
          {soloTeams ? "🏐 " : "👥 "}
          {soloTeams
            ? t(locale, "Solo Equipos", "Team-only view", "Só Equipes")
            : t(locale, "Con Rotación 6 en Cancha", "With 6-player rotation", "Com Rotação 6 em Quadra")}
          : {soloTeams ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          data-testid="ui-mode-toggle"
          aria-pressed={uiMode === "simple"}
          onClick={toggleUiMode}
          className={`${BTN} flex-1 ${uiMode === "simple" ? "border-volt text-volt" : ""}`}
        >
          {uiMode === "simple"
            ? `⚡ ${t(locale, "Modo Simple", "Simple mode", "Modo Simples")}`
            : `🛠️ ${t(locale, "Modo Pro", "Pro mode", "Modo Pro")}`}
        </button>
      </div>
      <div className={`rounded-xl border border-white/10 bg-obsidian/80 p-3 ${flashSwap ? " vos-flash" : ""}`}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
          <span data-testid="set-indicator">SET {currentSet} / {state.bestOf} {state.matchFormat === "short15" ? "(15)" : currentSet === state.bestOf || state.isDecider ? "(15 TB)" : "(25)"}</span>
          <span>{state.status === "finished" ? "FINAL" : `${state.streak} ${t(locale, "en racha", "run", "em sequência")}`}</span>
        </div>
        <div className="vos-oled-keep mt-2 grid grid-cols-2 gap-2 text-center">
          <div data-side-color={left.color} className={`rounded-lg py-2 ${leftServing ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`} style={{ border: "1px solid rgba(255,255,255,0.18)", color: "#F8FAFC" }}>
            <button
              type="button"
              data-testid={`serve-badge-${leftSide.toLowerCase()}`}
              aria-pressed={leftServing}
              onClick={() => setServe(leftServing ? rightSide : leftSide)}
              className={`mx-auto mb-0.5 block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition ${leftServing ? "bg-crimson text-white" : "bg-white/10 text-white/50 hover:text-white"}`}
            >
              🏐 {leftServing ? t(locale, "SACA", "SERVES", "SAQUE") : t(locale, "SACAR", "SERVE", "SACAR")}
            </button>
            <p className="truncate text-xs font-bold">{left.name}</p>
            <p data-testid={swapped ? "score-b" : "score-a"} className="text-5xl font-black tabular-nums" style={{ color: "#FFFFFF" }}>{left.score}</p>
            <p className="text-[10px] text-volt">Sets {left.sets}</p>
          </div>
          <div data-side-color={right.color} className={`rounded-lg py-2 ${rightServing ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`} style={{ border: "1px solid rgba(255,255,255,0.18)", color: "#F8FAFC" }}>
            <button
              type="button"
              data-testid={`serve-badge-${rightSide.toLowerCase()}`}
              aria-pressed={rightServing}
              onClick={() => setServe(rightServing ? leftSide : rightSide)}
              className={`mx-auto mb-0.5 block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition ${rightServing ? "bg-crimson text-white" : "bg-white/10 text-white/50 hover:text-white"}`}
            >
              🏐 {rightServing ? t(locale, "SACA", "SERVES", "SAQUE") : t(locale, "SACAR", "SERVE", "SACAR")}
            </button>
            <p className="truncate text-xs font-bold">{right.name}</p>
            <p data-testid={swapped ? "score-a" : "score-b"} className="text-5xl font-black tabular-nums" style={{ color: "#FFFFFF" }}>{right.score}</p>
            <p className="text-[10px] text-volt">Sets {right.sets}</p>
          </div>
        </div>
        <div data-vos-secondary="team-edit" className="mt-2 flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            data-testid="team-edit-open"
            aria-expanded={editingTeams}
            className={BTN}
            onClick={() => (editingTeams ? setEditingTeams(false) : openTeamEditor())}
          >
            🏷️ {t(locale, "Equipos", "Teams", "Times")}
          </button>
        </div>
        {editingScore !== null ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              data-testid="score-edit-a"
              type="number"
              min={0}
              max={99}
              value={scoreDraft.a}
              aria-label={t(locale, "Ajustar tantos de Equipo A", "Adjust Team A points", "Ajustar pontos do Time A")}
              onChange={(event) => setScoreDraft((draft) => ({ ...draft, a: event.target.value }))}
              onBlur={(event) => editScoreTo("A", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-center text-sm font-bold"
            />
            <input
              data-testid="score-edit-b"
              type="number"
              min={0}
              max={99}
              value={scoreDraft.b}
              aria-label={t(locale, "Ajustar tantos de Equipo B", "Adjust Team B points", "Ajustar pontos do Time B")}
              onChange={(event) => setScoreDraft((draft) => ({ ...draft, b: event.target.value }))}
              onBlur={(event) => editScoreTo("B", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-center text-sm font-bold"
            />
            <input
              data-testid="sets-edit-a"
              type="number"
              min={0}
              max={9}
              value={scoreDraft.sa}
              aria-label={t(locale, "Ajustar Sets de Equipo A", "Adjust Team A sets", "Ajustar Sets do Time A")}
              onChange={(event) => setScoreDraft((draft) => ({ ...draft, sa: event.target.value }))}
              onBlur={(event) => editSetsTo("A", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-center text-sm font-bold"
            />
            <input
              data-testid="sets-edit-b"
              type="number"
              min={0}
              max={9}
              value={scoreDraft.sb}
              aria-label={t(locale, "Ajustar Sets de Equipo B", "Adjust Team B sets", "Ajustar Sets do Time B")}
              onChange={(event) => setScoreDraft((draft) => ({ ...draft, sb: event.target.value }))}
              onBlur={(event) => editSetsTo("B", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-center text-sm font-bold"
            />
            <button type="button" data-testid="score-edit-apply" className={`${BTN} col-span-2 border-volt text-volt`} onClick={applyManualScore}>
              ✓ {t(locale, "Aplicar", "Apply", "Aplicar")}
            </button>
            <button type="button" data-testid="score-edit-done" className={`${BTN} col-span-2`} onClick={() => setEditingScore(null)}>
              ✕ {t(locale, "Cerrar", "Close", "Fechar")}
            </button>
          </div>
        ) : null}
        {editingTeams ? (
          <div className="mt-2 space-y-1">
            <input
              data-testid="team-edit-a"
              value={teamDraft.a}
              aria-label={t(locale, "Nombre del Equipo A", "Team A name", "Nome do Time A")}
              onChange={(event) => setTeamDraft((draft) => ({ ...draft, a: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[12px]"
            />
            <div className="flex flex-wrap gap-1" data-testid="faculty-chips-a">
              {(["Ingeniería", "Exactas", "Económicas", "Salud", "Humanidades", "Naturales", "Equipo A", "Equipo B"] as const).map((name) => (
                <button
                  key={`fa-${name}`}
                  type="button"
                  data-testid={`faculty-a-${name}`}
                  onClick={() => applyFaculty("A", name)}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/70"
                >
                  {name}
                </button>
              ))}
            </div>
            <input
              data-testid="team-edit-b"
              value={teamDraft.b}
              aria-label={t(locale, "Nombre del Equipo B", "Team B name", "Nome do Time B")}
              onChange={(event) => setTeamDraft((draft) => ({ ...draft, b: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[12px]"
            />
            <div className="flex flex-wrap gap-1" data-testid="faculty-chips-b">
              {(["Ingeniería", "Exactas", "Económicas", "Salud", "Humanidades", "Naturales", "Equipo A", "Equipo B"] as const).map((name) => (
                <button
                  key={`fb-${name}`}
                  type="button"
                  data-testid={`faculty-b-${name}`}
                  onClick={() => applyFaculty("B", name)}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-white/70"
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-white/50">
              <label className="flex items-center gap-1">
                {t(locale, "Color A", "Color A", "Cor A")}
                <input
                  data-testid="team-color-a"
                  type="color"
                  aria-label={t(locale, "Color del Equipo A", "Team A color", "Cor do Time A")}
                  value={state.colorA ?? "#e11d48"}
                  onChange={(event) =>
                    setHistory((previous) => commitScoreboard(previous, { ...previous.present, colorA: event.target.value }))
                  }
                />
              </label>
              <label className="flex items-center gap-1">
                {t(locale, "Color B", "Color B", "Cor B")}
                <input
                  data-testid="team-color-b"
                  type="color"
                  aria-label={t(locale, "Color del Equipo B", "Team B color", "Cor do Time B")}
                  value={state.colorB ?? "#3b82f6"}
                  onChange={(event) =>
                    setHistory((previous) => commitScoreboard(previous, { ...previous.present, colorB: event.target.value }))
                  }
                />
              </label>
            </div>
            <button type="button" data-testid="team-edit-save" className={`${BTN} w-full`} onClick={commitTeamDraft}>
              ✓ {t(locale, "Guardar nombres", "Save names", "Salvar nomes")}
            </button>
          </div>
        ) : null}
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
          <button type="button" className={BTN_PRIMARY} onClick={() => point(leftSide)}>+ {left.name} [A]</button>
          <button type="button" className={BTN_PRIMARY} onClick={() => point(rightSide)}>+ {right.name} [L]</button>
        </div>
        <div className="mt-1 flex justify-center gap-2">
          <button type="button" data-testid="minus-left" className={`${BTN} text-[10px]`} onClick={() => subtractPoint(leftSide)}>
            −1 {left.name}
          </button>
          <button type="button" data-testid="minus-right" className={`${BTN} text-[10px]`} onClick={() => subtractPoint(rightSide)}>
            −1 {right.name}
          </button>
        </div>
        <div data-vos-secondary="audio-cluster" className="mt-2 flex flex-wrap justify-center gap-1">
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
            data-testid="sound-crowd"
            className={crowdOn ? `${BTN} border-emerald text-emerald` : BTN}
          >
            🔉 {t(locale, "Público", "Crowd", "Torcida")}: {crowdOn ? "ON" : "OFF"}
          </button>
          <button type="button" className={BTN} onClick={undo} disabled={history.past.length === 0}>[Z] {t(locale, "Deshacer", "Undo", "Desfazer")} ({history.past.length})</button>
          <button type="button" className={BTN} onClick={redo} disabled={history.future.length === 0}>[Y] {t(locale, "Rehacer", "Redo", "Refazer")}</button>
          <button type="button" data-testid="sound-whistle" className={BTN} onClick={() => playWhistle("short")}>[W] 😗 {t(locale, "Silbato", "Whistle", "Apito")}</button>
          <button type="button" data-testid="sound-whistle-double" className={BTN} onClick={() => playWhistle("double")}>[W] 😗😗 {t(locale, "Silbato doble", "Double whistle", "Apito duplo")}</button>
          <button type="button" data-testid="sound-buzzer" className={BTN} onClick={() => playBuzzer()}>[B] 🚨 {t(locale, "Chicharra", "Buzzer", "Buzina")}</button>
          <button type="button" className={BTN} onClick={() => {
            const next = !document.documentElement.classList.contains("high-contrast");
            document.documentElement.classList.toggle("high-contrast", next);
            window.localStorage.setItem("volleyos.contrast", next ? "1" : "0");
          }}>[C] {t(locale, "Contraste", "Contrast", "Contraste")}</button>
          <button
            type="button"
            data-testid="sound-pass"
            className={BTN}
            onClick={() => {
              const whistled = playWhistle("short");
              // v11.0.3 — PROBAR VOZ always speaks: auto-enable the shared TTS switch.
              if (!voiceOn) {
                setVoiceOn(true);
                persistTtsEnabled(true);
              }
              const spoken = announceScoreTTS(
                `${state.scoreA} a ${state.scoreB}`,
                true,
                locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES",
              );
              setMessage(
                whistled || spoken
                  ? t(locale, "🔊 Audio listo en este dispositivo.", "🔊 Audio ready on this device.", "🔊 Áudio pronto neste dispositivo.")
                  : t(locale, "🔇 Sin audio en este dispositivo.", "🔇 No audio on this device.", "🔇 Sem áudio neste dispositivo."),
              );
            }}
          >
            🔊 {t(locale, "Probar Voz", "Test Voice", "Testar Voz")}
          </button>
          <button
            type="button"
            data-testid="live-cast-open"
            className={BTN}
            onClick={() => setCastOpen(true)}
          >
            📡 {t(locale, "Transmitir en Vivo (QR)", "Broadcast Live (QR)", "Transmitir ao Vivo (QR)")}
            {castActive ? (
              <span data-testid="live-badge" className="ml-1.5 animate-pulse text-crimson">
                🔴 EN VIVO
              </span>
            ) : null}
          </button>
          <button
            type="button"
            data-testid="whatsapp-pulse"
            className={BTN}
            onClick={() => {
              void (async () => {
                try {
                  seqRef.current += 1;
                  const castMode: CastMode = state.matchFormat === "short15" ? "picadito" : "oficial";
                  const packet = await buildPacket(state, {
                    roomId: roomRef.current,
                    seq: seqRef.current,
                    mode: castMode,
                    hostSecret: secretRef.current,
                    homeColor: state.colorA,
                    awayColor: state.colorB,
                  });
                  const text = await encodeWhatsAppFreePulse(packet);
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
                  setMessage(t(locale, "📲 Pulso enviado al grupo de WhatsApp.", "📲 Pulse sent to the WhatsApp group.", "📲 Pulso enviado ao grupo do WhatsApp."));
                } catch {
                  setMessage(t(locale, "❌ No se pudo armar el pulso WhatsApp.", "❌ Could not build the WhatsApp pulse.", "❌ Não foi possível montar o pulso do WhatsApp."));
                }
              })();
            }}
          >
            💬 {t(locale, "Pulso WhatsApp Gratis", "Free WhatsApp Pulse", "Pulso WhatsApp Grátis")}
          </button>
          <button
            type="button"
            data-testid="volume-scoring-toggle"
            aria-pressed={volumeScoring}
            onClick={toggleVolumeScoring}
            className={volumeScoring ? `${BTN} border-volt text-volt` : BTN}
          >
            🔊 {t(locale, "Sumar con Botones de Volumen", "Score with Volume Buttons", "Somar com Botões de Volume")}: {volumeScoring ? "[ON 🏐]" : "[OFF 🔈]"}
          </button>
          <button
            type="button"
            data-testid="pocket-lock-toggle"
            aria-pressed={pocketLock}
            onClick={togglePocketLock}
            className={pocketLock ? `${BTN} border-volt text-volt` : BTN}
          >
            🔒 {t(locale, "Bolsillo", "Pocket", "Bolso")}: {pocketLock ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            data-testid="sun-mode-toggle"
            aria-pressed={sunMode}
            onClick={toggleSunMode}
            className={sunMode ? `${BTN} border-amber-300 text-amber-200` : BTN}
          >
            ☀️ {t(locale, "Modo Sol", "Sun Mode", "Modo Sol")}: {sunMode ? "ON" : "OFF"}
          </button>
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
      {ttsToast ? (
        <p
          data-testid="tts-announcer-toast"
          role="status"
          className="mt-1 rounded-lg border border-volt/60 bg-volt/15 px-2 py-1 text-center text-[11px] font-black text-volt"
        >
          {ttsToast}
        </p>
      ) : null}
      {coActor ? (
        <p data-testid="coadmin-badge" className="mt-1 rounded-lg border border-emerald/40 bg-emerald/10 px-2 py-1 text-center text-[11px] font-black text-emerald">
          ⚡ {t(locale, `Actualizado por ${coActor}`, `Updated by ${coActor}`, `Atualizado por ${coActor}`)}
        </p>
      ) : null}
      {scoutAlert && uiMode === "pro" && !soloTeams ? (
        <p
          data-testid="tactical-alert"
          className="mt-2 rounded-lg border border-crimson/50 bg-crimson/10 p-2 text-[11px] font-semibold leading-snug text-white"
        >
          {bleedingAlertMessage(scoutAlert, locale)}
        </p>
      ) : null}
      {uiMode === "pro" && !soloTeams ? (
      <button
        type="button"
        data-testid="box-score-toggle"
        aria-expanded={boxOpen}
        onClick={() => setBoxOpen((open) => !open)}
        className={`${BTN} mt-2 w-full`}
      >
        📊 {t(locale, "Box Score & Eficiencia por Rotación (R1–R6)", "Box Score & Rotation Efficiency (R1–R6)", "Box Score & Eficiência por Rotação (R1–R6)")} {boxOpen ? "▾" : "▸"}
      </button>
      ) : null}
      {boxOpen && uiMode === "pro" && !soloTeams ? (
        <div data-testid="box-score" className="mt-2 space-y-2 rounded-xl border border-white/10 bg-obsidian/80 p-2">
          {([["A", state.teamA], ["B", state.teamB]] as const).map(([side, teamName], index) => (
            <div key={side}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{teamName}</p>
              <div className="mt-1 grid grid-cols-6 gap-1 text-center text-[9px] font-bold uppercase text-white/40">
                <span>R</span>
                <span>K1</span>
                <span>K2</span>
                <span>{t(locale, "Efic.", "Eff", "Eficiência")}</span>
                <span>K/E</span>
                <span>AC/BL</span>
              </div>
              {(boxRows?.[index] ?? []).map((row) => (
                <div
                  key={row.rotation}
                  className="mt-1 grid grid-cols-6 gap-1 text-center text-[10px] font-semibold tabular-nums text-white/80"
                >
                  <span className={row.sideOutAttempts >= 3 && row.k1Pct < K1_BLEED_THRESHOLD ? "font-black text-crimson" : "text-white/50"}>
                    R{row.rotation}
                  </span>
                  <span>{row.k1Pct}%</span>
                  <span>{row.k2Pct}%</span>
                  <span>{row.efficiency}</span>
                  <span>{row.kills}/{row.errors}</span>
                  <span>{row.aces}/{row.blocks}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {uiMode === "pro" && !soloTeams ? (
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px]">
        {state.lineupA.map((player, index) => (
          <div key={`zone-${index + 1}`} className={`rounded ${index === 0 ? "bg-volt/20 text-volt" : "bg-white/5"}`}>
            <p className="text-white/40">Z{index + 1}</p>
            <p className="font-bold">#{player}</p>
          </div>
        ))}
      </div>
      ) : null}
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
        {pocketLock ? (
          <div data-testid="pocket-shield" className="absolute inset-0 z-40 grid place-items-center rounded-xl bg-obsidian/90 p-4 text-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-volt">
                🔒 {t(locale, "Modo Bolsillo activo", "Pocket mode on", "Modo Bolso ativo")}
              </p>
              <p className="mt-1 text-[10px] text-white/60">
                {t(locale, "Solo botones de volumen puntúan: Vol+ local · Vol- visita.", "Only volume keys score: Vol+ home · Vol- away.", "Só teclas de volume pontuam: Vol+ casa · Vol- visita.")}
              </p>
              <button
                type="button"
                data-testid="pocket-unlock"
                onPointerDown={() => {
                  if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
                  holdTimerRef.current = window.setTimeout(() => {
                    holdTimerRef.current = null;
                    setPocketLock(false);
                    window.localStorage.setItem("volleyos.pocketLock", "0");
                    setMessage(t(locale, "🔓 Bolsillo desbloqueado.", "Pocket unlocked.", "Bolso desbloqueado."));
                    triggerCourtHaptics([30, 30]);
                  }, 2000);
                }}
                onPointerUp={() => {
                  if (holdTimerRef.current) {
                    window.clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                }}
                onPointerLeave={() => {
                  if (holdTimerRef.current) {
                    window.clearTimeout(holdTimerRef.current);
                    holdTimerRef.current = null;
                  }
                }}
                className="tap mt-3 rounded-lg border border-volt/50 bg-volt/10 px-3 py-2 text-[10px] font-black text-volt"
              >
                🔓 {t(locale, "Mantener 2s para desbloquear", "Hold 2s to unlock", "Segure 2s para desbloquear")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {gymBoardOpen ? <GymScreenModule locale={locale} onClose={() => setGymBoardOpen(false)} /> : null}
      {cleanCourt ? (
        <style>{`
          ${setupDrawerOpen ? "" : '[data-testid="cancha-topbar"],[data-testid="inline-live-metrics-strip"],[data-testid="cancha-primary-dock"],[data-testid="inline-rules-drawer-btn"],[data-testid="inline-rules-drawer"],[data-vos-secondary="audio-cluster"],[data-vos-secondary="team-edit"]{display:none!important}'}
          ${scoutDrawerOpen ? "" : '[data-testid="dvw-courtside-console"],[data-testid="box-score-toggle"],[data-testid="box-score"],[data-testid="official-match-sheet-card"],[data-testid="tc-scout"]{display:none!important}'}
        `}</style>
      ) : null}
      <div data-testid="primary-court-toolbar" className="mb-2 flex flex-wrap gap-1">
        <button type="button" onClick={undo} className={BTN}>↩ {t(locale, "Deshacer", "Undo", "Desfazer")}</button>
        <button type="button" data-testid="primary-swap-btn" onClick={swapSides} className={BTN}>⇄ {t(locale, "Cambiar Lado", "Swap Sides", "Trocar Lado")}</button>
        <button type="button" data-testid="primary-whistle-btn" onClick={() => playCourtWhistle("double")} className={BTN}>📢 {t(locale, "Silbato", "Whistle", "Apito")}</button>
        <button
          type="button"
          data-testid="court-buzzer-btn"
          onClick={() => { playCourtTableBuzzer(); triggerCourtHaptics([20, 40, 20]); }}
          className={BTN}
        >
          🚨 {t(locale, "Chicharra", "Buzzer", "Buzina")}
        </button>
        <button
          type="button"
          data-testid="primary-voice-toggle"
          aria-pressed={voiceOn}
          onClick={toggleVoiceOn}
          className={voiceOn ? `${BTN} border-volt text-volt` : BTN}
        >
          🔊 {t(locale, "Voz", "Voice", "Voz")}: {voiceOn ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          data-testid="tts-test-btn"
          onClick={() => {
            const spoken = announceCourtVoice(
              t(
                locale,
                `Punto local. ${state.scoreA} a ${state.scoreB}`,
                `Home point, ${state.scoreA} to ${state.scoreB}`,
                `Ponto local, ${state.scoreA} a ${state.scoreB}`,
              ),
              locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES",
            );
            if (!voiceOn) {
              setVoiceOn(true);
              persistTtsEnabled(true);
            }
            setTtsTestFlash(true);
            window.setTimeout(() => setTtsTestFlash(false), 1800);
            setMessage(
              spoken
                ? t(locale, "▶ Prueba de voz enviada.", "▶ Voice test fired.", "▶ Teste de voz enviado.")
                : t(locale, "🔇 Sin voz en este dispositivo.", "🔇 No voice on this device.", "🔇 Sem voz neste dispositivo."),
            );
          }}
          className={BTN}
        >
          ▶ {t(locale, "Probar", "Test", "Testar")}
        </button>
        <button
          type="button"
          data-testid="primary-table-mode-btn"
          onClick={() => (isTableLandscapeMode ? exitTableMode() : enterTableMode())}
          className={BTN}
        >
          ⛶ {t(locale, "Modo Mesa", "Table Mode", "Modo Mesa")}
        </button>
        <button
          type="button"
          data-testid="primary-gym-btn"
          onClick={() => setGymBoardOpen(true)}
          className={BTN}
        >
          🖥️ {t(locale, "Pantalla Gigante", "Giant Gym Screen", "Tela Gigante")}
        </button>
      </div>
      {ttsTestFlash ? (
        <p data-testid="tts-test-flash" role="status" className="mb-2 rounded-lg border border-emerald/50 bg-emerald/10 px-2 py-1 text-center text-[10px] font-black text-emerald">
          ▶ {t(locale, "Voz de cancha activa", "Court voice live", "Voz de quadra ativa")}
        </p>
      ) : null}
      {cleanCourt ? (
        <div className="mb-2 flex flex-wrap gap-1">
          <button
            type="button"
            data-testid="drawer-rules-audio-btn"
            aria-expanded={setupDrawerOpen}
            onClick={() => setSetupDrawerOpen((previous) => !previous)}
            className={BTN}
          >
            ⚙️ {t(locale, "Opciones de Partido, Reglas y Audio", "Match Setup, Rules & Audio", "Opções de Partida, Regras e Áudio")}
          </button>
          <button
            type="button"
            data-testid="drawer-scout-sheet-btn"
            aria-expanded={scoutDrawerOpen}
            onClick={() => setScoutDrawerOpen((previous) => !previous)}
            className={BTN}
          >
            📊 {t(locale, "Scout, Rotación y Planilla", "Scout, Rotation & Sheet", "Scout, Rotação e Súmula")}
          </button>
        </div>
      ) : null}
      {/* v11.0.3 — in-flow primary dock: never floats over the scoreboard */}
      <nav
        data-testid="cancha-primary-dock"
        className="mb-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          width: "100%",
          padding: 8,
          borderRadius: 16,
          background: "rgba(15, 15, 22, 0.92)",
          border: "1px solid rgba(225, 29, 72, 0.28)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)",
        }}
      >
        <button
          type="button"
          data-testid="cancha-dock-undo"
          onClick={undo}
          className="rounded-xl border border-white/20 bg-white/5 text-white/85 transition hover:border-volt hover:text-volt active:translate-y-px"
          style={{ minHeight: 46, fontSize: "0.82rem", fontWeight: 800 }}
        >
          ↶ {t(locale, "Deshacer", "Undo", "Desfazer")}
        </button>
        <button
          type="button"
          data-testid="cancha-dock-audio"
          onClick={() => {
            playCourtWhistle("short");
            triggerCourtHaptics(10);
          }}
          className="rounded-xl border border-white/20 bg-white/5 text-white/85 transition hover:border-volt hover:text-volt active:translate-y-px"
          style={{ minHeight: 46, fontSize: "0.82rem", fontWeight: 800 }}
        >
          🔊 {t(locale, "Audio", "Audio", "Áudio")}
        </button>
        <button
          type="button"
          data-testid="enter-table-mode-btn"
          aria-pressed={isTableLandscapeMode}
          onClick={() => (isTableLandscapeMode ? exitTableMode() : enterTableMode())}
          className="rounded-xl transition hover:brightness-110 active:translate-y-px"
          style={{
            minHeight: 46,
            fontSize: "0.82rem",
            fontWeight: 800,
            border: `1px solid ${isTableLandscapeMode ? "#E11D48" : "rgba(234, 179, 8, 0.4)"}`,
            background: isTableLandscapeMode ? "rgba(225, 29, 72, 0.22)" : "rgba(234, 179, 8, 0.10)",
            color: isTableLandscapeMode ? "#FF1744" : "#EAB308",
          }}
        >
          📱 {t(locale, "Modo Mesa", "Table Mode", "Modo Mesa")}
        </button>
        <button
          type="button"
          data-testid="cancha-more-drawer-toggle"
          aria-expanded={moreOpen}
          onClick={() => {
            setMoreOpen((previous) => !previous);
            triggerCourtHaptics(8);
          }}
          className="rounded-xl border border-white/20 bg-white/5 text-white/85 transition hover:border-crimson hover:text-crimson active:translate-y-px"
          style={{ minHeight: 46, fontSize: "0.82rem", fontWeight: 800 }}
        >
          ⋯ {t(locale, "Partido", "Match", "Partida")}
        </button>
      </nav>

      {(uiMode === "pro" || (moreOpen && isUserProEntitled())) && !isTableLandscapeMode ? (
        <div className="vos-item-card mb-2 space-y-2" data-testid="dvw-courtside-console">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/60">
            ⌨️{" "}
            {t(
              locale,
              "Consola DataVolley / Courtside",
              "DataVolley / Courtside Console",
              "Console DataVolley / Courtside",
            )}
          </p>
          <div className="flex flex-wrap gap-1">
            <input
              data-testid="dvw-command-input"
              value={dvwCommand}
              onChange={(event) => setDvwCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                submitDvwCommand();
              }}
              placeholder={t(locale, "*14AT#42B2", "*14AT#42B2", "*14AT#42B2")}
              className="min-w-[170px] flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1 font-mono text-[11px] text-white focus:border-volt focus:outline-none"
            />
            <button type="button" data-testid="dvw-submit-btn" onClick={submitDvwCommand} className={BTN}>
              ↵ {t(locale, "Anotar", "Log", "Registrar")}
            </button>
          </div>
          <p
            data-testid="dvw-live-readback"
            className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
              dvwTranslation.valid ? "border-volt/50 bg-volt/10 text-volt" : "border-white/10 bg-white/5 text-white/50"
            }`}
          >
            {dvwTranslation.summary}
          </p>
          {dvwLatestIssue ? (
            <p
              data-testid="dvw-lint-warning"
              className="rounded-lg border border-crimson/60 bg-crimson/15 px-2 py-1 text-[11px] font-bold text-white"
            >
              ⚠️ {dvwLatestIssue.message}
            </p>
          ) : null}
          {dvwNotice ? (
            <p data-testid="dvw-notice" className="text-[11px] font-bold text-white/70">
              {dvwNotice}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              data-testid="dvw-import-btn"
              onClick={() => dvwFileRef.current?.click()}
              className={BTN}
            >
              📥 {t(locale, "Importar .DVW", "Import .DVW", "Importar .DVW")}
            </button>
            <button type="button" data-testid="dvw-export-btn" onClick={exportDvwFile} className={BTN}>
              📤 {t(locale, "Exportar .DVW", "Export .DVW", "Exportar .DVW")}
            </button>
            <button
              type="button"
              data-testid="dvw-load-demo-btn"
              onClick={() =>
                loadDvwText(
                  SAMPLE_DEMO_DVW,
                  t(locale, "🧪 Demo cargada", "🧪 Demo loaded", "🧪 Demo carregada"),
                )
              }
              className={BTN}
            >
              🧪 {t(locale, "Cargar Demo .DVW", "Load Demo .DVW", "Carregar Demo .DVW")}
            </button>
            <input
              ref={dvwFileRef}
              type="file"
              accept=".dvw,text/plain"
              className="hidden"
              data-testid="dvw-file-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file
                  .text()
                  .then((text) => loadDvwText(text, file.name))
                  .catch(() =>
                    setDvwNotice(t(locale, "No se pudo leer el archivo.", "Could not read the file.", "Não foi possível ler o arquivo.")),
                  );
              }}
            />
          </div>
        </div>
      ) : null}

      {uiMode === "pro" ? (
      <>
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
      </>
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
        {uiMode === "pro" ? (
          <button type="button" className={`${BTN} col-span-2`} onClick={() => setRosterOpen((open) => !open)}>
            {t(locale, "Administrar plantillas", "Manage rosters", "Gerenciar elencos")}
          </button>
        ) : null}
      </div>
      {rosterOpen && uiMode === "pro" ? (
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
          <p className="text-[9px] text-white/40">{t(locale, "Dorsal nombre rol (S OH MB OPP L) y C/L para capitán o líbero.", "Number name role (S OH MB OPP L), C/L for captain or libero.", "Número nome posição (S OH MB OPP L), C/L para capitão ou líbero.")}</p>
          <PlayerChips locale={locale} onPick={(name) => setRosterSheet((current) => (current ? `${current}
${name}` : name))} testId="cancha-player-chips" />
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
      {moreOpen ? (
        <div data-testid="cancha-more-drawer" className="mb-2 space-y-2">
          <section className="vos-item-card" data-testid="drawer-match-controls">
            <p className="vos-card-title">🛠️ {t(locale, "Control de Partido y Equipos", "Match & Team Control", "Controle de Partida e Equipes")}</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              data-testid="oled-theme-toggle"
              aria-pressed={oledMode}
              onClick={() => setOledMode((previous) => !previous)}
              className={BTN}
            >
              ⬛ {t(locale, "OLED", "OLED", "OLED")}
            </button>
            <button
              type="button"
              data-testid="auto-libero-toggle"
              aria-pressed={autoLiberoOn}
              onClick={() => setAutoLiberoOn((previous) => !previous)}
              className={BTN}
            >
              🦺 {t(locale, "Auto-Líbero", "Auto-Libero", "Auto-Líbero")}
            </button>
            <button
              type="button"
              data-testid="match-hub-toggle"
              aria-expanded={hubOpen}
              onClick={() => setHubOpen((previous) => !previous)}
              className={BTN}
            >
              🏁 {t(locale, "Cierre y 3er Tiempo", "Close & After-Match", "Encerramento e 3º tempo")}
            </button>
          </div>
          {/* Nivel 0 Puntos → Nivel 3 Consola Pro .DVW */}
          <div data-testid="scouting-depth-selector" className="flex flex-wrap items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/60">
            <span>{t(locale, "Profundidad de scout", "Scout depth", "Profundidade do scout")}:</span>
            {[
              t(locale, "N0 Puntos", "N0 Points", "N0 Pontos"),
              t(locale, "N1 Causa", "N1 Cause", "N1 Causa"),
              t(locale, "N2 Jugador+Acción", "N2 Player+Action", "N2 Jogador+Ação"),
              t(locale, "N3 Consola Pro", "N3 Pro Console", "N3 Console Pro"),
            ].map((label, level) => (
              <button
                key={level}
                type="button"
                data-testid={`scout-depth-${level}`}
                aria-pressed={scoutDepth === level}
                onClick={() => setScoutDepth(level)}
                className={`rounded-full border px-2 py-1 transition ${scoutDepth === level ? "border-volt bg-volt/15 text-volt" : "border-white/20 bg-white/5 text-white/70"}`}
              >
                {label}
              </button>
            ))}
          </div>
          </section>
          <section className="vos-item-card" data-testid="drawer-judge-and-bench">
            <p className="vos-card-title">⚖️ {t(locale, "El Juez y Rotador de Banco", "Referee & Bench Rotator", "O Juiz e Rodízio de Banco")}</p>
          <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[10px] text-white/70">
            <div className="flex flex-wrap items-center gap-1">
              <span className="font-bold uppercase tracking-wider text-white/60">{t(locale, "Rotación 5-1", "5-1 Rotation", "Rotação 5-1")}:</span>
              <span data-testid="fivb-overlap-status" className={`font-black ${demoOverlap.legal ? "text-emerald" : "text-crimson"}`}>
                {demoOverlap.legal
                  ? `✅ ${t(locale, "Rotación legal", "Legal rotation", "Rotação legal")}`
                  : `⚠️ ${demoOverlap.violations.join(" · ")}`}
              </span>
              <button
                type="button"
                data-testid="overlap-demo-swap-btn"
                onClick={() => setOverlapSwapped((previous) => !previous)}
                className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 font-black text-white/80"
              >
                🔄 {t(locale, "Simular invasión", "Demo swap", "Simular invasão")}
              </button>
            </div>
            <div data-testid="quick-triangular-generator" className="space-y-1">
              <p className="font-bold uppercase tracking-wider text-white/60">{t(locale, "Triangular / Cuadrangular FIVB", "FIVB Tri/Quad", "Triangular/Quadrangular FIVB")}</p>
              <textarea
                data-testid="triangular-results-input"
                rows={3}
                value={triText}
                onChange={(event) => setTriText(event.target.value)}
                placeholder={"Tiburones 25-20 25-18 Cóndores"}
                className="w-full rounded-lg border border-white/15 bg-obsidian/70 p-1 font-mono text-[10px] text-white/85"
              />
              <button
                type="button"
                data-testid="triangular-compute-btn"
                onClick={runTriangular}
                className="rounded-lg border border-volt/50 bg-volt/10 px-2 py-1 font-black text-volt"
              >
                🧮 {t(locale, "Calcular posiciones", "Compute standings", "Calcular posições")}
              </button>
              {triRows.length > 0 ? (
                <table data-testid="triangular-standings" className="w-full text-left font-mono text-[10px] text-white/85">
                  <thead>
                    <tr className="text-white/40">
                      <th>#</th><th>Eq</th><th>M</th><th>MP</th><th>S</th><th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {triRows.map((row, index) => (
                      <tr key={row.team}>
                        <td>{index + 1}</td>
                        <td>{row.team}</td>
                        <td>{row.matchesWon}</td>
                        <td>{row.matchPoints}</td>
                        <td>{row.setsWon}-{row.setsLost}</td>
                        <td>{row.pointsWon}-{row.pointsLost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="flex gap-1">
                <button
                  type="button"
                  data-testid="roster-qr-swap-btn"
                  onClick={copyRosterSwapCode}
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 font-black text-white/80"
                >
                  📋 {t(locale, "Copiar código de alineación", "Copy lineup code", "Copiar código de escalação")}
                </button>
                <button
                  type="button"
                  data-testid="roster-swap-apply-btn"
                  onClick={applyRosterSwapCode}
                  className="rounded-lg border border-volt/50 bg-volt/10 px-2 py-1 font-black text-volt"
                >
                  🔄 {t(locale, "Aplicar", "Apply", "Aplicar")}
                </button>
              </div>
              <textarea
                data-testid="roster-swap-input"
                rows={2}
                value={rosterSwapCode}
                onChange={(event) => setRosterSwapCode(event.target.value)}
                placeholder="4,3,2,1,5,6|4,3,2,1,5,6"
                className="w-full rounded-lg border border-white/15 bg-obsidian/70 p-1 font-mono text-[10px] text-white/85"
              />
            </div>
          </div>
          </section>
          <section className="vos-item-card" data-testid="drawer-scouting-and-diagnostics">
            <p className="vos-card-title">📊 {t(locale, "Scouting .DVW y Diagnóstico", "Scouting .DVW & Diagnostics", "Scouting .DVW e Diagnóstico")}</p>
          {/* 15-second timeout diagnostic: 1 problem + 2 evidences + 1 action, zero NaN */}
          <div data-testid="timeout-diagnostic-card" className="space-y-1 rounded-xl border p-2 text-[10px] text-white/80" style={{ borderColor: "rgba(225, 29, 72, 0.55)", background: "rgba(225, 29, 72, 0.10)", fontVariantNumeric: "tabular-nums" }}>
            <p className="font-black uppercase tracking-wider text-crimson">⏱️ {t(locale, "Sacada de 15s", "15s Timeout Card", "Sacada de 15s")}</p>
            <p>
              <strong>{t(locale, "Problema", "Problem", "Problema")}:</strong>{" "}
              {(statsA.efficiency <= statsB.efficiency ? statsA : statsB).efficiency === 0 && statsA.attempts === 0 && statsB.attempts === 0
                ? t(locale, "Sin datos de ataque todavía.", "No attack data yet.", "Sem dados de ataque ainda.")
                : t(
                    locale,
                    `Ataque de ${((statsA.efficiency <= statsB.efficiency ? statsA : statsB).kills === 0 && (statsA.efficiency <= statsB.efficiency ? statsA : statsB).attempts === 0 ? "" : "")}${
                      (statsA.efficiency <= statsB.efficiency ? "A" : "B") === "A" ? left.name : right.name
                    } con ${fmtPct((statsA.efficiency <= statsB.efficiency ? statsA : statsB).efficiency)} de eficacia`,
                    `Attack of ${(statsA.efficiency <= statsB.efficiency ? "A" : "B") === "A" ? left.name : right.name} at ${fmtPct((statsA.efficiency <= statsB.efficiency ? statsA : statsB).efficiency)} efficiency`,
                    `Ataque de ${(statsA.efficiency <= statsB.efficiency ? "A" : "B") === "A" ? left.name : right.name} com ${fmtPct((statsA.efficiency <= statsB.efficiency ? statsA : statsB).efficiency)} de eficácia`,
                  )}
            </p>
            <p>
              {t(locale, "Evidencias", "Evidences", "Evidências")}: K1 {fmtPct((statsA.efficiency <= statsB.efficiency ? statsA : statsB).k1Pct)} · K2 {fmtPct((statsA.efficiency <= statsB.efficiency ? statsA : statsB).k2Pct)} ·{" "}
              {t(locale, "Errores", "Errors", "Erros")} {(statsA.efficiency <= statsB.efficiency ? statsA : statsB).errors}
            </p>
            <p>
              <strong>{t(locale, "Acción", "Action", "Ação")}:</strong>{" "}
              {t(locale, "Subir la calidad del primer toque y repetitive el saque más atacado.", "Raise first-ball quality and repeat the best serve zone.", "Subir a qualidade da primeira bola e repetir o saque mais atacado.")}
            </p>
          </div>
          <div data-testid="three-match-keys-card" className="space-y-1 rounded-xl border p-2 text-[10px] text-white/80" style={{ borderColor: "rgba(245, 158, 11, 0.55)", background: "rgba(245, 158, 11, 0.08)", fontVariantNumeric: "tabular-nums" }}>
            <p className="font-black uppercase tracking-wider text-volt">🔑 {t(locale, "Las 3 Claves del Partido", "3 Match Keys", "As 3 Chaves da Partida")}</p>
            <ul className="list-decimal space-y-0.5 pl-4">
              <li>{t(locale, `K1 ${fmtPct(statsA.k1Pct)} · rival ${fmtPct(statsB.k1Pct)}`, `K1 ${fmtPct(statsA.k1Pct)} · rival ${fmtPct(statsB.k1Pct)}`, `K1 ${fmtPct(statsA.k1Pct)} · rival ${fmtPct(statsB.k1Pct)}`)}</li>
              <li>{t(locale, `Side-out ${fmtPct(sideOutPct("A"))} · rival ${fmtPct(sideOutPct("B"))}`, `Side-out ${fmtPct(sideOutPct("A"))} · rival ${fmtPct(sideOutPct("B"))}`, `Side-out ${fmtPct(sideOutPct("A"))} · rival ${fmtPct(sideOutPct("B"))}`)}</li>
              <li>{t(locale, `Efic. ataque ${fmtPct(statsA.efficiency)} · errores ${statsA.errors + statsB.errors}`, `Attack eff. ${fmtPct(statsA.efficiency)} · errors ${statsA.errors + statsB.errors}`, `Efic. ataque ${fmtPct(statsA.efficiency)} · erros ${statsA.errors + statsB.errors}`)}</li>
            </ul>
          </div>
          </section>
        </div>
      ) : null}
      {hubOpen ? (
        <section
          data-testid="end-of-match-hub"
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 space-y-2 rounded-2xl p-3 shadow-2xl"
          style={{ width: "min(94vw, 30rem)", background: "rgba(15, 15, 22, 0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(225, 29, 72, 0.28)", fontVariantNumeric: "tabular-nums" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-volt">🏁 {t(locale, "Cierre y 3er Tiempo", "Close & After-Match", "Encerramento e 3º tempo")}</h3>
            <button
              type="button"
              data-testid="close-end-of-match-hub"
              onClick={() => setHubOpen(false)}
              className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-black text-white/70"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              data-testid="copy-wa-summary-btn"
              onClick={copyWhatsAppSummary}
              className={BTN}
            >
              📋 {t(locale, "Copiar Resumen WhatsApp", "Copy WhatsApp Summary", "Copiar Resumo WhatsApp")}
            </button>
            <button
              type="button"
              data-testid="export-match-png-btn"
              onClick={() => void exportMatchCard()}
              className={BTN}
            >
              📸 {t(locale, "Tarjeta PNG (Stories)", "PNG Card (Stories)", "Cartão PNG (Stories)")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <input
              data-testid="mvp-vote-input"
              value={mvpVote}
              onChange={(event) => setMvpVote(event.target.value)}
              placeholder={t(locale, "MVP del partido", "Match MVP", "MVP da partida")}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-obsidian/70 px-2 py-1 text-[10px] text-white/85"
            />
            <button
              type="button"
              data-testid="vote-mvp-btn"
              onClick={applyVotes}
              className="rounded-lg border border-volt/50 bg-volt/10 px-2 py-1 font-black text-volt"
            >
              🏆 +5 MMR
            </button>
            <input
              data-testid="mufa-vote-input"
              value={mufaVote}
              onChange={(event) => setMufaVote(event.target.value)}
              placeholder={t(locale, "La Mufa", "The Jinx", "A Fúria")}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-obsidian/70 px-2 py-1 text-[10px] text-white/85"
            />
            <button
              type="button"
              data-testid="vote-mufa-btn"
              onClick={applyVotes}
              className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 font-black text-white/80"
            >
              🥶 −5 MMR
            </button>
          </div>
          <div data-testid="vaquita-debtors-ledger" className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">💸 {t(locale, "La Vaquita 2.0 — ledger", "La Vaquita 2.0 — ledger", "La Vaquita 2.0 — ledger")}</p>
            <div className="flex gap-1">
              <input
                data-testid="vaquita-alias-input"
                value={vaquitaAlias}
                onChange={(event) => setVaquitaAlias(event.target.value)}
                placeholder={t(locale, "Alias deudor", "Debtor alias", "Alias devedor")}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-obsidian/70 px-2 py-1 text-[10px] text-white/85"
              />
              <button
                type="button"
                data-testid="add-vaquita-debt-btn"
                onClick={() => {
                  if (!vaquitaAlias.trim()) return;
                  toggleVaquitaDebt(vaquitaAlias.trim(), false);
                  setVaquitaAlias("");
                }}
                className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 font-black text-white/80"
              >
                ⏳ {t(locale, "Debe", "Owes", "Deve")}
              </button>
            </div>
            <ul className="space-y-0.5">
              {vaquitaDebts.map((debt) => (
                <li key={debt.alias} className="flex items-center justify-between gap-1 text-[10px] text-white/70">
                  <span>{debt.paid ? "✅" : "⏳"} {debt.alias}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => toggleVaquitaDebt(debt.alias, !debt.paid)}
                      className="rounded border border-white/15 bg-white/5 px-1 text-white/70"
                    >
                      {debt.paid ? "↩" : "✅"}
                    </button>
                    <button
                      type="button"
                      data-testid="copy-debt-reminder-btn"
                      onClick={() => copyDebtReminder(debt.alias)}
                      className="rounded border border-white/15 bg-white/5 px-1 text-white/70"
                    >
                      📲
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <BenchRotator locale={locale} />
      {castOpen ? (
        <LiveCastModal
          locale={locale}
          state={state}
          roomId={roomRef.current}
          hostSecret={secretRef.current}
          accessMode={accessMode}
          onAccessModeChange={changeAccessMode}
          actorName={actorName}
          onActorNameChange={changeActorName}
          adminPin={adminPin}
          onClose={() => setCastOpen(false)}
          onActiveChange={setCastActive}
          onRelayChange={setCloudRelay}
        />
      ) : null}
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
      {scoutBar && uiMode === "pro" && !soloTeams ? (
        <div
          data-testid="micro-scout"
          className="fixed bottom-36 left-1/2 z-40 w-[min(94vw,26rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-obsidian/95 p-2 shadow-2xl backdrop-blur"
        >
          <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/50">
            <span>🥊 {t(locale, "Etiquetá el punto", "Tag the point", "Marque o ponto")}</span>
            <span className="text-volt">2.5s</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {SCOUT_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                data-testid={`scout-action-${action}`}
                onClick={() => {
                  setScout((previous) =>
                    tagLastScoutPoint(previous, {
                      action,
                      originZone: pendingZone?.originZone ?? null,
                      targetZone: pendingZone?.targetZone ?? null,
                      scorer: pendingScorer,
                    }),
                  );
                  flashScoutBar();
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold text-white transition hover:border-volt hover:text-volt"
              >
                {scoutActionLabel(action)}
              </button>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {ZONE_PRESETS.map((preset) => {
              const active = pendingZone?.originZone === preset.originZone && pendingZone?.targetZone === preset.targetZone;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`scout-zone-${preset.id}`}
                  onClick={() => {
                    setPendingZone({ originZone: preset.originZone, targetZone: preset.targetZone });
                    setScout((previous) =>
                      amendLastScoutTag(previous, { originZone: preset.originZone, targetZone: preset.targetZone }),
                    );
                    flashScoutBar();
                  }}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                    active ? "border border-volt bg-volt/15 text-volt" : "border border-white/15 bg-white/5 text-white/70"
                  }`}
                >
                  {scoutZoneLabel(preset.id)}
                </button>
              );
            })}
          </div>
          {scoutPlayers.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {scoutPlayers.map((player) => (
                <button
                  key={player.number}
                  type="button"
                  data-testid={`scout-scorer-${player.number}`}
                  onClick={() => {
                    setPendingScorer(player.name);
                    setScout((previous) => amendLastScoutTag(previous, { scorer: player.name }));
                    flashScoutBar();
                  }}
                  className={`rounded-full px-2 py-1 text-[9px] font-bold transition ${
                    pendingScorer === player.name
                      ? "border border-volt bg-volt/15 text-volt"
                      : "border border-white/15 bg-white/5 text-white/70"
                  }`}
                >
                  ☝ {player.name.split(" ")[0]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {uiMode === "pro" && !soloTeams && scoutDepth >= 2 ? (
        <div
          data-testid="quick-rally-tagger"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-2xl p-2 shadow-2xl"
          style={{
            width: "min(94vw, 26rem)",
            background: "rgba(15, 15, 22, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(225, 29, 72, 0.28)",
          }}
        >
          <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-white/50">
            <span>⚡ {t(locale, "Tag rápido → .DVW", "Quick tag → .DVW", "Tag rápido → .DVW")}</span>
            <select
              data-testid="tagger-jersey-select"
              value={taggerJersey}
              onChange={(event) => setTaggerJersey(Number(event.target.value))}
              className="rounded border border-white/15 bg-obsidian/70 px-1 py-0.5 text-[10px] font-black text-volt"
            >
              {Array.from({ length: 18 }, (_, index) => index + 1).map((number_) => (
                <option key={number_} value={number_}>
                  #{number_}
                </option>
              ))}
            </select>
          </div>
          <div
            data-testid="tagger-jersey-chips"
            className="flex gap-1 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
            onWheel={(event) => {
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY;
            }}
            onPointerDown={(event) => {
              jerseyDrag.current = { x: event.clientX, left: event.currentTarget.scrollLeft };
            }}
            onPointerMove={(event) => {
              if (jerseyDrag.current && event.buttons > 0) {
                event.currentTarget.scrollLeft = jerseyDrag.current.left - (event.clientX - jerseyDrag.current.x);
              }
            }}
            onPointerUp={() => {
              jerseyDrag.current = null;
            }}
            onPointerLeave={() => {
              jerseyDrag.current = null;
            }}
          >
            {Array.from({ length: 18 }, (_, index) => index + 1).map((number_) => {
              const isT = taggerJersey === number_;
              return (
                <button
                  key={number_}
                  type="button"
                  onClick={() => setTaggerJersey(number_)}
                  className="tap shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black transition active:scale-95"
                  style={
                    isT
                      ? { background: "#E11D48", color: "#fff", border: "1px solid #FF1744" }
                      : { background: "rgba(255, 255, 255, 0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)" }
                  }
                >
                  #{number_}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {([
              ["attack", "rgba(16, 185, 129, 0.18)", "#10B981"],
              ["block", "rgba(14, 165, 233, 0.18)", "#0EA5E9"],
              ["ace", "rgba(245, 158, 11, 0.18)", "#F59E0B"],
              ["error", "rgba(225, 29, 72, 0.18)", "#E11D48"],
            ] as const).map(([action, tint, accent]) => (
              <button
                key={action}
                type="button"
                data-testid={`tagger-${action}`}
                onClick={() => appendDvwCode(taggerCode(action, taggerJersey))}
                className="tap rounded-lg px-2 py-1.5 text-[10px] font-black transition active:scale-95"
                style={{ background: tint, border: `1px solid ${accent}`, color: accent }}
              >
                {scoutActionLabel(action).split(" ")[0]} {action === "attack" ? t(locale, "Ataque", "Attack", "Ataque") : action === "block" ? t(locale, "Bloqueo", "Block", "Bloqueio") : action === "ace" ? t(locale, "Ace", "Ace", "Ace") : t(locale, "Error", "Error", "Erro")}
              </button>
            ))}
            <span data-testid="tagger-last-code" className="rounded bg-volt/15 px-2 py-1 text-[10px] font-black text-volt" style={{ fontVariantNumeric: "tabular-nums" }}>
              {dvwLog[dvwLog.length - 1] ?? ""}
            </span>
          </div>
          <div data-testid="swipe-scout-pad" className="mt-1 grid grid-cols-3 gap-1" style={{ width: "9.5rem", marginInlineStart: "auto", marginInlineEnd: "auto" }}>
            {([["up", "⬆️", "#", 2, 1], ["left", "⬅️", "/", 1, 2], ["right", "➡️", "+", 3, 2], ["down", "⬇️", "=", 2, 3]] as const).map(([direction, icon, badge, col, row]) => (
              <button
                key={direction}
                type="button"
                data-testid={`swipe-${direction}`}
                onClick={() => appendDvwCode(SWIPE_CODES[direction])}
                className="tap rounded-lg border border-white/15 bg-white/5 py-1.5 text-[11px] font-black text-white/85 transition active:scale-95"
                style={{ gridColumn: col, gridRow: row }}
              >
                {icon} <span className="text-[9px] text-volt">{badge}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <button
              type="button"
              data-testid="voice-scout-dictation-btn"
              onClick={startVoiceScout}
              className="tap rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-black text-white/85 transition active:scale-95"
            >
              🎙️ {t(locale, "Dictar Jugada", "Dictate Play", "Ditar Jogada")}
            </button>
            {voiceFallback ? (
              <>
                <input
                  data-testid="voice-scout-text-input"
                  value={voiceText}
                  onChange={(event) => setVoiceText(event.target.value)}
                  placeholder={t(locale, "punto local · 14 ataque punto", "punto local · 14 attack point", "ponto local · 14 ataque ponto")}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-obsidian/70 px-2 py-1 text-[10px] text-white/85"
                />
                <button
                  type="button"
                  data-testid="voice-scout-text-apply"
                  onClick={() => {
                    if (voiceText.trim()) applyVoiceCommand(voiceText.trim());
                    setVoiceText("");
                  }}
                  className="rounded-lg border border-volt/50 bg-volt/10 px-2 py-1.5 text-[10px] font-black text-volt"
                >
                  ➜
                </button>
              </>
            ) : null}
          </div>
        </div>
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
      {isTableLandscapeMode ? (
        <div
          data-testid="landscape-table-scoreboard"
          role="dialog"
          aria-label={t(locale, "Modo Mesa", "Table mode", "Modo Mesa")}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            display: "flex",
            flexDirection: "column",
            background: "#070709",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          <div
            data-testid="landscape-set-pill"
            style={{
              position: "absolute",
              top: 6,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(8,8,12,0.92)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#FACC15",
              whiteSpace: "nowrap",
            }}
          >
            <span>SET {currentSet}</span>
            <span data-testid="landscape-sets-score" style={{ color: "#fff" }}>
              {left.sets} - {right.sets}
            </span>
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, minHeight: 0, padding: 4 }}>
            {tableHalves.map((half) => (
              <div
                key={half.key}
                data-testid={`landscape-half-${half.key}`}
                role="button"
                tabIndex={0}
                onClick={() => point(half.side)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  point(half.side);
                }}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 0,
                  cursor: "pointer",
                  borderRadius: 10,
                  border: `2px solid ${half.data.color || "#ffffff"}`,
                  background: `radial-gradient(120% 95% at 50% 8%, ${half.data.color || "#333333"}80 0%, ${half.data.color || "#333333"}26 48%, #070709 100%)`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 8,
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    flexDirection: half.key === "left" ? "row" : "row-reverse",
                  }}
                >
                  <button
                    type="button"
                    data-testid={`landscape-minus-${half.key}`}
                    aria-label={t(locale, "Restar punto", "Subtract point", "Subtrair ponto")}
                    onClick={(event) => {
                      event.stopPropagation();
                      subtractPoint(half.side);
                    }}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(0,0,0,0.45)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    −1
                  </button>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "clamp(11px, 2.4vw, 18px)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "#fff",
                    }}
                  >
                    <span data-testid={`landscape-name-${half.key}`}>{half.data.name}</span>
                    <button
                      type="button"
                      data-testid={`landscape-serve-${half.key}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setServe(half.side);
                      }}
                      style={{
                        padding: "1px 7px",
                        borderRadius: 999,
                        border: `1px solid ${half.data.serving ? "#FACC15" : "rgba(255,255,255,0.3)"}`,
                        background: half.data.serving ? "rgba(250,204,21,0.22)" : "rgba(0,0,0,0.35)",
                        color: half.data.serving ? "#FACC15" : "rgba(255,255,255,0.75)",
                        fontSize: 10,
                        fontWeight: 900,
                        opacity: half.data.serving ? 1 : 0.75,
                      }}
                    >
                      🏐 {t(locale, "SACA", "SERVE", "SACA")}
                    </button>
                  </span>
                </div>

                <span
                  data-testid={`landscape-score-${half.key}`}
                  style={{
                    fontSize: "clamp(5.5rem, 24vw, 11rem)",
                    fontWeight: 900,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                    color: "#ffffff",
                    textShadow: "0 4px 24px rgba(0,0,0,0.65)",
                  }}
                >
                  {half.data.score}
                </span>
              </div>
            ))}
          </div>

          {matchDone ? (
            <div
              data-testid="landscape-winner-banner"
              style={{
                position: "absolute",
                top: 44,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 3,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 12,
                background: "rgba(8,8,12,0.94)",
                border: "1px solid rgba(250,204,21,0.5)",
                fontSize: 12,
                fontWeight: 900,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              🏆 {state.winner === "A" ? state.teamA : state.teamB} {state.setsA}-{state.setsB}
              <button
                type="button"
                data-testid="landscape-rematch-btn"
                onClick={resetMatch}
                style={{
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "#FACC15",
                  color: "#070709",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                🔄 {t(locale, "Revancha 0-0", "Rematch 0-0", "Revanche 0-0")}
              </button>
            </div>
          ) : null}

          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              display: "flex",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(8,8,12,0.88)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
              maxWidth: "96vw",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              data-testid="landscape-undo-btn"
              onClick={undo}
              style={DOCK_BTN}
            >
              ↶ {t(locale, "Deshacer", "Undo", "Desfazer")}
            </button>
            <button
              type="button"
              data-testid="landscape-swap-btn"
              onClick={swapSides}
              style={DOCK_BTN}
            >
              🔄 {t(locale, "Cambio de Lado", "Swap sides", "Troca de lado")}
            </button>
            <button
              type="button"
              data-testid="landscape-whistle-btn"
              onClick={() => playCourtWhistle("double")}
              style={DOCK_BTN}
            >
              😗 {t(locale, "Silbato", "Whistle", "Apito")}
            </button>
            <button
              type="button"
              data-testid="landscape-reset-btn"
              onClick={resetSet}
              style={DOCK_BTN}
            >
              ↺ {t(locale, "Reiniciar (0-0)", "Reset (0-0)", "Zerar (0-0)")}
            </button>
            <button
              type="button"
              data-testid="landscape-exit-btn"
              onClick={exitTableMode}
              style={{ ...DOCK_BTN, borderColor: "rgba(255,255,255,0.35)" }}
            >
              ✕ {t(locale, "Salir", "Exit", "Sair")}
            </button>
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
  // v11.0.0 — WhatsApp → Cancha in 20 seconds: paste the group list, balance, push.
  const [waList, setWaList] = useState("");
  const [waBalance, setWaBalance] = useState<TeamBalance | null>(null);
  const [waSent, setWaSent] = useState(false);

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
      <section data-testid="whatsapp-pipeline-panel" className="mt-3 rounded-xl border border-white/10 bg-obsidian/60 p-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-volt">💬 {t(locale, "WhatsApp → Cancha en 20s", "WhatsApp → Court in 20s", "WhatsApp → Quadra em 20s")}</p>
        <textarea
          data-testid="whatsapp-list-input"
          rows={4}
          value={waList}
          onChange={(event) => setWaList(event.target.value)}
          placeholder={"1. Ana\n2. Beto\n3. Cara"}
          className="mt-1 w-full rounded-lg border border-white/15 bg-obsidian/70 p-1 font-mono text-[10px] text-white/85"
        />
        <div className="mt-1 flex flex-wrap gap-1">
          <button
            type="button"
            data-testid="pipeline-balance-btn"
            onClick={() => setWaBalance(parseWhatsAppListAndBalanceTeams(waList, loadPlayerMmr()))}
            className="tap rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-[10px] font-black text-white/85 transition active:scale-95"
          >
            ⚖️ {t(locale, "Balancear con MMR", "Balance with MMR", "Balancear com MMR")}
          </button>
          <button
            type="button"
            data-testid="pipeline-send-to-cancha-btn"
            onClick={() => {
              if (parseWhatsAppPlayerNames(waList).length === 0) return;
              const balance = parseWhatsAppListAndBalanceTeams(waList, loadPlayerMmr());
              savePipelineTeams({ teamA: balance.teamA, teamB: balance.teamB, bench: balance.bench });
              setWaBalance(balance);
              setWaSent(true);
            }}
            className="tap rounded-lg border border-volt/50 bg-volt/10 px-2 py-1.5 text-[10px] font-black text-volt transition active:scale-95"
          >
            🚀 {t(locale, "Enviar Equipos y Rotación a Cancha", "Send Teams & Rotation to Court", "Enviar Equipes e Rotação à Quadra")}
          </button>
        </div>
        {waBalance ? (
          <div data-testid="pipeline-balance-preview" className="mt-1 space-y-0.5 text-[10px] text-white/70">
            <p>A: {waBalance.teamA.join(", ")}{waBalance.unrated.length > 0 ? ` · ${t(locale, "nuevos MMR 50", "new MMR 50", "novos MMR 50")}: ${waBalance.unrated.length}` : ""}</p>
            <p>B: {waBalance.teamB.join(", ")}</p>
            <p>{t(locale, "Banco", "Bench", "Banco")}: {waBalance.bench.join(", ") || "—"}</p>
          </div>
        ) : null}
        {waSent ? (
          <p data-testid="pipeline-sent-note" className="mt-1 text-[10px] text-emerald">
            ✅ {t(locale, "Equipos en Cancha: abrí 🏐 Cancha y arrancan cargados.", "Teams on Court: open 🏐 Court and they boot preloaded.", "Equipes na Quadra: abra 🏐 Quadra e elas sobem carregadas.")}
          </p>
        ) : null}
      </section>
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
        <p className="mt-1 text-[11px] text-crimson">{translateEnum(decision.verdict, locale)}</p>
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
  const [pngNotice, setPngNotice] = useState<string | null>(null);
  const [height, setHeight] = useState(190);
  const [reach, setReach] = useState(250);
  const [jump, setJump] = useState(78);
  const [career, setCareer] = useState<CareerCardStats | null>(null);
  const [careerMsg, setCareerMsg] = useState<string | null>(null);
  const lastOvrRef = useRef<number | null>(null);
  const attributes: SixAttributes = { attack: 92, reception: 84, serve: 79, block: 71, defense: 76, setting: 55 };
  const card = useMemo(() => {
    try {
      return buildVolleyCard({ name: "Valentina Ríos", position: "punta", heightCm: height, standingReachCm: reach, jumpCm: jump, attributes });
    } catch {
      return null;
    }
  }, [height, reach, jump]);

  const syncCareer = (): void => {
    const records = loadAthleteRecords();
    const bestJumpCm = records.reduce((best, record) => Math.max(best, record.heightCm), 0);
    const team = seasonStats(loadSeason()).winRates[0] ?? null;
    const next = careerCardStats({
      bestJumpCm: bestJumpCm > 0 ? bestJumpCm : null,
      matchesPlayed: team?.played ?? 0,
      matchesWon: team?.wins ?? 0,
      pickupAwards: loadPickupAwards(),
    });
    if (bestJumpCm > 0) setJump(Math.round(bestJumpCm));
    const previous = lastOvrRef.current;
    const leveledUp = previous !== null && next.ovr > previous;
    lastOvrRef.current = next.ovr;
    setCareer(next);
    setCareerMsg(
      leveledUp
        ? t(locale, "⬆️ ¡OVR subió! Nivel desbloqueado.", "⬆️ OVR went up! Level unlocked.", "⬆️ OVR subiu! Nível desbloqueado.")
        : t(locale, "⚡ Tarjeta sincronizada con tus récords.", "⚡ Card synced with your records.", "⚡ Cartão sincronizado com seus recordes."),
    );
    if (leveledUp) playLevelUpArpeggio();
  };

  const shareCard = (): void => {
    if (!card) return;
    const svg = renderToStaticMarkup(<RadarHex attributes={card.attributes} />);
    void sharePng(svg, "volleycard.png").then((outcome) =>
      setPngNotice(
        outcome === "shared"
          ? t(locale, "📸 PNG compartido.", "📸 PNG shared.", "📸 PNG compartido.")
          : outcome === "downloaded"
            ? t(locale, "📸 PNG descargado.", "📸 PNG downloaded.", "📸 PNG baixado.")
            : t(locale, "❌ PNG no disponible aquí.", "❌ PNG unavailable here.", "❌ PNG indisponível aqui."),
      ),
    );
  };

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
            <button type="button" data-testid="volleycard-png-share" className={BTN} onClick={shareCard}>
              📸 {t(locale, "Compartir PNG de la tarjeta", "Share card PNG", "Compartir PNG do cartão")}
            </button>
            {pngNotice ? <p role="status" className="text-[10px] text-emerald">{pngNotice}</p> : null}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-crimson">{t(locale, "Revisá altura/reach (reach ≥ altura).", "Check height/reach (reach ≥ height).", "Verifique altura/reach (reach ≥ altura).")}</p>
      )}
      <button type="button" data-testid="sync-career" className={`${BTN} mt-2 w-full`} onClick={syncCareer}>
        ⚡ {t(locale, "Sincronizar con Mis Récords Reales", "Sync with My Real Records", "Sincronizar com Meus Recordes Reais")}
      </button>
      {career ? (
        <div data-testid="career-stats" className="mt-2 grid grid-cols-5 gap-1 text-center">
          {([["JMP", career.jmp], ["ATK", career.atk], ["DEF", career.def], ["IQ", career.iq], ["OVR", career.ovr]] as const).map(
            ([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-obsidian/60 px-1 py-1">
                <p className="text-[9px] text-white/40">{label}</p>
                <p className={`text-sm font-black ${label === "OVR" ? "text-volt" : "text-white/85"}`}>{value}</p>
              </div>
            ),
          )}
        </div>
      ) : null}
      {careerMsg ? (
        <p className="mt-1 text-[10px] text-emerald" data-testid="career-msg">
          {careerMsg}
        </p>
      ) : null}
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
      <p className={`mt-1 text-xs font-bold ${timing.status === "PERFECT" ? "text-emerald" : "text-crimson"}`}>{translateEnum(timing.status, locale)} · {timing.message}</p>
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
  // v11.0.5 — the last 7 days are directly editable; presets regenerate them.
  const [dayJumps, setDayJumps] = useState<number[]>(() => acwrDays(load).slice(-7).map((day) => day.jumps));
  const [chronicOverride, setChronicOverride] = useState<number | null>(null);
  const applyPreset = (value: number): void => {
    setLoad(value);
    setDayJumps(acwrDays(value).slice(-7).map((day) => day.jumps));
  };
  const setDay = (index: number, value: number): void => {
    setDayJumps((current) => current.map((jumps, position) => (position === index ? value : jumps)));
  };
  const baseDays = useMemo(() => acwrDays(load), [load]);
  const days = useMemo(() => {
    const tail = baseDays.slice(-7);
    return [...baseDays.slice(0, baseDays.length - 7), ...dayJumps.map((jumps, index) => ({ date: tail[index]?.date ?? "", jumps }))];
  }, [baseDays, dayJumps]);
  const engineReport = useMemo(() => jumpLoad(days), [days]);
  // With a chronic override the ratio/zone are computed locally; the engine
  // keeps handling the pure case so both paths stay auditable.
  const report = useMemo(() => {
    if (chronicOverride === null || chronicOverride <= 0) return engineReport;
    const ratio = engineReport.acute / chronicOverride;
    const zone =
      ratio < 0.8
        ? t(locale, "SUBCARGA", "UNDERLOAD", "SUBCARGA")
        : ratio <= 1.3
          ? t(locale, "ZONA ÓPTIMA SEGURA", "OPTIMAL SAFE ZONE", "ZONA ÓTIMA SEGURA")
          : ratio <= 1.49
            ? t(locale, "PRECAUCIÓN", "CAUTION", "PRECAUÇÃO")
            : t(locale, "RIESGO ALTO DE LESIÓN", "HIGH INJURY RISK", "ALTO RISCO DE LESÃO");
    const color = ratio < 0.8 ? "amber" : ratio <= 1.3 ? "emerald" : ratio <= 1.49 ? "amber" : "crimson";
    return {
      ...engineReport,
      chronicWeekly: chronicOverride,
      ratio: Math.round(ratio * 100) / 100,
      zone,
      color: color as typeof engineReport.color,
      recommendation:
        ratio >= 1.5
          ? t(locale, "Reducí la carga aguda esta semana.", "Reduce acute load this week.", "Reduza a carga aguda esta semana.")
          : ratio < 0.8
            ? t(locale, "Aumentá gradualmente el volumen.", "Increase volume gradually.", "Aumente o volume gradualmente.")
            : t(locale, "Mantené la progresión actual.", "Keep the current progression.", "Mantenha a progressão atual."),
    };
  }, [chronicOverride, engineReport, locale]);
  const tone = report.color === "emerald" ? "text-emerald" : report.color === "amber" ? "text-volt" : "text-crimson";
  const bg = report.color === "emerald" ? "bg-emerald" : report.color === "amber" ? "bg-volt" : "bg-crimson";

  return (
    <StationShell meta={meta} locale={locale} rows={28} onSave={onSave} onExample={() => applyPreset(185)}>
      <div className="flex items-center gap-2">
        {[{ label: t(locale, "Suave", "Light", "Leve"), value: 110 }, { label: t(locale, "Carga", "Load", "Carga"), value: 150 }, { label: t(locale, "Alta", "High", "Alta"), value: 185 }].map((option) => (
          <button key={option.value} type="button" onClick={() => applyPreset(option.value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${load === option.value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {dayJumps.map((jumps, index) => (
          <label key={index} className="block text-center">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">{t(locale, `Día ${index + 1}`, `Day ${index + 1}`, `Dia ${index + 1}`)}</span>
            <input
              type="number"
              min={0}
              max={500}
              data-testid={`acwr-day-input-${index}`}
              value={jumps}
              onChange={(event) => setDay(index, Math.max(0, Math.min(500, Number(event.target.value) || 0)))}
              className="w-full rounded-lg border border-white/15 bg-obsidian px-1 py-1 text-center text-[11px] font-bold text-white outline-none focus:border-volt"
            />
          </label>
        ))}
      </div>
      <label className="mt-2 block">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">{t(locale, "Carga Crónica Semanal (Promedio 4 semanas)", "Weekly Chronic Load (4-week average)", "Carga Crônica Semanal (Média 4 semanas)")}</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="range"
            min={100}
            max={2000}
            step={5}
            value={chronicOverride ?? Math.round(engineReport.chronicWeekly)}
            onChange={(event) => setChronicOverride(Number(event.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            min={100}
            max={2000}
            data-testid="acwr-chronic-input"
            value={chronicOverride ?? Math.round(engineReport.chronicWeekly)}
            onChange={(event) => {
              const value = Number(event.target.value);
              setChronicOverride(Number.isFinite(value) ? Math.max(100, Math.min(2000, value)) : null);
            }}
            className="w-20 rounded-lg border border-white/15 bg-obsidian px-2 py-1 text-center text-[11px] font-bold text-white outline-none focus:border-volt"
          />
        </div>
      </label>
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

/** v11.0.4 — block-shadow controls speak coach language, not enum codes. */
const BLOCK_ZONE_LABELS: Record<AttackZone, { es: string; en: string; pt: string }> = {
  zone_4: { es: "Punta (Zona 4)", en: "Wing (Zone 4)", pt: "Ponta (Zona 4)" },
  zone_2: { es: "Opuesto (Zona 2)", en: "Opposite (Zone 2)", pt: "Oposto (Zona 2)" },
  pipe_6: { es: "Pipe (Zona 6)", en: "Pipe (Zone 6)", pt: "Pipe (Zona 6)" },
  quick_3: { es: "Primer Tiempo (Z3)", en: "Quick (Z3)", pt: "Primeiro Tempo (Z3)" },
};
const BLOCK_SCHEME_LABELS: Record<BlockScheme, { es: string; en: string; pt: string }> = {
  line: { es: "Paralela (Línea)", en: "Line", pt: "Paralela (Linha)" },
  cross: { es: "Diagonal (Cross)", en: "Cross", pt: "Diagonal (Cross)" },
};

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
            {t(locale, BLOCK_ZONE_LABELS[value].es, BLOCK_ZONE_LABELS[value].en, BLOCK_ZONE_LABELS[value].pt)}
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
      <div className="mt-2 flex flex-wrap gap-1">
        {(["line", "cross"] as BlockScheme[]).map((value) => (
          <button key={value} type="button" onClick={() => setScheme(value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase ${scheme === value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {t(locale, BLOCK_SCHEME_LABELS[value].es, BLOCK_SCHEME_LABELS[value].en, BLOCK_SCHEME_LABELS[value].pt)}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 520 400" className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1a13]" role="img" aria-label={t(locale, "Cono de sombra del bloqueo", "Block shadow cone", "Cone de sombra do bloqueio")}>
        {/* Full 9x9m defending court: net at top, 3m line, floor zones. */}
        <rect x="98" y="48" width="324" height="324" fill="#0e1f18" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
        <rect x="98" y="36" width="324" height="12" fill="rgba(245, 158, 11, 0.4)" />
        <text x="260" y="26" textAnchor="middle" fontSize="13" fontWeight="900" fill="#F59E0B">RED</text>
        <line x1="98" y1="156" x2="422" y2="156" stroke="#F59E0B" strokeDasharray="8 6" strokeWidth="2" />
        <text x="104" y="150" fontSize="11" fontWeight="800" fill="#F59E0B" opacity="0.75">{t(locale, "LÍNEA 3M", "3M LINE", "LINHA 3M")}</text>
        {([[4, 150, 110], [3, 260, 110], [2, 370, 110], [5, 150, 330], [6, 260, 330], [1, 370, 330]] as Array<[number, number, number]>).map(([zone, zx, zy]) => (
          <text key={zone} x={zx} y={zy} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff" opacity="0.14">{`Z${zone}`}</text>
        ))}
        {/* Block shadow cone */}
        <polygon points={report.shadowPolygon.map((point) => `${98 + point.x * 36},${48 + point.y * 36}`).join(" ")} fill="rgba(220,20,60,0.28)" stroke="#dc143c" strokeWidth="1.5" />
        <text x={98 + (report.shadowPolygon[0]?.x ?? 4) * 36} y={48 + 6.6 * 36} fontSize="11" fontWeight="900" fill="#FF6B8A">{t(locale, "SOMBRA DE BLOQUEO", "BLOCK SHADOW", "SOMBRA DE BLOQUEIO")}</text>
        {/* Attacker token above the net */}
        <g>
          <circle cx={98 + (zone === "zone_4" ? 2.2 : zone === "zone_2" ? 6.8 : 4.5) * 36} cy={20} r={18} fill="#E11D48" stroke="#fff" strokeWidth="2.5" />
          <text x={98 + (zone === "zone_4" ? 2.2 : zone === "zone_2" ? 6.8 : 4.5) * 36} y={25} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">💥</text>
        </g>
        <text x={260} y={14} textAnchor="middle" fontSize="11" fontWeight="900" fill="#F8FAFC">💥 {t(locale, "ATACANTE", "ATTACKER", "ATACANTE")}</text>
        {/* Blocker wall on the net */}
        {Array.from({ length: blockers }, (_, index) => {
          const baseX = report.shadowPolygon[0]?.x ?? 4;
          const width = (report.shadowPolygon[1]?.x ?? 5) - baseX;
          const bx = 98 + (baseX + (width * (index + 0.5)) / Math.max(blockers, 1)) * 36;
          return (
            <g key={index}>
              <circle cx={bx} cy={48} r={14} fill="#8B5CF6" stroke="#fff" strokeWidth="2" />
              <text x={bx} y={53} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">🧱</text>
            </g>
          );
        })}
        <text x={422} y={70} textAnchor="end" fontSize="11" fontWeight="900" fill="#C4B5FD">{`🧱 ${t(locale, "BLOQUEO", "BLOCK", "BLOQUEIO")} x${blockers}`}</text>
        {/* Giant defender tokens with reach halos */}
        {report.defenders.map((defender) => {
          const cx = 98 + defender.x * 36;
          const cy = 48 + defender.y * 36;
          const label = defender.role === "FREE" ? "LIBRE" : defender.role;
          return (
            <g key={defender.role}>
              <circle cx={cx} cy={cy} r={34} fill="none" stroke={defender.insideShadow ? "#dc143c" : "#2ee6a8"} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
              <circle cx={cx} cy={cy} r={26} fill={defender.insideShadow ? "#dc143c" : "#0EA5E9"} stroke="#fff" strokeWidth="3" />
              <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{label}</text>
            </g>
          );
        })}
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

/** v11.0.4 — seam priorities read as Spanish coach words, not engine codes. */
function seamPriorityLabel(priority: string, locale: Locale): string {
  if (priority === "CRITICAL") return t(locale, "CRÍTICA", "CRITICAL", "CRÍTICA");
  if (priority === "HIGH") return t(locale, "ALTA", "HIGH", "ALTA");
  return t(locale, "BAJA", "LOW", "BAIXA");
}

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
            {value === "line3"
              ? t(locale, "3 Receptores", "3 Receivers", "3 Receptores")
              : t(locale, "4 Receptores", "4 Receivers", "4 Receptores")}
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
      <svg viewBox="0 0 520 400" className="mt-3 w-full rounded-xl border border-white/10 bg-[#0b1a13]" role="img" aria-label={t(locale, "Radar de costuras", "Seam radar", "Radar de costuras")}>
        {/* Serve-receive half court: net at top, 3m line, floor zones. */}
        <rect x="98" y="48" width="324" height="324" fill="#0e1f18" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
        <rect x="98" y="36" width="324" height="12" fill="rgba(245, 158, 11, 0.4)" />
        <text x="260" y="26" textAnchor="middle" fontSize="13" fontWeight="900" fill="#F59E0B">RED</text>
        <line x1="98" y1="156" x2="422" y2="156" stroke="#F59E0B" strokeDasharray="8 6" strokeWidth="2" />
        <text x="104" y="150" fontSize="11" fontWeight="800" fill="#F59E0B" opacity="0.75">{t(locale, "LÍNEA 3M", "3M LINE", "LINHA 3M")}</text>
        {([[4, 150, 110], [3, 260, 110], [2, 370, 110], [5, 150, 330], [6, 260, 330], [1, 370, 330]] as Array<[number, number, number]>).map(([zone, zx, zy]) => (
          <text key={zone} x={zx} y={zy} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff" opacity="0.14">{`Z${zone}`}</text>
        ))}
        {/* Server icon + dashed serve trajectory */}
        <circle cx="260" cy="16" r="13" fill="#F59E0B" stroke="#fff" strokeWidth="2" />
        <text x="260" y="21" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0b1a13">S</text>
        <line x1="260" y1="30" x2={98 + landingX * 36} y2={48 + landingY * 36} stroke="#ffd60a" strokeWidth="2.5" strokeDasharray="7 6" />
        <circle cx={98 + landingX * 36} cy={48 + landingY * 36} r={9} fill="#ffd60a" stroke="#fff" strokeWidth="2" />
        {/* Seam conflict zone between the two nearest receivers */}
        {(() => {
          const nearest = [...report.receivers].sort(
            (left, right) => Math.hypot(left.x - report.seamX, left.y - report.seamY) - Math.hypot(right.x - report.seamX, right.y - report.seamY),
          );
          const a = nearest[0];
          const b = nearest[1];
          if (!a || !b) return null;
          return (
            <g>
              <line x1={98 + a.x * 36} y1={48 + a.y * 36} x2={98 + b.x * 36} y2={48 + b.y * 36} stroke="#dc143c" strokeWidth="2.5" opacity="0.9" />
              <circle cx={98 + report.seamX * 36} cy={48 + report.seamY * 36} r={30} fill="rgba(220, 20, 60, 0.22)" stroke="#dc143c" strokeWidth="2" />
              <text x={98 + report.seamX * 36} y={48 + report.seamY * 36 + 46} textAnchor="middle" fontSize="11" fontWeight="900" fill="#FF6B8A">{`${t(locale, "ZONA DE COSTURA", "SEAM ZONE", "ZONA DE COSTURA")}: ${report.gapCm} cm`}</text>
            </g>
          );
        })()}
        {/* Giant receiver tokens with passing-radius rings */}
        {report.receivers.map((receiver) => (
          <g key={receiver.id}>
            <circle cx={98 + receiver.x * 36} cy={48 + receiver.y * 36} r={38} fill="none" stroke="#2ee6a8" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />
            <circle cx={98 + receiver.x * 36} cy={48 + receiver.y * 36} r={28} fill={receiver.id === report.seamOwner ? "#dc143c" : "#0EA5E9"} stroke="#fff" strokeWidth="3" />
            <text x={98 + receiver.x * 36} y={48 + receiver.y * 36 + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">{receiver.id}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Metric label={t(locale, "Costura", "Seam gap", "Costura")} value={`${report.gapCm} cm`} />
        <Metric label={t(locale, "Prioridad", "Priority", "Prioridade")} value={seamPriorityLabel(report.priority, locale)} tone={tone} />
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
    if (bridgeSaveData(report.filename, report.capsule, "application/json")) return;
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

/** v11.0.4 — sanctions cite the FIVB rule in the coach's language. */
const SANCTION_LABELS: Record<CardKind, [string, string, string]> = {
  WARNING_YELLOW: ["🟨 Amonestación Amarilla (Regla 21.1)", "🟨 Yellow Card (Rule 21.1)", "🟨 Advertência Amarela (Regra 21.1)"],
  PENALTY_RED: ["🟥 Castigo (Regla 21.2)", "🟥 Penalty (Rule 21.2)", "🟥 Punição (Regra 21.2)"],
  EXPULSION_JOINT: ["🟥 Expulsión (Regla 21.3)", "🟥 Expulsion (Rule 21.3)", "🟥 Expulsão (Regra 21.3)"],
  DISQUALIFICATION_SEPARATE: ["🟥🟥 Descalificación (Regla 21.4)", "🟥🟥 Disqualification (Rule 21.4)", "🟥🟥 Desqualificação (Regra 21.4)"],
  DELAY_WARNING: ["⏱️ Advertencia por Demora (Regla 21.5)", "⏱️ Delay Warning (Rule 21.5)", "⏱️ Advertência por Demora (Regra 21.5)"],
  DELAY_PENALTY: ["⏱️ Castigo por Demora (Regla 21.5)", "⏱️ Delay Penalty (Rule 21.5)", "⏱️ Punição por Demora (Regra 21.5)"],
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
  // v11.0.4 — live 8-second FIVB serve clock.
  const [serveClock, setServeClock] = useState(8);
  const [serveClockRunning, setServeClockRunning] = useState(false);
  useEffect(() => {
    if (!serveClockRunning) return;
    const id = window.setInterval(() => {
      setServeClock((current) => {
        const next = Math.max(0, Math.round((current - 0.1) * 10) / 10);
        if (next === 0) setServeClockRunning(false);
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [serveClockRunning]);

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
        <Metric label={t(locale, "Reloj", "Clock", "Relógio")} value={`${serveClock.toFixed(1)}s`} tone={serveClock > 0 ? "text-emerald" : "text-crimson"} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" data-testid="serve-clock-start" className={BTN} onClick={() => setServeClockRunning(true)}>▶️ 8s {t(locale, "Saque", "Serve", "Saque")}</button>
        <button type="button" data-testid="serve-clock-reset" className={BTN} onClick={() => { setServeClock(8); setServeClockRunning(false); }}>↺ 8s</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={() => add({ team: "A", player: 4, kind: "WARNING_YELLOW" })}>🟨 A #4</button>
        <button type="button" className={BTN} onClick={() => add({ team: "A", player: 4, kind: "WARNING_YELLOW" })}>🟨🟥 A #4</button>
        <button type="button" className={BTN} onClick={() => add({ team: "B", kind: "DELAY_WARNING" })}>⏱ B demora</button>
        <button type="button" className={BTN} onClick={() => add({ team: "B", player: 7, kind: "EXPULSION_JOINT" })}>🟥 B #7</button>
        <button type="button" className={BTN} onClick={() => playCourtWhistle("double")}>🔊 {t(locale, "Silbato", "Whistle", "Apito")}</button>
      </div>
      <div className="mt-3 space-y-1">
        {report.sanctions.map((sanction) => (
          <div key={sanction.index} className={`rounded-lg border px-2 py-1 text-[10px] ${CARD_BUTTON[sanction.applied]}`}>
            <p className="font-bold">
              #{sanction.index} {sanction.team}{sanction.player ? ` #${sanction.player}` : ""} · {t(locale, SANCTION_LABELS[sanction.applied][0], SANCTION_LABELS[sanction.applied][1], SANCTION_LABELS[sanction.applied][2])}
              {sanction.escalated ? ` · ${t(locale, "ESCALADO", "ESCALATED", "ESCALADO")}` : ""}
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
              {event.team} · P{event.position} · #{event.outNumber} → #{event.inNumber} · {translateEnum(event.status, locale)}
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

/** v11.0.4 — chalkboard cues speak Spanish, not engine codes. */
const CHALK_PRIORITY: Record<string, [string, string, string]> = {
  CRITICAL: ["PRIORIDAD CRÍTICA", "CRITICAL PRIORITY", "PRIORIDADE CRÍTICA"],
  HIGH: ["PRIORIDAD ALTA", "HIGH PRIORITY", "PRIORIDADE ALTA"],
  NORMAL: ["PRIORIDAD MEDIA", "NORMAL PRIORITY", "PRIORIDADE MÉDIA"],
};
const CHALK_CODE: Record<string, [string, string, string]> = {
  fix_reception: ["CERRAR RECEPCIÓN", "FIX RECEPTION", "FECHAR RECEPÇÃO"],
  serve_short: ["SAQUE CORTO TÁCTICO", "TACTICAL SHORT SERVE", "SAQUE CURTO TÁTICO"],
  setter_release: ["LIBRAR AL ARMADOR", "FREE THE SETTER", "LIBERAR O LEVANTADOR"],
  pin_attack: ["ATAQUE DE PUNTA", "PIN ATTACK", "ATAQUE DE PONTA"],
  block_line: ["BLOQUEO A LA LÍNEA", "BLOCK THE LINE", "BLOQUEIO NA LINHA"],
  backcourt_cover: ["CUBRIR EL FONDO", "COVER BACKCOURT", "COBRIR O FUNDO"],
};

interface ChalkStroke {
  color: string;
  points: Array<[number, number]>;
}

export function TimeoutChalkboardStation({ meta, locale, onSave }: StationProps) {
  const [pngNotice, setPngNotice] = useState<string | null>(null);
  const [reason, setReason] = useState<ChalkReason>("stop_serve_run");
  const report = useMemo(
    () => buildChalkboard({ reason, rotation: 4, scoreA: 18, scoreB: 21, strokes: CHALK_SAMPLE }),
    [reason],
  );
  // v11.0.4 — real 30s FIVB timeout clock + freehand chalk drawing.
  const [clock, setClock] = useState(30);
  const [clockRunning, setClockRunning] = useState(false);
  const [chalkColor, setChalkColor] = useState("#FFD60A");
  const [strokes, setStrokes] = useState<ChalkStroke[]>([]);
  const boardRef = useRef<SVGSVGElement | null>(null);
  const activeStroke = useRef<ChalkStroke | null>(null);

  useEffect(() => {
    if (!clockRunning) return;
    const id = window.setInterval(() => {
      setClock((current) => {
        const next = Math.max(0, Math.round((current - 0.1) * 10) / 10);
        if (next === 0) {
          setClockRunning(false);
          // v11.3.2 — the official table horn ends every FIVB timeout.
          playCourtTableBuzzer();
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [clockRunning]);

  const boardPoint = (event: ReactPointerEvent): [number, number] | null => {
    const svg = boardRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return [((event.clientX - rect.left) / rect.width) * 520, ((event.clientY - rect.top) / rect.height) * 400];
  };

  const reasons: Array<{ key: ChalkReason; label: string }> = [
    { key: "stop_serve_run", label: t(locale, "Cortar saque", "Stop serve run", "Cortar saque") },
    { key: "organize_sideout", label: t(locale, "Side-out", "Side-out", "Side-out") },
    { key: "match_point_defense", label: t(locale, "Defensa MP", "Match point D", "Defesa MP") },
  ];
  const cueLabel = (cue: { priority: string; code: string }): string => {
    const priority = CHALK_PRIORITY[cue.priority] ?? [cue.priority, cue.priority, cue.priority];
    const code = CHALK_CODE[cue.code] ?? [cue.code, cue.code, cue.code];
    return `${t(locale, priority[0], priority[1], priority[2])} · ${t(locale, code[0], code[1], code[2])}`;
  };
  const shareBoard = (): void => {
    const esc = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = report.cues
      .map(
        (cue, index) =>
          `<text x="60" y="${250 + index * 96}" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#FF3B5C">${esc(cueLabel(cue))}</text>` +
          `<text x="60" y="${294 + index * 96}" font-family="Arial, sans-serif" font-size="34" fill="#FFFFFF">${esc(cue.text)}</text>`,
      )
      .join("");
    const height = 260 + report.cues.length * 96;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 ${height}">` +
      `<rect width="720" height="${height}" fill="#0B0B0F"/>` +
      `<text x="60" y="90" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#EAB308">⏰ ${esc(t(locale, "Chalkboard táctico", "Tactical chalkboard", "Lousa tática"))}</text>` +
      `<text x="60" y="170" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#FFFFFF">${esc(`${report.seconds.toFixed(1)}s`)}</text>` +
      rows +
      `</svg>`;
    void sharePng(svg, "chalkboard.png").then((outcome) =>
      setPngNotice(
        outcome === "shared"
          ? t(locale, "📸 PNG compartido.", "📸 PNG shared.", "📸 PNG compartido.")
          : outcome === "downloaded"
            ? t(locale, "📸 PNG descargado.", "📸 PNG downloaded.", "📸 PNG baixado.")
            : t(locale, "❌ PNG no disponible aquí.", "❌ PNG unavailable here.", "❌ PNG indisponível aqui."),
      ),
    );
  };

  // Pre-drawn tactical arrows per timeout reason (chalk-yellow on the board).
  const PRE_DRAWN: Record<ChalkReason, Array<{ path: string; label: string; x: number; y: number }>> = {
    stop_serve_run: [
      { path: "M 380 300 L 300 180", label: "CORTAR SAQUE", x: 396, y: 290 },
      { path: "M 150 300 L 230 180", label: "", x: 0, y: 0 },
    ],
    organize_sideout: [
      { path: "M 150 130 L 370 130", label: "SIDE-OUT", x: 205, y: 118 },
      { path: "M 260 330 L 260 200", label: "", x: 0, y: 0 },
    ],
    match_point_defense: [
      { path: "M 150 150 L 250 300", label: "DEFENSA MP", x: 120, y: 140 },
      { path: "M 380 150 L 280 300", label: "", x: 0, y: 0 },
    ],
  };

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
        <span data-testid="timeout-clock" className="font-mono text-2xl font-black text-volt">{clock.toFixed(1)}s</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" data-testid="timeout-clock-start" className={BTN} onClick={() => setClockRunning(true)}>▶️ {t(locale, "Iniciar 30s", "Start 30s", "Iniciar 30s")}</button>
        <button type="button" data-testid="timeout-clock-pause" className={BTN} onClick={() => setClockRunning(false)}>⏸️ {t(locale, "Pausar", "Pause", "Pausar")}</button>
        <button type="button" data-testid="timeout-clock-reset" className={BTN} onClick={() => { setClock(30); setClockRunning(false); }}>↺ {t(locale, "Reiniciar 30s", "Reset 30s", "Reiniciar 30s")}</button>
      </div>
      <svg
        ref={boardRef}
        data-testid="timeout-chalkboard-canvas"
        viewBox="0 0 520 400"
        className="mt-2 w-full touch-none rounded-xl border border-white/10 bg-[#101511]"
        role="img"
        aria-label={t(locale, "Pizarra táctica del tiempo muerto", "Timeout tactical chalkboard", "Lousa tática do tempo")}
        onPointerDown={(event) => {
          const point = boardPoint(event);
          if (!point) return;
          event.preventDefault();
          activeStroke.current = { color: chalkColor, points: [point] };
        }}
        onPointerMove={(event) => {
          const stroke = activeStroke.current;
          const point = boardPoint(event);
          if (!stroke || !point || event.buttons <= 0) return;
          // v11.2.0 — 60fps on low-end devices: skip sub-4px jitter points.
          const previous = stroke.points[stroke.points.length - 1];
          if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 4) return;
          stroke.points.push(point);
          setStrokes((previousStrokes) => [...previousStrokes.slice(0, -1), { ...stroke, points: [...stroke.points] }]);
        }}
        onPointerUp={() => {
          if (activeStroke.current && activeStroke.current.points.length >= 2) {
            setStrokes((previous) => [...previous, activeStroke.current as ChalkStroke]);
          }
          activeStroke.current = null;
        }}
        onPointerLeave={() => {
          activeStroke.current = null;
        }}
      >
        {/* Chalkboard court */}
        <rect x="98" y="48" width="324" height="324" fill="none" stroke="#F8FAFC" strokeOpacity="0.55" strokeWidth="2.5" />
        <rect x="98" y="36" width="324" height="12" fill="rgba(245, 158, 11, 0.35)" />
        <text x="260" y="26" textAnchor="middle" fontSize="13" fontWeight="900" fill="#F59E0B">RED</text>
        <line x1="98" y1="156" x2="422" y2="156" stroke="#F59E0B" strokeDasharray="8 6" strokeWidth="2" />
        {/* Six player medallions */}
        {([[4, 150, 120], [3, 260, 120], [2, 370, 120], [5, 150, 320], [6, 260, 320], [1, 370, 320]] as Array<[number, number, number]>).map(([zone, zx, zy]) => (
          <g key={zone}>
            <circle cx={zx} cy={zy} r={26} fill="#1E293B" stroke="#F8FAFC" strokeWidth="3" />
            <text x={zx} y={zy + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#F8FAFC">{zone}</text>
          </g>
        ))}
        {/* Pre-drawn tactical arrows */}
        {PRE_DRAWN[reason].map((arrow, index) => (
          <g key={index}>
            <path d={arrow.path} stroke="#FFD60A" strokeWidth="4" fill="none" strokeDasharray="10 7" markerEnd="url(#chalk-arrow)" opacity="0.9" />
            {arrow.label ? <text x={arrow.x} y={arrow.y} fontSize="12" fontWeight="900" fill="#FFD60A">{arrow.label}</text> : null}
          </g>
        ))}
        <defs>
          <marker id="chalk-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#FFD60A" />
          </marker>
        </defs>
        {/* Freehand chalk strokes */}
        {strokes.map((stroke, index) => (
          <polyline
            key={index}
            points={stroke.points.map((point) => `${Math.round(point[0])},${Math.round(point[1])}`).join(" ")}
            fill="none"
            stroke={stroke.color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" aria-pressed={chalkColor === "#FFD60A"} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${chalkColor === "#FFD60A" ? "border-volt text-volt" : "border-white/10 text-white/60"}`} onClick={() => setChalkColor("#FFD60A")}>🟡 {t(locale, "Amarillo", "Yellow", "Amarelo")}</button>
        <button type="button" aria-pressed={chalkColor === "#FF3B5C"} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${chalkColor === "#FF3B5C" ? "border-volt text-volt" : "border-white/10 text-white/60"}`} onClick={() => setChalkColor("#FF3B5C")}>🔴 {t(locale, "Rojo", "Red", "Vermelho")}</button>
        <button type="button" aria-pressed={chalkColor === "#34D399"} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${chalkColor === "#34D399" ? "border-volt text-volt" : "border-white/10 text-white/60"}`} onClick={() => setChalkColor("#34D399")}>🟢 {t(locale, "Verde", "Green", "Verde")}</button>
        <button type="button" className={BTN} onClick={() => setStrokes([])}>🗑️ {t(locale, "Limpiar Pizarra", "Clear Board", "Limpar Lousa")}</button>
      </div>
      <div className="mt-2 space-y-1">
        {report.cues.map((cue) => (
          <div key={cue.code} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-crimson">{cueLabel(cue)}</p>
            <p className="text-[11px] text-white/70">{cue.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-white/40">{report.strokes.length} {t(locale, "trazos", "strokes", "traços")} · {report.totalLengthM.toFixed(2)} m</p>
      <button type="button" data-testid="chalkboard-png-share" className={`${BTN} mt-2`} onClick={shareBoard}>
        📸 {t(locale, "Compartir PNG del chalkboard", "Share chalkboard PNG", "Compartir PNG da lousa")}
      </button>
      {pngNotice ? (
        <p role="status" className="mt-1 text-[10px] text-emerald">{pngNotice}</p>
      ) : null}
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
        {translateEnum(report.recommendation, locale)} · {t(locale, "peor rotación", "worst rotation", "pior rotação")}: {report.worstRotation ?? "-"}
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
    if (bridgeSaveData(report.filename, report.svg, "image/svg+xml")) return;
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
            <button
              type="button"
              data-testid="matchposter-png-share"
              className={BTN}
              onClick={() => {
                void sharePng(report.svg, report.filename.replace(/\.svg$/u, ".png")).then((outcome) => {
                  if (outcome === "failed") setError(t(locale, "❌ PNG no disponible aquí.", "❌ PNG unavailable here.", "❌ PNG indisponível aqui."));
                });
              }}
            >
              📸 {t(locale, "PNG 1080×1350", "PNG 1080×1350", "PNG 1080×1350")}
            </button>
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
  // v10.0.0 live radar: arm at release, stop at the gate → km/h per pass.
  const [gateM, setGateM] = useState(9);
  const [radar, setRadar] = useState<RadarSession>(newRadarSession);
  const [armedAt, setArmedAt] = useState<number | null>(null);
  const toggleRadar = (): void => {
    if (armedAt === null) {
      setArmedAt(performance.now());
      return;
    }
    const elapsed = performance.now() - armedAt;
    setRadar((previous) => recordRadarShot(previous, { distanceM: gateM, timeMs: elapsed }));
    setArmedAt(null);
  };
  const radarReport = radarStats(radar);
  const radarTierLabel = (tier: ReturnType<typeof speedTier>): string =>
    t(
      locale,
      tier === "pro" ? "🥇 PRO" : tier === "elite" ? "🥈 ÉLITE" : tier === "club" ? "🥉 CLUB" : "🔵 BASE",
      tier === "pro" ? "🥇 PRO" : tier === "elite" ? "🥈 ELITE" : tier === "club" ? "🥉 CLUB" : "🔵 BASE",
      tier === "pro" ? "🥇 PRO" : tier === "elite" ? "🥈 ÉLITE" : tier === "club" ? "🥉 CLUBE" : "🔵 BASE",
    );
  const report = useMemo(
    () => serveRadar({ originXm: 0, originYm: 0, targetXm: targetX, targetYm: targetY, flightTimeMs: flight }),
    [flight, targetX, targetY],
  );
  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => { setTargetX(9); setTargetY(7); setFlight(400); setRadar(newRadarSession()); setArmedAt(null); }}>
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
      <p className={LABEL}>🔫 {t(locale, "Radar en vivo (km/h)", "Live radar (km/h)", "Radar ao vivo (km/h)")}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {RADAR_GATES.map((gate) => (
          <button
            key={gate.id}
            type="button"
            data-testid={`radar-gate-${gate.id}`}
            className={gateM === gate.distanceM ? `${BTN} border-volt text-volt` : BTN}
            onClick={() => setGateM(gate.distanceM)}
          >
            {gate.distanceM} m
          </button>
        ))}
      </div>
      <button
        type="button"
        data-testid="radar-arm"
        aria-pressed={armedAt !== null}
        className={`${BTN} mt-2 w-full ${armedAt !== null ? "border-crimson bg-crimson/15 text-crimson" : "border-volt text-volt"}`}
        onClick={toggleRadar}
      >
        {armedAt !== null
          ? `⏹ ${t(locale, "PARAR y medir", "STOP and measure", "PARAR e medir")}`
          : `🎯 ${t(locale, "ARRANCAR (tap al pasar la bola)", "START (tap as the ball passes)", "COMEÇAR (toque ao passar a bola)")}`}
      </button>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="km/h" value={radarReport.lastKmh !== null ? radarReport.lastKmh.toFixed(1) : "—"} tone="text-volt" />
        <Metric label={t(locale, "Máx", "Best", "Melhor")} value={radarReport.count > 0 ? radarReport.bestKmh.toFixed(1) : "—"} tone="text-emerald" />
        <Metric label={t(locale, "Prom", "Avg", "Méd")} value={radarReport.count > 0 ? radarReport.avgKmh.toFixed(1) : "—"} />
      </div>
      {radarReport.count > 0 ? (
        <p data-testid="radar-tier" className="mt-1 rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-volt">
          {radarReport.bestKmh.toFixed(1)} km/h · {radarTierLabel(speedTier(radarReport.bestKmh))} · {radarReport.count} ×
        </p>
      ) : null}
      <button
        type="button"
        data-testid="radar-undo"
        className={`${BTN} mt-1`}
        disabled={radarReport.count === 0}
        onClick={() => setRadar((previous) => undoRadarShot(previous))}
      >
        ↶ {t(locale, "Deshacer medida", "Undo shot", "Desfazer medida")}
      </button>
      <p className="mt-1 text-[10px] text-white/60">{report.message}</p>
    </StationShell>
  );
}

/* 32 -------------------------------------------------------------------- */

const MATCHUP_ATTACK = [90, 72, 64, 58, 46, 38];
const MATCHUP_BLOCK = [52, 58, 64, 70, 76, 82];

export function MatchupMatrixStation({ meta, locale, onSave }: StationProps) {
  // v11.0.5 — fully editable: per-rotation block power vs attack threat.
  const [ownBlock, setOwnBlock] = useState<number[]>([...MATCHUP_BLOCK]);
  const [opponentAttack, setOpponentAttack] = useState<number[]>([...MATCHUP_ATTACK]);
  const report = useMemo(() => matchupMatrix({ opponentAttack, ownBlock }), [opponentAttack, ownBlock]);
  const setAt = (setter: (next: number[]) => void, current: number[]) => (index: number, value: number) => {
    setter(current.map((entry, position) => (position === index ? value : entry)));
  };
  const setBlock = setAt((next) => setOwnBlock(next), ownBlock);
  const setAttack = setAt((next) => setOpponentAttack(next), opponentAttack);
  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => { setOwnBlock([...MATCHUP_BLOCK]); setOpponentAttack([...MATCHUP_ATTACK]); }}>
      <div data-testid="matchup-matrix-editor" className="rounded-xl border border-white/10 bg-obsidian/60 p-2">
        <div className="grid grid-cols-6 gap-1">
          {ownBlock.map((value, index) => (
            <label key={`block-${index}`} className="block text-center">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">🛡️ R{index + 1}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={Math.round(value / 10)}
                onChange={(event) => setBlock(index, Math.max(1, Math.min(10, Number(event.target.value) || 1)) * 10)}
                className="w-full rounded-lg border border-white/15 bg-obsidian px-1 py-1 text-center text-[11px] font-bold text-white outline-none focus:border-volt"
              />
            </label>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {opponentAttack.map((value, index) => (
            <label key={`attack-${index}`} className="block text-center">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">⚔️ R{index + 1}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={Math.round(value / 10)}
                onChange={(event) => setAttack(index, Math.max(1, Math.min(10, Number(event.target.value) || 1)) * 10)}
                className="w-full rounded-lg border border-white/15 bg-obsidian px-1 py-1 text-center text-[11px] font-bold text-white outline-none focus:border-volt"
              />
            </label>
          ))}
        </div>
        <p className="mt-1 text-[9px] text-white/40">🛡️ {t(locale, "Poder de bloqueo 1-10 por rotación", "Block power 1-10 per rotation", "Poder de bloqueio 1-10 por rodízio")} · ⚔️ {t(locale, "Amenaza de ataque rival 1-10", "Opponent attack threat 1-10", "Ameaça de ataque rival 1-10")}</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
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
        <Metric label={t(locale, "Muñeca", "Wrist", "Punho")} value={`${report.wristAngleDeg} deg`} tone="text-volt" />
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
        <select className={INPUT} value={duration} onChange={(event) => setDuration(Number(event.target.value) as 60 | 90 | 120)} aria-label="Duración">
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
        <Metric label={t(locale, "Categoría", "Category", "Categoria")} value={translateEnum(report.category, locale)} tone="text-emerald" />
        <Metric label={t(locale, "Cuello", "Bottleneck", "Gargalo")} value={report.bottleneck} tone="text-crimson" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[11px]">
        {Object.entries(report.deltas).map(([key, value]) => (
          <span key={key} className="flex justify-between rounded bg-white/5 px-2 py-1">
            <span className="text-white/55">{formatModuleOutputKey(key, locale)}</span>
            <span className={value >= 0 ? "text-emerald" : "text-crimson"}>{value > 0 ? "+" : ""}{value}</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/60">{report.message} {t(locale, "Faltan", "Next gap", "Próximo gap")}: {report.gapToNext}.</p>
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

/** Polar point on the 12-hour dial (hour 12 points up, clockwise). */
const clockPolar = (hour: number, radius = 66): { x: number; y: number } => {
  const angle = (((hour % 12) * 30 - 90) * Math.PI) / 180;
  return { x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle) };
};

/** Arc between two dial hours for the protractor zones. */
const clockArc = (radius: number, fromHour: number, toHour: number): string => {
  const start = clockPolar(fromHour, radius);
  const end = clockPolar(toHour, radius);
  const large = (toHour - fromHour) * 30 > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
};

const CLOCK_TICKS = Array.from({ length: 12 }, (_, index) => index);

export function VideoTelestratorStation({ meta, locale, onSave }: StationProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // v10.0.0 split-screen 2.0: a second pane with its own video and strokes.
  const [videoBUrl, setVideoBUrl] = useState<string | null>(null);
  const [strokesB, setStrokesB] = useState<TelestrationPoint[][]>([]);
  const [drawingB, setDrawingB] = useState<TelestrationPoint[] | null>(null);
  const [split, setSplit] = useState(false);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const [strokes, setStrokes] = useState<TelestrationPoint[][]>([]);
  const [drawing, setDrawing] = useState<TelestrationPoint[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clockDragRef = useRef(false);
  const [takeoffT, setTakeoffT] = useState<number | null>(null);
  const [landingT, setLandingT] = useState<number | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [records, setRecords] = useState<AthleteJumpRecord[]>(() => loadAthleteRecords());
  const [clockOn, setClockOn] = useState(false);
  const [clockPos, setClockPos] = useState({ x: 50, y: 36 });
  // v10.3.0 — Courtside clip playlist: timestamped codes + Jugador/Habilidad/
  // Rotación filters with inline editing.
  const [clips, setClips] = useState<TelestrationClip[]>([]);
  const [clipPlayer, setClipPlayer] = useState("");
  const [clipSkill, setClipSkill] = useState("");
  const [clipRotation, setClipRotation] = useState("");
  const report = useMemo(
    () => (strokes.length > 0 ? analyzeTelestration({ frameWidth: 100, frameHeight: 100, strokes, scaleCmPerPx: 1 }) : null),
    [strokes],
  );

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => () => { if (videoBUrl) URL.revokeObjectURL(videoBUrl); }, [videoBUrl]);

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

  const finishB = (): void => {
    if (drawingB && drawingB.length >= 2) setStrokesB((previous) => [...previous, drawingB]);
    setDrawingB(null);
  };

  /** Sync A/B: align B's playhead to A, then play (or pause) both together. */
  const syncToggle = async (): Promise<void> => {
    const paneA = videoRef.current;
    const paneB = videoRefB.current;
    if (!paneA) return;
    if (paneA.paused) {
      if (paneB) paneB.currentTime = paneA.currentTime;
      const plays: Promise<void>[] = [paneA.play()];
      if (paneB) plays.push(paneB.play());
      await Promise.allSettled(plays);
    } else {
      paneA.pause();
      paneB?.pause();
    }
  };

  const flight =
    takeoffT !== null && landingT !== null && landingT > takeoffT ? flightTimeJump(landingT - takeoffT) : null;

  const clipPlayers = Array.from(
    new Set(
      clips
        .map((clip) => parseScoutCode(clip.code)?.player ?? null)
        .filter((player): player is number => player !== null),
    ),
  ).sort((a, b) => a - b);

  const filteredClips = clips.filter((clip) => {
    const parsed = parseScoutCode(clip.code);
    if (clipPlayer && (!parsed || `#${parsed.player}` !== clipPlayer)) return false;
    if (clipSkill && (!parsed || parsed.skill !== clipSkill)) return false;
    if (clipRotation && String(clip.rotation ?? "") !== clipRotation) return false;
    return true;
  });

  const addClip = (): void => {
    const timeMs = Math.round((videoRef.current?.currentTime ?? 0) * 1000);
    setClips((previous) => [
      ...previous,
      { id: `clip-${timeMs}-${previous.length}`, timeMs, code: "*14AT#", rotation: null },
    ]);
  };

  const updateClip = (id: string, patch: Partial<TelestrationClip>): void => {
    setClips((previous) => previous.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));
  };

  const persistJump = (): void => {
    if (!flight) return;
    const next = saveAthleteRecord({
      date: new Date().toISOString().slice(0, 10),
      flightMs: Math.round(flight.flightSeconds * 1000),
      heightCm: flight.heightCm,
    });
    setRecords(next);
    setSavedMsg(
      t(locale, "✅ Récord guardado en tu perfil.", "✅ Record saved to your profile.", "✄ Recorde salvo no seu perfil."),
    );
  };

  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => {
        setStrokes([]);
        setStrokesB([]);
        setTakeoffT(null);
        setLandingT(null);
        setSavedMsg(null);
        setClockOn(false);
      }}>
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
      {split ? (
        <input
          type="file"
          accept="video/*"
          aria-label={t(locale, "Video B", "Video B", "Video B")}
          data-testid="video-b-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setVideoBUrl((previous) => {
              if (previous) URL.revokeObjectURL(previous);
              return URL.createObjectURL(file);
            });
            setStrokesB([]);
          }}
          className="mb-2 w-full text-[10px]"
        />
      ) : null}
      <div className={split ? "grid grid-cols-2 gap-1" : ""}>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {videoUrl ? <video ref={videoRef} src={videoUrl} controls playsInline className="h-full w-full object-contain" /> : (
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
        {clockOn ? (
          <div
            data-testid="contact-clock"
            className="absolute touch-none"
            style={{ left: `${clockPos.x}%`, top: `${clockPos.y}%`, transform: "translate(-50%, -50%)" }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              clockDragRef.current = true;
            }}
            onPointerMove={(event) => {
              if (!clockDragRef.current) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setClockPos({
                x: Math.max(8, Math.min(92, ((event.clientX - rect.left) / rect.width) * 100)),
                y: Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100)),
              });
            }}
            onPointerUp={() => {
              clockDragRef.current = false;
            }}
            onPointerCancel={() => {
              clockDragRef.current = false;
            }}
          >
            <svg
              viewBox="0 0 200 200"
              className="h-40 w-40 opacity-85"
              role="img"
              aria-label={t(locale, "Reloj de contacto Hora 11 vs 12", "Contact clock Hora 11 vs 12", "Relógio de contato Hora 11 vs 12")}
            >
              <circle cx="100" cy="100" r="84" fill="#0b0b0dcc" stroke="#ffffff55" strokeWidth="2" />
              {CLOCK_TICKS.map((tick) => {
                const outer = clockPolar(tick, 82);
                const inner = clockPolar(tick, 74);
                return (
                  <line
                    key={tick}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="#ffffff88"
                    strokeWidth={tick % 3 === 0 ? 3 : 1.5}
                  />
                );
              })}
              <path
                data-testid="zone-optimal"
                d={clockArc(66, 10.5, 11.25)}
                fill="none"
                stroke="#22c55e"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                data-testid="zone-impingement"
                d={clockArc(66, 0, 1)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="100"
                y1="100"
                x2={clockPolar(11).x}
                y2={clockPolar(11).y}
                stroke="#c8ff00"
                strokeWidth="3"
              />
              <line
                x1="100"
                y1="100"
                x2={clockPolar(0).x}
                y2={clockPolar(0).y}
                stroke="#ffffff99"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <circle cx="100" cy="100" r="5" fill="#ffffff" />
            </svg>
            <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1 py-0.5 text-[9px]">
              <span className="text-emerald">
                🟢 {t(locale, "10:30–11:15 potencia", "10:30–11:15 power", "10:30–11:15 potência")}
              </span>{" "}·{" "}
              <span className="text-crimson">
                🔴 {t(locale, "12:00–01:00 hombro", "12:00–01:00 shoulder", "12:00–01:00 ombro")}
              </span>
            </div>
          </div>
        ) : null}
      </div>
      {split ? (
        <div data-testid="pane-b" className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
          {videoBUrl ? (
            <video ref={videoRefB} src={videoBUrl} controls playsInline className="h-full w-full object-contain" />
          ) : (
            <p className="grid h-full place-items-center px-4 text-center text-[11px] text-white/45">
              {t(locale, "Cargá el video B (la otra jugada).", "Load video B (the other play).", "Carregue o video B (a outra jogada).")}
            </p>
          )}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            data-testid="pane-b-canvas"
            className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDrawingB([pointFrom(event)]);
            }}
            onPointerMove={(event) => {
              if (!drawingB) return;
              // Capture eagerly: currentTarget is null once the event dispatch ends.
              const next = pointFrom(event);
              setDrawingB((previous) => (previous ? [...previous, next] : previous));
            }}
            onPointerUp={finishB}
            onPointerCancel={finishB}
          >
            {strokesB.map((stroke, index) => (
              <polyline
                key={`stroke-b-${index}`}
                points={stroke.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#e11d48"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {drawingB ? (
              <polyline
                points={drawingB.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#c8ff00"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        </div>
      ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          data-testid="mark-takeoff"
          className={BTN}
          onClick={() => setTakeoffT(videoRef.current?.currentTime ?? 0)}
        >
          🛫 1. {t(locale, "Marcar Despegue (t₁)", "Mark Takeoff (t₁)", "Marcar Decolagem (t₁)")}
        </button>
        <button
          type="button"
          data-testid="mark-landing"
          className={BTN}
          onClick={() => setLandingT(videoRef.current?.currentTime ?? 0)}
        >
          🛬 2. {t(locale, "Marcar Aterrizaje (t₂)", "Mark Landing (t₂)", "Marcar Aterrissagem (t₂)")}
        </button>
        {takeoffT !== null ? <span className={BTN}>t₁ {takeoffT.toFixed(2)}s</span> : null}
        {landingT !== null ? <span className={BTN}>t₂ {landingT.toFixed(2)}s</span> : null}
      </div>
      {flight ? (
        <div data-testid="flight-report" className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px]">
          <p className="font-bold text-volt">
            📏 Δt {flight.flightSeconds.toFixed(2)}s · {flight.heightCm.toFixed(1)} cm · v₀ {flight.takeoffVelocityMs.toFixed(2)} m/s
          </p>
          <p className="text-white/60">
            {t(
              locale,
              flight.rating === "warm"
                ? "Aún calentando"
                : flight.rating === "club"
                  ? "Nivel club"
                  : flight.rating === "explosive"
                    ? "¡Explosivo!"
                    : "¡Élite de salto!",
              flight.rating === "warm"
                ? "Still warming up"
                : flight.rating === "club"
                  ? "Club level"
                  : flight.rating === "explosive"
                    ? "Explosive!"
                    : "Jump elite!",
              flight.rating === "warm"
                ? "Aquecendo ainda"
                : flight.rating === "club"
                  ? "Nível clube"
                  : flight.rating === "explosive"
                    ? "Explosivo!"
                    : "Elite de salto!",
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button type="button" data-testid="save-jump" className={BTN} onClick={persistJump}>
              💾 {t(locale, "Guardar Récord en Mi Perfil de Salto", "Save Record to My Jump Profile", "Salvar Recorde no Meu Perfil de Salto")}
            </button>
            {savedMsg ? (
              <span role="status" className="text-[10px] text-emerald">
                {savedMsg}
              </span>
            ) : null}
          </div>
          {records.length > 0 ? (
            <svg
              data-testid="jump-sparkline"
              viewBox="0 0 120 28"
              className="mt-1 h-7 w-full"
              role="img"
              aria-label={t(locale, "Historial de saltos", "Jump history", "Histórico de saltos")}
            >
              <polyline points={recordsSparkline(records)} fill="none" stroke="#c8ff00" strokeWidth="1.5" />
            </svg>
          ) : null}
          <p className="text-[9px] text-white/40">
            {records.length} {t(locale, "récords guardados", "saved records", "recordes salvos")}
          </p>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={BTN} onClick={() => { setStrokes([]); setStrokesB([]); }}>{t(locale, "Borrar trazos", "Clear strokes", "Apagar tracos")}</button>
        <span className={BTN}>{strokes.length + strokesB.length} {t(locale, "trazos", "strokes", "tracos")}</span>
        <button type="button" data-testid="split-toggle" aria-pressed={split} className={split ? `${BTN} border-volt text-volt` : BTN} onClick={() => setSplit((value) => !value)}>
          ⫲ {t(locale, "Pantalla dividida", "Split screen", "Tela dividida")}
        </button>
        {split ? (
          <button type="button" data-testid="split-sync" className={BTN} onClick={() => void syncToggle()}>
            ⏯ {t(locale, "Sincronizar A/B", "Sync A/B", "Sincronizar A/B")}
          </button>
        ) : null}
        <button
          type="button"
          data-testid="contact-clock-toggle"
          aria-pressed={clockOn}
          className={BTN}
          onClick={() => setClockOn((on) => !on)}
        >
          🕚 {t(locale, "Reloj de Contacto (Hora 11 vs 12)", "Contact Clock (Hora 11 vs 12)", "Relógio de Contato (Hora 11 vs 12)")}
        </button>
      </div>
      {report ? (
        <div className="mt-2 rounded-xl border border-white/10 p-2 text-[10px]">
          <p>{report.message}</p>
          <p className="text-white/50">
            {t(locale, "Ángulo medio", "Mean angle", "Ângulo médio")}: {report.meanAngleDeg}° · {t(locale, "Máximo", "Max", "Máximo")}: {report.maxAngleDeg}°
          </p>
        </div>
      ) : null}
      <div className="mt-2 rounded-xl border border-white/10 p-2" data-testid="telestrator-playlist">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/60">
            🎬 {t(locale, "Clips con código", "Coded clips", "Clips com código")}
          </p>
          <button type="button" data-testid="telestrator-add-clip-btn" className={BTN} onClick={addClip}>
            + {t(locale, "Añadir clip", "Add clip", "Adicionar clip")}
          </button>
        </div>

        <div className="mb-2 flex flex-wrap gap-1" data-testid="telestrator-filters">
          <span className="text-[9px] font-bold uppercase text-white/45">
            {t(locale, "Jugador", "Player", "Jogador")}:
          </span>
          {clipPlayers.map((player) => (
            <button
              key={player}
              type="button"
              data-testid={`telestrator-filter-player-${player}`}
              aria-pressed={clipPlayer === `#${player}`}
              onClick={() => setClipPlayer((value) => (value === `#${player}` ? "" : `#${player}`))}
              className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold ${
                clipPlayer === `#${player}` ? "border-volt text-volt" : "border-white/10 text-white/55"
              }`}
            >
              #{player}
            </button>
          ))}
          {(["S", "R", "E", "A", "B", "D"] as const).map((skill) => (
            <button
              key={skill}
              type="button"
              data-testid={`telestrator-filter-skill-${skill}`}
              aria-pressed={clipSkill === skill}
              onClick={() => setClipSkill((value) => (value === skill ? "" : skill))}
              className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold ${
                clipSkill === skill ? "border-volt text-volt" : "border-white/10 text-white/55"
              }`}
            >
              {skill}
            </button>
          ))}
          {[1, 2, 3, 4, 5, 6].map((rotation) => (
            <button
              key={rotation}
              type="button"
              data-testid={`telestrator-filter-rotation-p${rotation}`}
              aria-pressed={clipRotation === String(rotation)}
              onClick={() => setClipRotation((value) => (value === String(rotation) ? "" : String(rotation)))}
              className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold ${
                clipRotation === String(rotation) ? "border-volt text-volt" : "border-white/10 text-white/55"
              }`}
            >
              P{rotation}
            </button>
          ))}
        </div>

        {filteredClips.length === 0 ? (
          <p data-testid="telestrator-playlist-empty" className="text-[10px] text-white/45">
            {t(
              locale,
              "Sin clips todavía: pausá el video y añadí uno.",
              "No clips yet: pause the video and add one.",
              "Sem clips ainda: pause o vídeo e adicione um.",
            )}
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredClips.map((clip) => (
              <li
                key={clip.id}
                data-testid="telestrator-clip-row"
                className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1"
              >
                <span className="font-mono text-[10px] text-volt">
                  {String(Math.floor(clip.timeMs / 60000)).padStart(2, "0")}:
                  {String(Math.floor((clip.timeMs % 60000) / 1000)).padStart(2, "0")}.
                  {String(clip.timeMs % 1000).padStart(3, "0")}
                </span>
                <input
                  data-testid="telestrator-clip-code-input"
                  value={clip.code}
                  onChange={(event) => updateClip(clip.id, { code: event.target.value })}
                  className="w-28 rounded border border-white/15 bg-black/50 px-1 py-0.5 font-mono text-[10px] text-white focus:border-volt focus:outline-none"
                />
                <select
                  data-testid="telestrator-clip-rotation"
                  value={clip.rotation ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    updateClip(clip.id, { rotation: raw ? Number(raw) : null });
                  }}
                  className="rounded border border-white/15 bg-black/50 px-1 py-0.5 text-[10px] text-white focus:border-volt focus:outline-none"
                >
                  <option value="">{t(locale, "Sin rotación", "No rotation", "Sem rotação")}</option>
                  {[1, 2, 3, 4, 5, 6].map((rotation) => (
                    <option key={rotation} value={rotation}>
                      P{rotation}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-white/50">
                  {(() => {
                    const parsed = parseScoutCode(clip.code);
                    return parsed ? `#${parsed.player} ${parsed.skill}${parsed.evaluation}` : "—";
                  })()}
                </span>
                <button
                  type="button"
                  data-testid="telestrator-clip-remove"
                  className="ml-auto rounded border border-white/15 px-2 text-[10px] text-white/60 hover:text-crimson"
                  onClick={() => setClips((previous) => previous.filter((item) => item.id !== clip.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
            {translateEnum(frame.phase, locale)}
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
  const [shots, setShots] = useState<{ x: number; y: number; result: ShotResult }[]>(() => {
    // v10.0.0: tagged attacks from ⏱️ Cancha flow in with zero double typing.
    const tagged = loadLiveScoutShots();
    return tagged.length > 0 ? tagged : HEATMAP_SAMPLE;
  });
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
        <button type="button" className={BTN} onClick={() => { setShots([]); clearLiveScoutShots(); }}>{t(locale, "Limpiar", "Clear", "Limpar")}</button>
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

/** v10.0.0 — interactive reaction-time drill feeding the scoreReflex report. */
function ReactionDrill({ locale }: { locale: Locale }) {
  const [drill, setDrill] = useState<ReactionDrillState>(newReactionDrill);
  const timersRef = useRef<{ stimulus?: number; miss?: number }>({});

  const clearTimers = (): void => {
    if (timersRef.current.stimulus) window.clearTimeout(timersRef.current.stimulus);
    if (timersRef.current.miss) window.clearTimeout(timersRef.current.miss);
    timersRef.current = {};
  };

  useEffect(() => clearTimers, []);

  const arm = (): void => {
    clearTimers();
    const delay = reactionDelayMs();
    setDrill((previous) => startReaction(previous, Date.now(), delay));
    timersRef.current.stimulus = window.setTimeout(() => {
      setDrill((previous) => fireReaction(previous, Date.now()));
    }, delay);
    timersRef.current.miss = window.setTimeout(() => {
      setDrill((previous) => missReaction(previous));
    }, delay + REACTION_MAX_MS + 200);
  };

  const tap = (): void => {
    if (drill.status === "idle" || drill.status === "result") {
      arm();
      return;
    }
    clearTimers();
    setDrill((previous) => tapReaction(previous, Date.now()));
  };

  const summary = reactionSummary(drill.times);

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2">
      <p className={LABEL}>⚡ {t(locale, "Test de tiempo de reacción", "Reaction time test", "Teste de tempo de reação")}</p>
      <button
        type="button"
        data-testid="reaction-pad"
        className={`mt-1 h-24 w-full rounded-xl border text-lg font-black uppercase tracking-wider transition ${
          drill.status === "stimulus"
            ? "border-volt bg-volt text-obsidian"
            : drill.status === "waiting"
              ? "border-amber-300/60 bg-amber-300/10 text-amber-200"
              : "border-white/15 bg-obsidian text-white"
        }`}
        onClick={tap}
      >
        {drill.status === "stimulus"
          ? t(locale, "¡TOCÁ!", "TAP!", "TOQUE!")
          : drill.status === "waiting"
            ? t(locale, "Esperá el estímulo…", "Wait for the stimulus…", "Espere o estímulo…")
            : t(locale, "Tocá para arrancar", "Tap to start", "Toque para começar")}
      </button>
      <p data-testid="reaction-status" className="mt-1 text-[11px] text-white/70">
        {drill.flag === "jumped"
          ? t(locale, "🚨 Saliste antes de tiempo (falsa salida).", "🚨 You jumped the gun (false start).", "🚨 Você saiu antes (largada errada).")
          : drill.flag === "early" && drill.lastMs !== null
            ? t(locale, `⚡ Demasiado rápido: ${drill.lastMs} ms — descontado (mín. 80 ms).`, `⚡ Too fast: ${drill.lastMs} ms — discounted (80 ms min).`, `⚡ Rápido demais: ${drill.lastMs} ms — descontado (mín. 80 ms).`)
            : drill.flag === "late"
              ? t(locale, "🐢 Fuera de tiempo (máx. 1200 ms).", "🐢 Out of time (1200 ms max).", "🐢 Fora do tempo (máx. 1200 ms).")
              : drill.flag === "ok" && drill.lastMs !== null
                ? t(locale, `✅ ${drill.lastMs} ms registrados.`, `✅ ${drill.lastMs} ms logged.`, `✅ ${drill.lastMs} ms registrados.`)
                : t(locale, `${drill.times.length} medidas · el estímulo llega entre 0,8 y 2,2 s.`, `${drill.times.length} reads · stimulus arrives in 0.8–2.2 s.`, `${drill.times.length} medidas · o estímulo chega entre 0,8 e 2,2 s.`)}
      </p>
      {summary ? (
        <p data-testid="reaction-summary" className="mt-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-bold text-volt">
          {drill.times.length} × · {t(locale, "Promedio", "Mean", "Média")} {summary.meanMs} ms · {t(locale, "Mejor", "Best", "Melhor")} {summary.bestMs} ms · {summary.rating}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="reaction-reset"
        className={`${BTN} mt-1`}
        onClick={() => {
          clearTimers();
          setDrill(newReactionDrill());
        }}
      >
        🔄 {t(locale, "Reiniciar", "Reset", "Reiniciar")}
      </button>
    </div>
  );
}

/** v11.0.5 — every preview engine is live-editable through this param table. */
type PreviewParamDef =
  | { key: string; kind: "number"; def: string; min?: number; max?: number; step?: number }
  | { key: string; kind: "text"; def: string }
  | { key: string; kind: "boolean"; def: string }
  | { key: string; kind: "numberlist"; def: string };

const PREVIEW_PARAMS: Record<string, PreviewParamDef[]> = {
  "ball-aerodynamics": [
    { key: "speedKmh", kind: "number", def: "68", min: 0, max: 200, step: 1 },
    { key: "spinRps", kind: "number", def: "0.8", min: 0, max: 10, step: 0.1 },
    { key: "launchAngleDeg", kind: "number", def: "12", min: -20, max: 60, step: 1 },
    { key: "impactHeightM", kind: "number", def: "2.1", min: 0.5, max: 3.5, step: 0.05 },
  ],
  "rally-clipper": [
    { key: "playerNumber", kind: "number", def: "7", min: 1, max: 99 },
    { key: "minDurationSec", kind: "number", def: "3", min: 1, max: 30 },
  ],
  "recruiting-dossier": [
    { key: "graduationYear", kind: "number", def: "2028", min: 2024, max: 2040 },
    { key: "position", kind: "text", def: "outside" },
    { key: "heightCm", kind: "number", def: "188", min: 140, max: 230 },
    { key: "reachOneHandCm", kind: "number", def: "245", min: 180, max: 300 },
    { key: "reachTwoHandCm", kind: "number", def: "248", min: 180, max: 300 },
    { key: "verticalJumpCm", kind: "number", def: "78", min: 20, max: 130 },
    { key: "attackReachCm", kind: "number", def: "323", min: 200, max: 380 },
    { key: "kills", kind: "number", def: "280", min: 0, max: 2000 },
    { key: "attackEfficiencyPct", kind: "number", def: "46", min: 0, max: 100 },
  ],
  "system-transition": [
    { key: "setters", kind: "number", def: "2", min: 1, max: 6 },
    { key: "pureHitters", kind: "number", def: "5", min: 0, max: 6 },
    { key: "transitionReadGrade", kind: "number", def: "8", min: 0, max: 10 },
    { key: "rotation", kind: "number", def: "1", min: 1, max: 6 },
  ],
  "deception-reader": [
    { key: "approachSpeedKmh", kind: "number", def: "19", min: 0, max: 40 },
    { key: "elbowHeightCm", kind: "number", def: "172", min: 100, max: 230 },
    { key: "ballFrontOffsetCm", kind: "number", def: "8", min: -30, max: 30 },
    { key: "setterFrontZoneJump", kind: "boolean", def: "true" },
    { key: "blockersCommitted", kind: "number", def: "2", min: 0, max: 3 },
  ],
  "inclusive-adaptive": [
    { key: "mode", kind: "text", def: "sitting" },
    { key: "sex", kind: "text", def: "male" },
    { key: "players", kind: "number", def: "6", min: 2, max: 12 },
  ],
  "elo-ranking": [
    { key: "teamARating", kind: "number", def: "1820", min: 800, max: 3000 },
    { key: "teamBRating", kind: "number", def: "1760", min: 800, max: 3000 },
    { key: "kWeight", kind: "number", def: "40", min: 8, max: 80 },
    { key: "result", kind: "text", def: "3-1" },
  ],
  "team-treasury": [
    { key: "jerseyCostTotal", kind: "number", def: "360", min: 0, max: 100000 },
    { key: "monthlyFeePerPlayer", kind: "number", def: "12.5", min: 0, max: 1000, step: 0.5 },
    { key: "months", kind: "number", def: "3", min: 1, max: 12 },
    { key: "ballFund", kind: "number", def: "90", min: 0, max: 100000 },
    { key: "registrationFee", kind: "number", def: "60", min: 0, max: 100000 },
  ],
  "house-rules": [
    { key: "scoreA", kind: "number", def: "14", min: 0, max: 50 },
    { key: "scoreB", kind: "number", def: "14", min: 0, max: 50 },
  ],
  "arena-dj": [{ key: "event", kind: "text", def: "MONSTER_BLOCK" }],
  "court-slang": [
    { key: "term", kind: "text", def: "pipe" },
    { key: "origin", kind: "text", def: "AR" },
  ],
  "qr-sync": [{ key: "matrixSize", kind: "number", def: "21", min: 9, max: 45 }],
  "fivb-escoresheet": [
    { key: "substitutions", kind: "number", def: "6", min: 0, max: 12 },
    { key: "sanctions", kind: "number", def: "2", min: 0, max: 10 },
  ],
  "tournament-nutrition": [
    { key: "weightKg", kind: "number", def: "78", min: 30, max: 160 },
    { key: "matches", kind: "number", def: "2", min: 1, max: 8 },
    { key: "minutesPerMatch", kind: "number", def: "90", min: 15, max: 240 },
    { key: "tempC", kind: "number", def: "31", min: -10, max: 50 },
    { key: "sweatRateLh", kind: "number", def: "1.1", min: 0, max: 4, step: 0.1 },
  ],
  "injury-prehab": [
    { key: "weeklyJumps", kind: "number", def: "420", min: 0, max: 2000 },
    { key: "weeklySpikes", kind: "number", def: "260", min: 0, max: 2000 },
    { key: "sleepHours", kind: "number", def: "6.5", min: 0, max: 14, step: 0.5 },
    { key: "kneePain", kind: "number", def: "3", min: 0, max: 10 },
    { key: "shoulderPain", kind: "number", def: "0", min: 0, max: 10 },
    { key: "priorInjury", kind: "boolean", def: "true" },
  ],
  "tiebreak-commander": [
    { key: "scoreA", kind: "number", def: "13", min: 0, max: 30 },
    { key: "scoreB", kind: "number", def: "12", min: 0, max: 30 },
    { key: "serving", kind: "text", def: "A" },
    { key: "bestOf", kind: "number", def: "3", min: 1, max: 5 },
    { key: "goldenPoint", kind: "boolean", def: "true" },
  ],
  "sponsor-deck": [
    { key: "impressions", kind: "number", def: "24000", min: 0, max: 10000000 },
    { key: "reach", kind: "number", def: "8000", min: 0, max: 10000000 },
    { key: "cpm", kind: "number", def: "12", min: 0, max: 500 },
    { key: "engagementPct", kind: "number", def: "6", min: 0, max: 100 },
    { key: "currency", kind: "text", def: "USD" },
  ],
  "peripheral-reflex": [{ key: "timesMs", kind: "numberlist", def: "210,195,240,205,220" }],
  "club-white-label": [
    { key: "club", kind: "text", def: "Tiburones Voley" },
    { key: "primary", kind: "text", def: "#0f766e" },
    { key: "secondary", kind: "text", def: "#111827" },
    { key: "accent", kind: "text", def: "#f59e0b" },
  ],
};

/** Defaults stay in the builders; overrides flow straight into each engine. */
const PREVIEW_BUILDERS: Record<string, (overrides: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>> = {
  "ball-aerodynamics": (o) => analyzeAerodynamics({ speedKmh: 68, spinRps: 0.8, launchAngleDeg: 12, impactHeightM: 2.1, ...o } as never) as unknown as Record<string, unknown>,
  "rally-clipper": (o) => buildClipPlan({ playerNumber: 7, minDurationSec: 3, rallies: [{ startSec: 0, endSec: 4.5, playerNumber: 7, skill: "spike", outcome: "kill" }, { startSec: 5.5, endSec: 10, playerNumber: 7, skill: "ace", outcome: "ace" }], ...o } as never) as unknown as Record<string, unknown>,
  "recruiting-dossier": (o) => buildRecruitingDossier({ graduationYear: 2028, position: "outside", heightCm: 188, reachOneHandCm: 245, reachTwoHandCm: 248, verticalJumpCm: 78, attackReachCm: 323, kills: 280, attackEfficiencyPct: 46, ...o } as never) as unknown as Promise<Record<string, unknown>>,
  "system-transition": (o) => analyzeSystem({ setters: 2, pureHitters: 5, transitionReadGrade: 8, rotation: 1, ...o } as never) as unknown as Record<string, unknown>,
  "deception-reader": (o) => readDeception({ approachSpeedKmh: 19, elbowHeightCm: 172, ballFrontOffsetCm: 8, setterFrontZoneJump: true, blockersCommitted: 2, ...o } as never) as unknown as Record<string, unknown>,
  "inclusive-adaptive": (o) => buildAdaptiveRulebook({ mode: "sitting", sex: "male", players: 6, ...o } as never) as unknown as Record<string, unknown>,
  "elo-ranking": (o) => calculateElo({ teamARating: 1820, teamBRating: 1760, kWeight: 40, result: "3-1", ...o } as never) as unknown as Record<string, unknown>,
  "team-treasury": (o) => buildTreasury({ jerseyCostTotal: 360, monthlyFeePerPlayer: 12.5, months: 3, ballFund: 90, registrationFee: 60, players: [{ name: "Valentina", paid: 80 }, { name: "Carla", paid: 45 }], ...o } as never) as unknown as Record<string, unknown>,
  "house-rules": (o) => validateHouseRules({ format: "mixed_6v6", teamAGenders: ["M", "F", "M", "F", "M", "F"], teamBGenders: ["F", "M", "F", "M", "F", "M"], benchOrder: ["Ana"], scoreA: 14, scoreB: 14, ...o } as never) as unknown as Record<string, unknown>,
  "arena-dj": (o) => buildArenaCue({ event: "MONSTER_BLOCK", ...o } as never) as unknown as Record<string, unknown>,
  "court-slang": (o) => translateSlang({ term: "pipe", origin: "AR", ...o } as never) as unknown as Record<string, unknown>,
  "qr-sync": (o) => buildQrSync({ kind: "match", payload: { home: "Tiburones", score_a: 24 }, matrixSize: 21, ...o } as never) as unknown as Promise<Record<string, unknown>>,
  "fivb-escoresheet": (o) => buildScoresheet({ teamA: "Tiburones", teamB: "Cóndores", sets: [{ a: 25, b: 21 }, { a: 23, b: 25 }, { a: 25, b: 19 }, { a: 25, b: 22 }], substitutions: 6, sanctions: 2, ...o } as never) as unknown as Record<string, unknown>,
  "tournament-nutrition": (o) => planMatchNutrition({ weightKg: 78, matches: 2, minutesPerMatch: 90, tempC: 31, sweatRateLh: 1.1, ...o } as never) as unknown as Record<string, unknown>,
  "injury-prehab": (o) => assessPrehab({ weeklyJumps: 420, weeklySpikes: 260, sleepHours: 6.5, kneePain: 3, shoulderPain: 0, priorInjury: true, ...o } as never) as unknown as Record<string, unknown>,
  "tiebreak-commander": (o) => commandTiebreak({ scoreA: 13, scoreB: 12, serving: "A", bestOf: 3, goldenPoint: true, ...o } as never) as unknown as Record<string, unknown>,
  "bracket-architect": () => buildBracket({ teams: ["Tiburones", "Lobos", "Titanes", "Vinchas", "Piranhas"] }) as unknown as Record<string, unknown>,
  "sponsor-deck": (o) => buildSponsorDeck({ impressions: 24000, reach: 8000, cpm: 12, engagementPct: 6, currency: "USD", ...o } as never) as unknown as Record<string, unknown>,
  "head-to-head": () => buildHeadToHead({ teamA: "Tiburones", teamB: "Lobos", matches: [{ setsA: 3, setsB: 1 }, { setsA: 2, setsB: 3 }, { setsA: 3, setsB: 0 }] }) as unknown as Record<string, unknown>,
  "peripheral-reflex": (o) => scoreReflex({ timesMs: [210, 195, 240, 205, 220], ...o } as never) as unknown as Record<string, unknown>,
  "club-white-label": (o) => buildWhiteLabel({ club: "Tiburones Voley", primary: "#0f766e", secondary: "#111827", accent: "#f59e0b", ...o } as never) as unknown as Record<string, unknown>,
};

export function EnginePreviewStation({ meta, locale, onSave }: StationProps) {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  // v11.0.5 — user-edited param values (strings, coerced per param kind).
  const [paramState, setParamState] = useState<Record<string, Record<string, string>>>({});
  const paramDefs = PREVIEW_PARAMS[meta.slug] ?? [];
  const paramValues = paramState[meta.slug] ?? Object.fromEntries(paramDefs.map((def) => [def.key, def.def]));
  const setParam = (key: string, value: string): void => {
    setParamState((current) => ({ ...current, [meta.slug]: { ...(current[meta.slug] ?? Object.fromEntries(paramDefs.map((def) => [def.key, def.def]))), [key]: value } }));
  };
  useEffect(() => {
    let alive = true;
    const builder = PREVIEW_BUILDERS[meta.slug];
    if (!builder) {
      setReport(null);
      return;
    }
    const overrides: Record<string, unknown> = {};
    for (const def of paramDefs) {
      const raw = paramValues[def.key] ?? def.def;
      if (def.kind === "number") {
        // v11.1.0 — a cleared field means zero, never NaN/Infinity downstream.
        const parsed = Number(raw);
        const finite = Number.isFinite(parsed) ? parsed : 0;
        const lower = typeof def.min === "number" ? def.min : -Infinity;
        const upper = typeof def.max === "number" ? def.max : Infinity;
        overrides[def.key] = Math.min(upper, Math.max(lower, finite));
      } else if (def.kind === "boolean") overrides[def.key] = raw === "true";
      else if (def.kind === "numberlist") {
        const list = Array.isArray(raw) ? raw : raw.split(",");
        overrides[def.key] = list
          .map((part) => Number(String(part).trim()))
          .filter((value) => Number.isFinite(value));
      } else overrides[def.key] = raw;
    }
    try {
      const value = builder(overrides);
      Promise.resolve(value)
        .then((result) => {
          if (alive) setReport(result);
        })
        .catch(() => {
          if (alive) setReport(null);
        });
    } catch {
      if (alive) setReport(null);
    }
    return () => { alive = false; };
  }, [meta.slug, paramValues]);
  return (
    <StationShell meta={meta} locale={locale} rows={2} onSave={onSave} onExample={() => { setParamState((current) => ({ ...current, [meta.slug]: {} })); setReport(null); }}>
      {paramDefs.length > 0 ? (
        <div data-testid="module-live-input-panel" className="rounded-xl border border-white/10 bg-obsidian/60 p-2">
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {paramDefs.map((def) => (
              <label key={def.key} className="block">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/50">{translateInputLabel(def.key, locale)}</span>
                {def.kind === "boolean" ? (
                  <button
                    type="button"
                    aria-pressed={(paramValues[def.key] ?? def.def) === "true"}
                    onClick={() => setParam(def.key, (paramValues[def.key] ?? def.def) === "true" ? "false" : "true")}
                    className={`tap w-full rounded-lg border px-2 py-1 text-[11px] font-bold ${(paramValues[def.key] ?? def.def) === "true" ? "border-volt bg-volt/20 text-volt" : "border-white/15 text-white/60"}`}
                  >
                    {(paramValues[def.key] ?? def.def) === "true" ? "✓ true" : "✗ false"}
                  </button>
                ) : (
                  <input
                    type={def.kind === "number" ? "number" : "text"}
                    min={def.kind === "number" ? def.min : undefined}
                    max={def.kind === "number" ? def.max : undefined}
                    step={def.kind === "number" ? def.step : undefined}
                    value={paramValues[def.key] ?? def.def}
                    onChange={(event) => setParam(def.key, event.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-obsidian px-2 py-1 text-[11px] font-bold text-white outline-none focus:border-volt"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {report && meta.slug === "arena-dj" ? (
        <button
          type="button"
          className={BTN}
          onClick={() => playArenaCue(String(report.event ?? "MONSTER_BLOCK") as ArenaCue)}
        >
          ▶ {t(locale, "Sonar cue", "Play cue", "Tocar cue")}
        </button>
      ) : null}
      {meta.slug === "peripheral-reflex" ? <BlindCourtCoach locale={locale} /> : null}
      {meta.slug === "peripheral-reflex" ? <ReactionDrill locale={locale} /> : null}
      {meta.slug === "injury-prehab" ? <IsometricTendonTimer locale={locale} /> : null}
      {report ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          {Object.entries(report).filter(([key]) => key !== "svg" && key !== "rallies" && key !== "selected").map(([key, value]) => (
            <div key={key} className="rounded-lg bg-white/5 px-2 py-1 text-[11px]" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <p className="font-bold text-white/55">{formatModuleOutputKey(key, locale)}</p>
              {formatModuleOutputValue(key, value, locale)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-white/55">{t(locale, "Calculando...", "Computing...", "Calculando...")}</p>
      )}
    </StationShell>
  );
}
/** v9.5: ms offsets rendered under the metronome buttons. */
const APPROACH_CADENCE_LABEL: Record<ApproachTempo, string> = {
  "1st": "0/220/310 + 480 ms",
  "2nd": "0/340/460 + 700 ms",
  "3rd": "0/480/630 + 920 ms",
};

const BLIND_COURT_CUES: ReadonlyArray<Record<Locale, string>> = [
  { es: "¡Toque corto en 2!", en: "Short tip in 2!", pt: "Toquinho no 2!" },
  { es: "¡Diagonal larga a 5!", en: "Long diagonal to 5!", pt: "Diagonal longa no 5!" },
  { es: "¡Paralela en 1!", en: "Line shot in 1!", pt: "Paralela no 1!" },
  { es: "¡Pelota Libre, abrite!", en: "Loose ball, open up!", pt: "Bola solta, abre!" },
  { es: "¡Bloqueo doble en 4!", en: "Double block on 4!", pt: "Bloqueio duplo no 4!" },
];

/**
 * v9.5 "Cancha a Ciegas": the phone stays on the bench while randomized voice,
 * whistle and sneaker-squeak cues train blind defensive reads.
 */
export function BlindCourtCoach({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(false);
  const [cue, setCue] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const fire = (): void => {
      const pick = BLIND_COURT_CUES[Math.floor(Math.random() * BLIND_COURT_CUES.length)] ?? BLIND_COURT_CUES[0];
      if (!pick) return;
      const phrase = pick[locale];
      setCue(phrase);
      playSneakerSqueak();
      playCourtWhistle("short");
      try {
        const synth = window.speechSynthesis;
        const Utterance = window.SpeechSynthesisUtterance;
        if (synth && Utterance) {
          const utterance = new Utterance(phrase);
          utterance.lang = locale === "es" ? "es-AR" : locale === "pt" ? "pt-BR" : "en-US";
          utterance.rate = 1.05;
          synth.speak(utterance);
        }
      } catch {
        /* no TTS on this device: the whistle still fires */
      }
    };
    fire();
    const id = window.setInterval(fire, 4000);
    return () => {
      window.clearInterval(id);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* speech already released */
      }
    };
  }, [active, locale]);

  return (
    <div className="mt-3 rounded-xl border border-crimson/40 bg-crimson/5 p-2">
      <button
        type="button"
        data-testid="blind-coach-toggle"
        aria-pressed={active}
        className={`${BTN} w-full`}
        onClick={() => setActive((on) => !on)}
      >
        🎧 {t(
          locale,
          "Modo Cancha a Ciegas (Solo Audio + Voz)",
          "Blind Court Mode (Audio + Voice Only)",
          "Modo Quadra às Cegas (Só Áudio + Voz)",
        )}
        {active ? ` · ${t(locale, "ACTIVO", "LIVE", "ATIVO")}` : ""}
      </button>
      <p className="mt-1 text-[10px] text-white/55">
        {t(
          locale,
          "Dejá el teléfono en el banco y reaccioná al aviso: 4s entre señales.",
          "Leave the phone on the bench and react to the call: 4s between cues.",
          "Deixe o telefone no banco e reaja ao aviso: 4s entre sinais.",
        )}
      </p>
      {cue ? (
        <p data-testid="blind-coach-cue" role="status" className="mt-1 text-[11px] font-bold text-volt">
          {cue}
        </p>
      ) : null}
    </div>
  );
}

const TENDON_HOLD_SECONDS = 45;
const TENDON_REST_SECONDS = 90;
const TENDON_SETS = 5;

/**
 * v9.5 clinical pre-match patellar tendinopathy protocol:
 * 5 × 45s isometric wall-sit holds with 90s rest, hands-free via
 * warmup ticks on the last five seconds and whistles on every phase.
 */
export function IsometricTendonTimer({ locale }: { locale: Locale }) {
  const [phase, setPhase] = useState<"idle" | "hold" | "rest" | "paused" | "done">("idle");
  const [remaining, setRemaining] = useState(TENDON_HOLD_SECONDS);
  const [set, setSet] = useState(1);
  const pausedFromRef = useRef<"hold" | "rest">("hold");

  useEffect(() => {
    if (phase !== "hold" && phase !== "rest") return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "hold" && phase !== "rest") return;
    if (remaining > 0 && remaining <= 5) playWarmupTick(remaining === 1);
    if (remaining > 0) return;
    if (phase === "hold") {
      if (set >= TENDON_SETS) {
        playCourtWhistle("double");
        setPhase("done");
      } else {
        playCourtWhistle("long");
        setPhase("rest");
        setRemaining(TENDON_REST_SECONDS);
      }
    } else {
      playCourtWhistle("short");
      setSet((value) => value + 1);
      setPhase("hold");
      setRemaining(TENDON_HOLD_SECONDS);
    }
  }, [phase, remaining, set]);

  const start = (): void => {
    if (phase === "idle" || phase === "done") {
      setSet(1);
      setRemaining(TENDON_HOLD_SECONDS);
      playCourtWhistle("short");
      setPhase("hold");
    } else if (phase === "paused") {
      playCourtWhistle("short");
      setPhase(pausedFromRef.current);
    }
  };

  const pause = (): void => {
    pausedFromRef.current = phase === "rest" ? "rest" : "hold";
    setPhase("paused");
  };

  const reset = (): void => {
    setPhase("idle");
    setSet(1);
    setRemaining(TENDON_HOLD_SECONDS);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mt-3 rounded-xl border border-emerald/40 bg-emerald/5 p-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
        ⏱️ {t(locale, "Reloj Isométrico de Tendón (5 × 45s Sentadilla Isométrica / 90s Pausa)", "Isometric Tendon Timer (5 × 45s Wall Sit / 90s Rest)", "Relógio Isométrico de Tendão (5 × 45s Agachamento / 90s Pausa)")}
      </p>
      <p data-testid="tendon-clock" className="mt-1 text-4xl font-black text-emerald">
        {minutes}:{seconds}
      </p>
      <p data-testid="tendon-phase" className="text-[11px] text-white/70">
        {phase === "idle"
          ? t(locale, "Listo para la serie 1", "Ready for set 1", "Pronto para a série 1")
          : phase === "hold"
            ? t(locale, "Sentadilla isométrica: mantene 45s", "Isometric wall sit: hold 45s", "Agachamento isométrico: segure 45s")
            : phase === "rest"
              ? t(locale, "Pausa activa 90s", "Active rest 90s", "Pausa ativa 90s")
              : phase === "paused"
                ? t(locale, "En pausa", "Paused", "Pausado")
                : t(locale, "¡Protocolo completo! (5×45s)", "Protocol complete! (5×45s)", "Protocolo completo! (5×45s)")}
      </p>
      <p data-testid="tendon-set" className="text-[10px] text-white/50">
        {t(locale, `Serie ${set} de ${TENDON_SETS}`, `Set ${set} of ${TENDON_SETS}`, `Série ${set} de ${TENDON_SETS}`)}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {phase === "idle" || phase === "paused" || phase === "done" ? (
          <button type="button" data-testid="tendon-start" className={BTN} onClick={start}>
            {phase === "paused"
              ? `▶ ${t(locale, "Reanudar", "Resume", "Retomar")}`
              : phase === "done"
                ? `↺ ${t(locale, "Otra vez", "Again", "De novo")}`
                : `▶ ${t(locale, "Empezar", "Start", "Começar")}`}
          </button>
        ) : (
          <button type="button" data-testid="tendon-pause" className={BTN} onClick={pause}>
            ⏸ {t(locale, "Pausa", "Pause", "Pausa")}
          </button>
        )}
        {phase !== "idle" ? (
          <button type="button" data-testid="tendon-reset" className={BTN} onClick={reset}>
            ↺ {t(locale, "Reiniciar", "Reset", "Reiniciar")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function GymScreenStation({ meta, locale, onSave }: StationProps) {
  return (
    <StationShell meta={meta} locale={locale} rows={1} onSave={onSave} onExample={() => undefined}>
      <GymScreenModule locale={locale} onClose={() => {}} />
    </StationShell>
  );
}

/** v11.1.0 — every engine key has an ES/EN/PT label; no raw identifiers. */
export function formatModuleOutputKey(key: string, locale: Locale): string {
  return translateOutputKey(key, locale) ?? humanizeKey(key);
}

const OUTPUT_CARD_STYLE: CSSProperties = {
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

/** Recursive visual formatter: arrays/maps become mini-card grids, never JSON. */
export function formatModuleOutputValue(key: string, value: unknown, locale: Locale): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-white/45">—</span>;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return <span className="text-white/45">—</span>;
    const rounded = Math.round(value * 100) / 100;
    return <span className="text-white/85 tabular-nums">{String(rounded)}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-white/85">{t(locale, value ? "Sí" : "No", value ? "Yes" : "No", value ? "Sim" : "Não")}</span>;
  }
  if (typeof value === "string") {
    if (key === "status" || key === "regime" || key === "tier" || key === "riskLevel" || key === "priority" || key === "phase" || key === "mode" || key === "waveform" || key === "event" || key === "outcome" || key === "skill" || key === "primaryDefender" || key === "regime") {
      return <span className="text-white/85">{translateEnum(value, locale)}</span>;
    }
    return <span className="text-white/85">{translateEnum(value, locale)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) {
      return <span className="text-white/85">{value.map((item) => String(item)).join(" · ")}</span>;
    }
    return (
      <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]" style={OUTPUT_CARD_STYLE}>
            {Object.entries(item as Record<string, unknown>).map(([innerKey, innerValue]) => (
              <p key={innerKey}>
                <span className="text-white/50">{formatModuleOutputKey(innerKey, locale)}: </span>
                {formatModuleOutputValue(innerKey, innerValue, locale)}
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {Object.entries(value as Record<string, unknown>).map(([innerKey, innerValue]) => (
        <div key={innerKey} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]" style={OUTPUT_CARD_STYLE}>
          <p className="font-bold text-white/70">{formatModuleOutputKey(innerKey, locale)}</p>
          {formatModuleOutputValue(innerKey, innerValue, locale)}
        </div>
      ))}
    </div>
  );
}

/** v11.0.4 — dedicated visual station for the 4-2 / 6-2 / 5-1 simulator. */
const SYSTEM_META: Record<SystemName, { icon: string; description: [string, string, string] }> = {
  "5-1": { icon: "⚡", description: ["Armador fijo; tres atacantes en R1-R3.", "Fixed setter; three hitters in R1-R3.", "Levantador fixo; três atacantes em R1-R3."] },
  "6-2": { icon: "🔄", description: ["Armador zaguero penetra; tres atacantes al frente.", "Back-row setter penetrates; three front attackers.", "Levantador de fundo penetra; três atacantes na rede."] },
  "4-2": { icon: "📐", description: ["Dos armadores alternan delantera y zaga.", "Two setters alternate front and back.", "Dois levantadores alternam rede e fundo."] },
};

export function SystemTransitionStation({ meta, locale, onSave }: StationProps) {
  const [picked, setPicked] = useState<SystemName>("5-1");
  const [rotation, setRotation] = useState(1);
  const report = useMemo(
    () => analyzeSystem({ setters: 2, pureHitters: 5, transitionReadGrade: 8, rotation }),
    [rotation],
  );
  const system = report.systems.find((item) => item.name === picked) ?? report.systems[0]!;
  const attackers = system.frontAttackersByRotation[rotation - 1] ?? 0;
  // Setter home zone: zone 1 at R1, rotating forward each rotation.
  const setterHome = ((((1 - 1 + (rotation - 1)) % 6) + 6) % 6) + 1;
  const setterBackRow = setterHome === 1 || setterHome === 5 || setterHome === 6;
  const zonePos = (zone: number): [number, number] => {
    const coords: Record<number, [number, number]> = { 1: [370, 320], 2: [370, 120], 3: [260, 120], 4: [150, 120], 5: [150, 320], 6: [260, 320] };
    return coords[zone] ?? [260, 320];
  };
  const setterPos = zonePos(setterHome);

  return (
    <StationShell meta={meta} locale={locale} rows={6} onSave={onSave} onExample={() => { setPicked("6-2"); setRotation(1); }}>
      <div className="flex flex-wrap gap-1">
        {(["5-1", "6-2", "4-2"] as SystemName[]).map((name) => (
          <button
            key={name}
            type="button"
            data-testid={`system-pill-${name}`}
            aria-pressed={picked === name}
            onClick={() => setPicked(name)}
            className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${picked === name ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/55"}`}
          >
            {SYSTEM_META[name].icon} {t(locale, `Sistema ${name}`, `System ${name}`, `Sistema ${name}`)}
          </button>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className={LABEL}>{t(locale, "Rotación", "Rotation", "Rotação")}</span>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRotation(value)}
            className={`h-8 w-8 rounded-lg border text-xs font-bold ${rotation === value ? "border-volt bg-volt/20 text-volt" : "border-white/10 text-white/60"}`}
          >
            R{value}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 520 400" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1a13]" role="img" aria-label={t(locale, "Diagrama de sistema con infiltración del armador", "System diagram with setter infiltration", "Diagrama de sistema com infiltração do levantador")}>
        <rect x="98" y="48" width="324" height="324" fill="#0e1f18" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
        <rect x="98" y="36" width="324" height="12" fill="rgba(245, 158, 11, 0.4)" />
        <text x="260" y="26" textAnchor="middle" fontSize="13" fontWeight="900" fill="#F59E0B">RED</text>
        <line x1="98" y1="156" x2="422" y2="156" stroke="#F59E0B" strokeDasharray="8 6" strokeWidth="2" />
        {setterBackRow ? (
          <line x1={setterPos[0]} y1={setterPos[1]} x2={260} y2={70} stroke="#F59E0B" strokeWidth="4" strokeDasharray="10 7" markerEnd="url(#system-arrow)" />
        ) : null}
        <defs>
          <marker id="system-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#F59E0B" />
          </marker>
        </defs>
        {([1, 2, 3, 4, 5, 6] as number[]).map((zone) => {
          const [zx, zy] = zonePos(zone);
          const isSetter = zone === setterHome;
          const isFront = zone === 2 || zone === 3 || zone === 4;
          return (
            <g key={zone}>
              <circle cx={zx} cy={zy} r={28} fill={isSetter ? "#F59E0B" : isFront ? "#E11D48" : "#10B981"} stroke="#fff" strokeWidth="3" />
              <text x={zx} y={zy - 2} textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">{zone}</text>
              <text x={zx} y={zy + 16} textAnchor="middle" fontSize="10" fontWeight="900" fill="#F8FAFC">{isSetter ? "S" : isFront ? "AT" : "Z"}</text>
            </g>
          );
        })}
        <text x="260" y="386" textAnchor="middle" fontSize="13" fontWeight="900" fill="#c8ff00">
          {`${attackers} ${t(locale, "Atacantes en Red", "Front Attackers", "Atacantes na Rede")}`}
        </text>
      </svg>
      <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {report.systems.map((item) => (
          <div key={item.name} className={`rounded-xl border p-2 text-[11px] ${item.name === picked ? "border-volt bg-volt/10" : "border-white/10 bg-white/5"}`}>
            <p className="font-black text-white">{SYSTEM_META[item.name].icon} {item.name}</p>
            <p className="text-white/60">{t(locale, SYSTEM_META[item.name].description[0], SYSTEM_META[item.name].description[1], SYSTEM_META[item.name].description[2])}</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {item.frontAttackersByRotation.map((count, index) => (
                <span key={index} className="rounded-full bg-obsidian px-1.5 py-0.5 text-[9px] font-black text-volt">{`R${index + 1}:${count}`}</span>
              ))}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">{t(locale, "Mapa de infiltración por rotación", "Infiltration map by rotation", "Mapa de infiltração por rodízio")}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {([1, 2, 3, 4, 5, 6] as number[]).map((index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
            <p className="font-black text-volt">{`R${index}`}</p>
            <p className="text-white/70">{t(locale, SYSTEM_META[report.recommended].description[0], SYSTEM_META[report.recommended].description[1], SYSTEM_META[report.recommended].description[2])}</p>
          </div>
        ))}
      </div>
      <p className="rounded-lg border border-volt/40 bg-volt/10 px-2 py-1 text-[11px] font-bold text-volt">{report.message}</p>
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
  "system-transition": SystemTransitionStation,
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
