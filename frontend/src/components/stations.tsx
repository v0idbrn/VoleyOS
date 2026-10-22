"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { COPY, t } from "@/lib/i18n";
import {
  TEMPO_SPECS,
  analyseFiveFrames,
  awardBeachPoint,
  awardIndoorPoint,
  balanceTeams,
  beachSwitchInterval,
  buildLineupSlip,
  buildSeal,
  buildVolleyCard,
  classifyTiming,
  computeBlockShadow,
  computeSeam,
  computeSetterIQ,
  decideVar,
  defaultPositions,
  exportCapsule,
  heatmap,
  importCapsule,
  jumpLoad,
  newBeach,
  newScoreboard,
  overlayFromScoreboard,
  parsePlay,
  scoutingReport,
  standings,
  tempoWindow,
  validateOverlap,
  verifySeal,
  verticalJumpCm,
  type AttackZone,
  type Axis,
  type BlockScheme,
  type DailyJumps,
  type HeatCell,
  type JsonValue,
  type LineupNumbers,
  type Locale,
  type SeamFormation,
  type ServeType,
  type SetDistribution,
  type SixAttributes,
  type TempoCode,
  type ZonePoint,
} from "@/lib/local-engines";
import {
  PICKUP_SAMPLE,
  SCOUT_SAMPLE,
  TOURNAMENT_MATCHES,
  TOURNAMENT_TEAMS,
  acwrSample,
} from "@/lib/samples";
import type { ModuleMeta } from "@/lib/modules";

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
  return (
    <article className={CARD} id={`station-${meta.slug}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">
            Módulo {meta.number.toString().padStart(2, "0")}
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
      <div className="flex-1 text-sm text-white/80">{children}</div>
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
          <span className={LABEL}>Takeoff (ms)</span>
          <input className={INPUT} type="number" min={0} value={takeoff} onChange={(event) => setTakeoff(Number(event.target.value))} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>Landing (ms)</span>
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
        <span className={LABEL}>Rotación</span>
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
      <svg viewBox="0 0 900 700" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1a13]" role="img" aria-label="Cancha 9x9 con posiciones 5-1">
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

export function ScoutingStation({ meta, locale, onSave }: StationProps) {
  const [text, setText] = useState("Ataque del 7 por 4 diagonal punto");
  const parsed = useMemo(() => parsePlay(text), [text]);
  const report = useMemo(() => scoutingReport(SCOUT_SAMPLE), []);
  const cells = useMemo(() => heatmap(SCOUT_SAMPLE), []);

  return (
    <StationShell meta={meta} locale={locale} rows={report.attempts} onSave={onSave} onExample={() => setText("Saque del 4 al 5, pase A, ataque del 7 por 4 diagonal punto")}>
      <label className="text-xs">
        <span className={LABEL}>{t(locale, "Voz o texto (ES/EN)", "Voice or text (ES/EN)", "Voz ou texto (ES/EN)")}</span>
        <input className={INPUT} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
        <span className="rounded bg-crimson/20 px-2 py-1 text-crimson">#{parsed.player ?? "?"}</span>
        <span className="rounded bg-white/10 px-2 py-1">{parsed.skill}</span>
        <span className="rounded bg-white/10 px-2 py-1">Z{parsed.originZone ?? "?"}→Z{parsed.targetZone ?? "?"}</span>
        <span className="rounded bg-white/10 px-2 py-1">{parsed.direction}</span>
        <span className="rounded bg-emerald/20 px-2 py-1 text-emerald">{parsed.result}</span>
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

export function ScoreboardStation({ meta, locale, onSave }: StationProps) {
  const [state, setState] = useState(() => newScoreboard("Tiburones", "Cóndores", 3));
  const [message, setMessage] = useState(t(locale, "Elegí un equipo para sumar.", "Pick a team to score.", "Escolha um time para pontuar."));

  const point = (team: "A" | "B"): void => {
    try {
      const result = awardIndoorPoint(state, team);
      setState(result.state);
      setMessage(
        `${result.message}${result.rotated ? t(locale, " · rotación", " · rotation", " · rotação") : ""}${
          result.sideSwitchDue ? t(locale, " · cambio de lado", " · switch sides", " · troca de lado") : ""
        }`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error");
    }
  };

  return (
    <StationShell
      meta={meta}
      locale={locale}
      rows={6}
      onSave={onSave}
      onExample={() => {
        setState({ ...newScoreboard("Tiburones", "Cóndores", 3), scoreA: 22, scoreB: 20, setsA: 1, setsB: 1 });
        setMessage(t(locale, "Ejemplo cargado: set decisivo 22-20.", "Example loaded: decider 22-20.", "Exemplo carregado: set decisivo 22-20."));
      }}
    >
      <div className="rounded-xl border border-white/10 bg-obsidian/80 p-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50">
          <span>Set {state.setNumber} / {state.bestOf}</span>
          <span>{state.status === "finished" ? "FINAL" : `${state.streak} en racha`}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className={`rounded-lg py-2 ${state.serving === "A" ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`}>
            <p className="truncate text-xs font-bold">{state.teamA}</p>
            <p className="text-4xl font-black tabular-nums">{state.scoreA}</p>
            <p className="text-[10px] text-volt">Sets {state.setsA}</p>
          </div>
          <div className={`rounded-lg py-2 ${state.serving === "B" ? "bg-crimson/20 ring-1 ring-crimson" : "bg-white/5"}`}>
            <p className="truncate text-xs font-bold">{state.teamB}</p>
            <p className="text-4xl font-black tabular-nums">{state.scoreB}</p>
            <p className="text-[10px] text-volt">Sets {state.setsB}</p>
          </div>
        </div>
        <div className="mt-2 flex justify-center gap-2">
          <button type="button" className={BTN_PRIMARY} onClick={() => point("A")}>+ {state.teamA}</button>
          <button type="button" className={BTN_PRIMARY} onClick={() => point("B")}>+ {state.teamB}</button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-white/60">{message}</p>
      <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[10px]">
        {state.lineupA.map((player, index) => (
          <div key={`zone-${index + 1}`} className={`rounded ${index === 0 ? "bg-volt/20 text-volt" : "bg-white/5"}`}>
            <p className="text-white/40">Z{index + 1}</p>
            <p className="font-bold">#{player}</p>
          </div>
        ))}
      </div>
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
              <th>Equipo</th>
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
      <p className="mt-1 text-[10px] text-white/40">Rey de la Cancha: Tiburones → Cóndores → Panteras</p>
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
        <p className="text-[10px] text-white/50">Saque #{overlay.serverNumber} · racha {overlay.streak}</p>
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
        <label className="text-xs"><span className={LABEL}>Altura</span><input className={INPUT} type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label>
        <label className="text-xs"><span className={LABEL}>Reach</span><input className={INPUT} type="number" value={reach} onChange={(event) => setReach(Number(event.target.value))} /></label>
        <label className="text-xs"><span className={LABEL}>Salto</span><input className={INPUT} type="number" value={jump} onChange={(event) => setJump(Number(event.target.value))} /></label>
      </div>
      {card ? (
        <div className="mt-3 flex items-center gap-2">
          <RadarHex attributes={card.attributes} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-xs font-bold text-volt">{card.name}</p>
            <p className="text-[10px] text-white/50">{card.archetype} · {card.rarity}</p>
            <p className="text-[11px]">Ataque <strong className="text-crimson">{card.spikeReachCm.toFixed(1)} cm</strong></p>
            <p className="text-[11px]">Bloqueo <strong className="text-emerald">{card.blockReachCm.toFixed(1)} cm</strong></p>
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
        <Metric label="Ventana" value={`${window.startMs} / ${window.endMs}`} />
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
  const [load, setLoad] = useState(185);
  const days = useMemo(() => acwrDays(load), [load]);
  const report = useMemo(() => jumpLoad(days), [days]);
  const tone = report.color === "emerald" ? "text-emerald" : report.color === "amber" ? "text-volt" : "text-crimson";
  const bg = report.color === "emerald" ? "bg-emerald" : report.color === "amber" ? "bg-volt" : "bg-crimson";

  return (
    <StationShell meta={meta} locale={locale} rows={28} onSave={onSave} onExample={() => setLoad(185)}>
      <div className="flex items-center gap-2">
        {[{ label: "Suave", value: 110 }, { label: "Carga", value: 150 }, { label: "Alta", value: 185 }].map((option) => (
          <button key={option.value} type="button" onClick={() => setLoad(option.value)} className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${load === option.value ? "border-volt text-volt" : "border-white/10 text-white/50"}`}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Metric label="Aguda 7d" value={String(report.acute)} />
        <Metric label="Crónica" value={report.chronicWeekly.toFixed(1)} />
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
};
