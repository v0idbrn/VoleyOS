"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { triggerCourtHaptics } from "@/lib/court-ux";
import { playCoinClink, playJudgeGavel, playWarmupTick, playWhistle } from "@/lib/sound-effects";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";
import {
  COURT_CRIES,
  GEAR_FLAGS,
  GEAR_LABELS,
  JUDGE_DISPUTES,
  WARMUP_PHASES,
  WARMUP_TOTAL_SECONDS,
  addPlayer,
  benchFairness,
  benchSwapMessage,
  buildOrganizer,
  buildPrizePoster,
  capacityLabel,
  dropPlayer,
  formatMatchSheet,
  formatMissingBanner,
  formatCents,
  judgeVerdict,
  missingCount,
  newBenchTeam,
  parseCents,
  rotateWithBench,
  settleVaquita,
  toggleGear,
  togglePaid,
  translateCry,
  warmupClock,
  warmupPhaseAt,
  type BenchEntry,
  type BenchTeamState,
  type GearFlag,
  type JudgeDispute,
  type JudgeVerdict,
  type OrganizerRoster,
} from "@/lib/casual-engines";
import { openPrintableReport, type ReportSpec } from "@/lib/offline-xlsx";
import {
  loadFlowRoster,
  loadSeason,
  saveFlowRoster,
  seasonStats,
  seasonSummaryText,
  seasonToCsv,
  trendPath,
  type SeasonMatch,
} from "@/lib/season-vault";
import { supporterChipActive } from "@/lib/support";
import { syncWidgetSnapshot } from "@/lib/widget-bridge";

const BTN =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const BTN_PRIMARY =
  "rounded-lg bg-crimson px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-imperial focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt";
const INPUT =
  "w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-volt";
const LABEL = "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50";
const CHIP_ON = "rounded-lg border border-volt bg-volt/15 px-2 py-1 text-[9px] font-bold text-volt";
const CHIP_OFF = "rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-white/50";

interface SuitePanelProps {
  locale: Locale;
  roster: OrganizerRoster | null;
  onRosterChange: (next: OrganizerRoster | null) => void;
  goToSection: (id: SuiteSection) => void;
}

/**
 * 🔄 Rotador Automático de 7 a 10 jugadores con el Banco: rotates the six
 * court zones on every side-out and swaps the next bench player in at the
 * chosen entry spot, tracking fair play-time per person.
 */
export function BenchRotator({ locale }: { locale: Locale }) {
  const [namesText, setNamesText] = useState("");
  const [entry, setEntry] = useState<BenchEntry>("serve");
  const [team, setTeam] = useState<BenchTeamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const pickEntry = (next: BenchEntry): void => {
    setEntry(next);
    setTeam((current) => (current ? { ...current, entry: next } : current));
  };

  const load = (): void => {
    const names = namesText
      .split(/[\n,;]+/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    try {
      setTeam(newBenchTeam(names, entry));
      setError(null);
      setBanner(null);
      triggerCourtHaptics(20);
    } catch {
      setTeam(null);
      setError(
        t(
          locale,
          "Cargá entre 7 y 10 jugadores únicos.",
          "Load 7 to 10 unique players.",
          "Carregue de 7 a 10 jogadores únicos.",
        ),
      );
    }
  };

  const rotate = (): void => {
    if (!team) return;
    const next = rotateWithBench(team);
    setTeam(next);
    if (next.lastSwap) setBanner(benchSwapMessage(next.lastSwap, locale));
    triggerCourtHaptics([30, 25, 30]);
  };

  const entryButtons = (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t(locale, "Punto de entrada", "Entry spot", "Ponto de entrada")}>
      <button
        type="button"
        aria-pressed={entry === "serve"}
        onClick={() => pickEntry("serve")}
        className={entry === "serve" ? CHIP_ON : CHIP_OFF}
      >
        {t(locale, "Entra al Saque (Posición I)", "Enters at Serve (Position I)", "Entra no Saque (Posição I)")}
      </button>
      <button
        type="button"
        aria-pressed={entry === "back"}
        onClick={() => pickEntry("back")}
        className={entry === "back" ? CHIP_ON : CHIP_OFF}
      >
        {t(locale, "Entra al Fondo (Posición VI)", "Enters at the Back (Position VI)", "Entra no Fundo (Posição VI)")}
      </button>
    </div>
  );

  return (
    <section className="vos-item-card space-y-2">
      <p className={LABEL}>🪇 {t(locale, "Rotador con banco (7-10)", "Bench rotator (7-10)", "Rodízio com banco (7-10)")}</p>
      {team === null ? (
        <>
          <textarea
            value={namesText}
            onChange={(event) => setNamesText(event.target.value)}
            rows={3}
            placeholder={"Ana\nBruno\nCarla\nDamián\nEugenia\nFlavio\nGaby\nHéctor"}
            aria-label={t(locale, "Jugadores del equipo", "Team players", "Jogadores do time")}
            className={`${INPUT} font-mono text-xs`}
          />
          {entryButtons}
          <button type="button" className={`${BTN_PRIMARY} w-full`} onClick={load}>
            ▶ {t(locale, "Cargar equipo", "Load squad", "Carregar time")}
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
            {team.court.map((name, index) => (
              <div
                key={`bench-zone-${index + 1}`}
                className={`rounded ${index === 0 ? "bg-volt/20 text-volt" : "bg-white/5"}`}
              >
                <p className="text-white/40">Z{index + 1}</p>
                <p className="truncate font-bold">{name}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/55">
            🪑 {t(locale, "Banca", "Bench", "Banco")}: {team.bench.join(", ") || "—"}
          </p>
          {banner ? (
            <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-[10px] font-semibold text-emerald">
              {banner}
            </p>
          ) : null}
          {entryButtons}
          <div className="flex flex-wrap gap-1">
            <button type="button" className={BTN} onClick={rotate}>
              🔄 {t(locale, "Rotar con el Banco", "Rotate with the Bench", "Rodar com o Banco")}
            </button>
            <button
              type="button"
              className={BTN}
              onClick={() => {
                setTeam(null);
                setBanner(null);
                setNamesText("");
              }}
            >
              ✕ {t(locale, "Vaciar", "Clear", "Limpar")}
            </button>
          </div>
          <ul className="space-y-0.5">
            {benchFairness(team).map((row) => (
              <li key={`fair-${row.name}`} className="flex justify-between rounded bg-white/5 px-2 py-0.5 text-[10px]">
                <span className="text-white/70">{row.name}</span>
                <span className="font-bold text-white/50">
                  {row.rotations} {t(locale, "rotaciones", "rotations", "rodízios")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {error ? (
        <p role="alert" className="text-[10px] font-semibold text-crimson">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/**
 * 📋 Armador de Lista de WhatsApp: bulk paste, smart parsing, waitlist
 * promotion on "se bajó", payment/gear checklist and 1-tap WhatsApp copy.
 */
export function WhatsAppMatchOrganizer({ locale, roster, onRosterChange }: SuitePanelProps) {
  const [paste, setPaste] = useState("");
  const [capacity, setCapacity] = useState(12);
  const [venue, setVenue] = useState(t(locale, "Cancha Municipal", "Municipal Court", "Quadra Municipal"));
  const [time, setTime] = useState("21:00");
  const [manual, setManual] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const build = (): void => {
    const next = buildOrganizer(paste, capacity, venue, time);
    onRosterChange(next);
    setToast(
      t(
        locale,
        `✅ ${next.confirmed.length} confirmados · ⏳ ${next.waitlist.length} en espera`,
        `✅ ${next.confirmed.length} confirmed · ⏳ ${next.waitlist.length} waiting`,
        `✅ ${next.confirmed.length} confirmados · ⏳ ${next.waitlist.length} na fila`,
      ),
    );
    triggerCourtHaptics(20);
  };

  const applyCapacity = (cap: number): void => {
    setCapacity(cap);
    if (!roster) return;
    const all = [...roster.confirmed, ...roster.waitlist];
    onRosterChange({ ...roster, capacity: cap, confirmed: all.slice(0, cap), waitlist: all.slice(cap) });
  };

  const addManual = (): void => {
    const base = roster ?? buildOrganizer([], capacity, venue, time);
    const before = base.confirmed.length + base.waitlist.length;
    const next = addPlayer(base, manual);
    onRosterChange(next);
    if (next.confirmed.length + next.waitlist.length === before) {
      setToast(t(locale, "Ese nombre ya estaba en la lista.", "That name was already on the list.", "Esse nome já estava na lista."));
    } else {
      setManual("");
      setToast(
        next.waitlist.length > 0 && !next.confirmed.some((player) => player.name === manual.trim())
          ? t(locale, "⬆️ La lista está llena: entró en espera.", "⬆️ Roster full: joined the waitlist.", "⬆️ Lista cheia: entrou na fila.")
          : t(locale, "✅ Jugador agregado.", "✅ Player added.", "✅ Jogador adicionado."),
      );
    }
  };

  const drop = (id: string): void => {
    if (!roster) return;
    const { roster: next, promoted } = dropPlayer(roster, id);
    onRosterChange(next);
    triggerCourtHaptics([25, 30]);
    setToast(
      promoted
        ? t(
            locale,
            `⬆️ Subió ${promoted.name} a la lista titular`,
            `⬆️ ${promoted.name} moved up to the main roster`,
            `⬆️ ${promoted.name} subiu pra lista titular`,
          )
        : t(locale, "⚠️ Se bajó de la lista.", "⚠️ Dropped off the roster.", "⚠️ Saiu da lista."),
    );
  };

  const copy = async (text: string, ok: string): Promise<void> => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast(ok);
      triggerCourtHaptics(15);
    } catch {
      setToast(
        t(locale, "El navegador bloqueó el copiado.", "The browser blocked copying.", "O navegador bloqueou a cópia."),
      );
    }
  };

  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>📋 {t(locale, "Armador de Lista de WhatsApp", "WhatsApp Roster Builder", "Montador de Lista do WhatsApp")}</p>
      <label className="block text-xs">
        <span className={LABEL}>{t(locale, "Pegá la lista del grupo", "Paste the group list", "Cole a lista do grupo")}</span>
        <textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={3}
          placeholder={"1. Tano\n2. Luci\n3. Marcos"}
          className={`${INPUT} mt-1 font-mono text-xs`}
        />
      </label>
      <div className="flex flex-wrap gap-1">
        {[8, 10, 12, 14, 16, 18].map((cap) => (
          <button
            key={cap}
            type="button"
            aria-pressed={capacity === cap}
            onClick={() => applyCapacity(cap)}
            className={capacity === cap ? CHIP_ON : CHIP_OFF}
          >
            {cap}
          </button>
        ))}
        <span className="self-center text-[10px] font-bold text-white/55">{capacityLabel(capacity, locale)}</span>
      </div>
      <div className="grid grid-cols-[1fr_5rem] gap-1">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Cancha / Sede", "Court / Venue", "Quadra / Local")}</span>
          <input value={venue} onChange={(event) => setVenue(event.target.value)} className={`${INPUT} mt-1 text-xs`} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Hora", "Time", "Hora")}</span>
          <input value={time} onChange={(event) => setTime(event.target.value)} className={`${INPUT} mt-1 text-xs`} />
        </label>
      </div>
      <button type="button" className={BTN_PRIMARY} onClick={build}>
        📋 {t(locale, "Armá la lista", "Build the roster", "Monte a lista")}
      </button>
      <div className="flex gap-1">
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder={t(locale, "Agregar a mano…", "Add manually…", "Adicionar à mão…")}
          aria-label={t(locale, "Agregar jugador manualmente", "Add player manually", "Adicionar jogador manualmente")}
          className={`${INPUT} text-xs`}
        />
        <button type="button" className={BTN} onClick={addManual}>
          +
        </button>
      </div>

      {roster ? (
        <>
          <p className="text-[11px] font-bold text-white/70">
            ✅ {t(locale, "Confirmados", "Confirmed", "Confirmados")} {roster.confirmed.length}/{roster.capacity}
          </p>
          <ul className="space-y-1">
            {roster.confirmed.map((player, index) => (
              <li key={player.id} className="space-y-1 rounded-lg bg-white/5 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] font-bold text-white/90">
                    {index + 1}. {player.name}
                  </span>
                  <button
                    type="button"
                    className={`${player.paid ? CHIP_ON : CHIP_OFF} shrink-0`}
                    aria-pressed={player.paid}
                    onClick={() => onRosterChange(togglePaid(roster, player.id))}
                  >
                    💸 {t(locale, "Seña/Pagó", "Deposit/Paid", "Sinal/Pagou")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {GEAR_FLAGS.map((flag) => (
                    <button
                      key={flag}
                      type="button"
                      aria-pressed={player.gear.includes(flag)}
                      onClick={() => onRosterChange(toggleGear(roster, player.id, flag))}
                      className={player.gear.includes(flag) ? CHIP_ON : CHIP_OFF}
                    >
                      {GEAR_LABELS[flag][locale]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => drop(player.id)}
                    className="rounded-lg border border-crimson/50 px-2 py-1 text-[9px] font-bold text-crimson"
                  >
                    😱 {t(locale, "¡Se bajó!", "Dropped out!", "Caiu!")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {roster.waitlist.length > 0 ? (
            <>
              <p className="text-[11px] font-bold text-white/55">
                ⏳ {t(locale, "Lista de Espera / Suplentes", "Waitlist / Substitutes", "Lista de Espera / Suplentes")}
              </p>
              <ul className="space-y-0.5">
                {roster.waitlist.map((player, index) => (
                  <li key={player.id} className="truncate px-1 text-[10px] text-white/50">
                    {index + 1}. {player.name}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[10px] font-semibold text-emerald">
              {t(locale, "✅ Cancha llena.", "✅ Full court.", "✅ Quadra cheia.")}
            </p>
          )}
          <button
            type="button"
            className={BTN}
            onClick={() => void copy(formatMatchSheet(roster, locale), t(locale, "📲 Lista copiada.", "📲 Roster copied.", "📲 Lista copiada."))}
          >
            📲 {t(locale, "Copiar Lista Actualizada para WhatsApp", "Copy Updated Roster for WhatsApp", "Copiar Lista Atualizada pro WhatsApp")}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={missingCount(roster) === 0}
            onClick={() =>
              void copy(
                formatMissingBanner(roster, locale),
                t(locale, "🚨 Cartel copiado.", "🚨 Sign copied.", "🚨 Cartaz copiado."),
              )
            }
          >
            🚨 {t(locale, 'Copiar Cartel "¡NOS FALTA 1 HOY!"', 'Copy "WE\'RE 1 SHORT TODAY" Sign', 'Copiar Cartaz "FALTA 1 PRA HOJE!"')}
          </button>
        </>
      ) : null}

      {toast ? (
        <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-[10px] font-semibold text-emerald">
          {toast}
        </p>
      ) : null}
    </section>
  );
}

/** ⚖️ El Juez del Picadito: captains agree on the observable, the app rules. */
function JudgePanel({ locale }: { locale: Locale }) {
  const [dispute, setDispute] = useState<JudgeDispute>("foot");
  const [accused, setAccused] = useState<"A" | "B">("A");
  const [verdict, setVerdict] = useState<JudgeVerdict | null>(null);
  const spec = JUDGE_DISPUTES[dispute];

  const rule = (fact: boolean): void => {
    setVerdict(judgeVerdict(dispute, fact, accused, locale));
    playJudgeGavel();
    triggerCourtHaptics(fact ? [30, 45, 30] : 22);
  };

  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>⚖️ {t(locale, "El Juez del Picadito", "The Pickup Judge", "O Juiz da Rachinha")}</p>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(JUDGE_DISPUTES) as JudgeDispute[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={dispute === id}
            onClick={() => {
              setDispute(id);
              setVerdict(null);
              triggerCourtHaptics(14);
            }}
            className={dispute === id ? CHIP_ON : CHIP_OFF}
          >
            {JUDGE_DISPUTES[id].icon} {JUDGE_DISPUTES[id].call[locale]}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-white/75">❓ {spec.question[locale]}</p>
      <div className="flex flex-wrap gap-1">
        <button type="button" aria-pressed={accused === "A"} onClick={() => setAccused("A")} className={accused === "A" ? CHIP_ON : CHIP_OFF}>
          {t(locale, "Acusado: Equipo A", "Accused: Team A", "Acusado: Time A")}
        </button>
        <button type="button" aria-pressed={accused === "B"} onClick={() => setAccused("B")} className={accused === "B" ? CHIP_ON : CHIP_OFF}>
          {t(locale, "Acusado: Equipo B", "Accused: Team B", "Acusado: Time B")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={BTN} onClick={() => rule(true)}>
          ✅ {t(locale, "Sí, pasó", "Yes, it happened", "Sim, aconteceu")}
        </button>
        <button type="button" className={BTN} onClick={() => rule(false)}>
          ❌ {t(locale, "No pasó", "No, it didn't", "Não aconteceu")}
        </button>
      </div>
      {verdict ? (
        <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1.5 text-[11px] font-semibold text-emerald">
          {verdict.text}
        </p>
      ) : null}
      <p className="text-[10px] leading-relaxed text-white/45">📜 {spec.rule[locale]}</p>
    </section>
  );
}

/** 📣 Traductor de Señas y Gritos: accent-insensitive three-way shout lookup. */
function CryTranslator({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const results = translateCry(query);
  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>📣 {t(locale, "Traductor de Señas y Gritos", "Signals & Shouts Translator", "Tradutor de Sinais e Gritos")}</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t(locale, "Buscar grito: mía, out, rotación…", "Search a shout: mine, out, rotate…", "Buscar grito: minha, fora, rodízio…")}
        aria-label={t(locale, "Buscar grito o señal", "Search shout or signal", "Buscar grito ou sinal")}
        className={INPUT}
      />
      <ul className="space-y-1">
        {results.map((cry) => (
          <li key={cry.id} className="rounded-lg bg-white/5 px-2 py-1.5">
            <p className="text-[11px] font-black text-white/90">
              {cry.es} <span className="text-white/40">→</span> <span className="text-volt">{cry.en}</span>{" "}
              <span className="text-white/40">·</span> <span className="text-emerald">{cry.pt}</span>
            </p>
            <p className="text-[10px] text-white/50">💬 {cry.when[locale]}</p>
          </li>
        ))}
        {results.length === 0 ? (
          <li className="text-[11px] text-white/45">
            {t(locale, "Sin resultados: probá con otra palabra.", "No results: try another word.", "Sem resultados: tente outra palavra.")}
          </li>
        ) : null}
      </ul>
      <p className="text-[10px] text-white/40">
        {results.length} {t(locale, "gritos encontrados", "shouts found", "gritos encontrados")}
      </p>
    </section>
  );
}

/** 🔥 Entrada en Calor Express: a strict 4-minute phased countdown. */
function WarmupExpress({ locale }: { locale: Locale }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const finished = elapsed >= WARMUP_TOTAL_SECONDS;
  const phase = warmupPhaseAt(elapsed);
  const phaseIndex = WARMUP_PHASES.indexOf(phase);
  const prevIndexRef = useRef(phaseIndex);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsed((value) => Math.min(WARMUP_TOTAL_SECONDS, value + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || finished) return;
    const remaining = phase.end - elapsed;
    if (remaining >= 1 && remaining <= 3) playWarmupTick(remaining === 1);
  }, [elapsed, running, finished, phase]);

  useEffect(() => {
    if (elapsed >= WARMUP_TOTAL_SECONDS) {
      setRunning(false);
      playWhistle("double");
      triggerCourtHaptics([40, 30, 60, 30, 60]);
    }
  }, [elapsed]);

  useEffect(() => {
    if (prevIndexRef.current !== phaseIndex) {
      prevIndexRef.current = phaseIndex;
      playWhistle("short");
      triggerCourtHaptics(24);
    }
  }, [phaseIndex]);

  const next = phaseIndex < WARMUP_PHASES.length - 1 ? WARMUP_PHASES[phaseIndex + 1] : undefined;

  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>🔥 {t(locale, "Entrada en Calor Express (4 min)", "Express Warmup (4 min)", "Aquecimento Express (4 min)")}</p>
      <div className="rounded-xl border border-white/10 bg-obsidian px-3 py-3 text-center">
        <p className="text-4xl font-black tabular-nums text-volt">{warmupClock(elapsed)}</p>
        <p className="text-[10px] uppercase tracking-widest text-white/45">
          {t(locale, "restante", "left", "restante")} {warmupClock(WARMUP_TOTAL_SECONDS - elapsed)}
        </p>
        <p className="mt-2 text-xs font-bold text-white/85">
          {phase.icon} {phase[locale]}
        </p>
        <p className="text-[10px] text-white/45">
          {next ? `⏭ ${warmupClock(next.start)} · ${next[locale]}` : t(locale, "🏁 Último tramo", "🏁 Final stretch", "🏁 Trecho final")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button type="button" className={BTN_PRIMARY} disabled={finished} onClick={() => setRunning((value) => !value)}>
          {running ? `⏸ ${t(locale, "Pausa", "Pause", "Pausa")}` : `▶ ${t(locale, "Empezar", "Start", "Começar")}`}
        </button>
        <button
          type="button"
          className={BTN}
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
        >
          ↺ {t(locale, "Reiniciar", "Reset", "Reiniciar")}
        </button>
      </div>
      <ol className="space-y-1">
        {WARMUP_PHASES.map((item, index) => (
          <li
            key={`warmup-${item.start}`}
            className={`rounded-lg px-2 py-1 text-[10px] ${index === phaseIndex ? "bg-volt/15 text-volt" : "bg-white/5 text-white/55"}`}
          >
            <span className="font-black">{item.icon} {warmupClock(item.start)}</span> {item[locale]}
            {index === phaseIndex ? <span className="font-bold"> ← {t(locale, "acá", "now", "agora")}</span> : null}
          </li>
        ))}
      </ol>
      {finished ? (
        <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-center text-[11px] font-semibold text-emerald">
          {t(
            locale,
            "🏁 Calentamiento completo: jugá el primer rally con cuidado.",
            "🏁 Warmup complete: take the first rally easy.",
            "🏁 Aquecimento completo: leve o primeiro rally com cuidado.",
          )}
        </p>
      ) : null}
    </section>
  );
}

/** 💰 La Vaquita 2.0 Compensada: fee, gear credits and pot settlement. */
function VaquitaPanel({ locale, roster, goToSection }: SuitePanelProps) {
  const [fee, setFee] = useState("0");
  const [pot, setPot] = useState("0");
  const [credits, setCredits] = useState<Record<GearFlag, string>>({ ball: "0", pump: "0", court: "0", water: "0" });
  const [notice, setNotice] = useState<string | null>(null);

  const feeCents = parseCents(fee);
  const potCents = parseCents(pot);
  const creditMap: Partial<Record<GearFlag, number>> = {};
  let creditsOk = true;
  for (const flag of GEAR_FLAGS) {
    const parsed = parseCents(credits[flag]);
    if (parsed === null) creditsOk = false;
    creditMap[flag] = parsed ?? 0;
  }
  const invalid = feeCents === null || potCents === null || !creditsOk;
  const players = roster?.confirmed ?? [];
  const report =
    invalid || feeCents === null || potCents === null || players.length === 0
      ? null
      : settleVaquita(players, feeCents, potCents, creditMap, locale);

  const copySettlement = async (): Promise<void> => {
    if (!report) return;
    const text = report.lines
      .map((line) =>
        line.status === "pays"
          ? `${line.name}: ${formatCents(line.owesCents)} ${t(locale, "por entrar", "to put in", "por entrar")}`
          : line.status === "refund"
            ? `${line.name}: ${formatCents(line.getsBackCents)} ${t(locale, "a cobrar", "to collect", "a receber")}`
            : `${line.name}: ✅ ${t(locale, "al día", "square", "em dia")}`,
      )
      .concat(report.summary)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      playCoinClink();
      setNotice(
        t(
          locale,
          "💰 Cierre copiado para WhatsApp.",
          "💰 Settlement copied for WhatsApp.",
          "💰 Fechamento copiado para o WhatsApp.",
        ),
      );
    } catch {
      setNotice(
        t(locale, "El navegador bloqueó el copiado.", "The browser blocked copying.", "O navegador bloqueou a cópia."),
      );
    }
  };

  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>💰 {t(locale, "La Vaquita 2.0 Compensada", "The Compensated Pot 2.0", "A Vaquinha 2.0 Compensada")}</p>
      {players.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center">
          <p className="text-[11px] text-white/55">
            {t(
              locale,
              "Armá la lista en 📋 primero: la vaquita se calcula sobre los confirmados.",
              "Build the roster in 📋 first: the pot settles over confirmed players.",
              "Monte a lista em 📋 primeiro: a vaquinha fecha sobre os confirmados.",
            )}
          </p>
          <button type="button" className={`${BTN} mt-2`} onClick={() => goToSection("lista")}>
            📋 {t(locale, "Ir a la Lista", "Go to the Roster", "Ir pra Lista")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1">
            <label className="text-xs">
              <span className={LABEL}>{t(locale, "Cuota por jugador", "Entry fee", "Taxa por jogador")}</span>
              <input
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                inputMode="decimal"
                className={`${INPUT} mt-1 text-xs`}
              />
            </label>
            <label className="text-xs">
              <span className={LABEL}>{t(locale, "Caja actual", "Pot on hand", "Caixa atual")}</span>
              <input
                value={pot}
                onChange={(event) => setPot(event.target.value)}
                inputMode="decimal"
                className={`${INPUT} mt-1 text-xs`}
              />
            </label>
          </div>
          <p className={LABEL}>{t(locale, "Compensación por equipo (crédito)", "Gear compensation (credit)", "Compensação por equipamento (crédito)")}</p>
          <div className="grid grid-cols-2 gap-1">
            {GEAR_FLAGS.map((flag) => (
              <label key={`credit-${flag}`} className="text-xs">
                <span className="text-[10px] text-white/55">{GEAR_LABELS[flag][locale]}</span>
                <input
                  value={credits[flag]}
                  onChange={(event) => setCredits((current) => ({ ...current, [flag]: event.target.value }))}
                  inputMode="decimal"
                  className={`${INPUT} mt-1 text-xs`}
                />
              </label>
            ))}
          </div>
          {invalid ? (
            <p role="alert" className="text-[10px] font-semibold text-crimson">
              {t(locale, "Importe inválido: usá 1000 o 1000.50.", "Invalid amount: use 1000 or 1000.50.", "Valor inválido: use 1000 ou 1000.50.")}
            </p>
          ) : null}
          {report ? (
            <>
              <ul className="space-y-0.5">
                {report.lines.map((line) => (
                  <li key={`vaquita-${line.id}`} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1 text-[10px]">
                    <span className="min-w-0 truncate font-bold text-white/75">
                      {line.status === "pays" ? "💳" : line.status === "refund" ? "💰" : "✅"} {line.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-white/55">
                      {line.status === "pays"
                        ? `${formatCents(line.owesCents)} ${t(locale, "por entrar", "to put in", "por entrar")}`
                        : line.status === "refund"
                          ? `${formatCents(line.getsBackCents)} ${t(locale, "a cobrar", "to collect", "a receber")}`
                          : line.alreadyPaidCents > 0
                            ? `${formatCents(line.alreadyPaidCents)} ${t(locale, "ya pagado", "already paid", "já pago")}`
                            : t(locale, "al día", "square", "em dia")}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                role="status"
                className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
                  report.shortfallCents > 0 ? "bg-crimson/15 text-crimson" : "bg-emerald/15 text-emerald"
                }`}
              >
                {report.summary}
              </p>
              <button type="button" className={BTN} data-testid="vaquita-copy" onClick={() => void copySettlement()}>
                📋 {t(locale, "Copiar cierre para WhatsApp", "Copy settlement for WhatsApp", "Copiar fechamento pro WhatsApp")}
              </button>
              {notice ? (
                <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-[10px] font-semibold text-emerald">
                  {notice}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

/** 🏆 Premios del Picadito: one-tap shareable SVG prize poster. */
function PrizePanel({ locale, roster }: SuitePanelProps) {
  const [champion, setChampion] = useState("");
  const [runnerUp, setRunnerUp] = useState("");
  const [mvp, setMvp] = useState("");
  const [pot, setPot] = useState("");
  const [date, setDate] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = (): void => {
    const cents = parseCents(pot.trim() || "0");
    if (!champion.trim()) {
      setError(t(locale, "Poné al campeón para generar el cartel.", "Enter the champion to build the poster.", "Coloque o campeão para gerar o cartaz."));
      return;
    }
    if (cents === null) {
      setError(t(locale, "Premio inválido: usá 1000 o 1000.50.", "Invalid prize: use 1000 or 1000.50.", "Prêmio inválido: use 1000 ou 1000.50."));
      return;
    }
    setPoster(
      buildPrizePoster({
        locale,
        champion: champion.trim(),
        potCents: cents,
        runnerUp: runnerUp.trim() || undefined,
        mvp: mvp.trim() || undefined,
        date: date.trim(),
        venue: roster?.venue,
        supporter: supporterChipActive(),
      }),
    );
    setError(null);
    setNotice(null);
    triggerCourtHaptics(25);
    window.dispatchEvent(new CustomEvent("voleyos:support-moment", { detail: "export" }));
  };

  const copy = async (): Promise<void> => {
    if (!poster) return;
    try {
      await navigator.clipboard.writeText(poster);
      setNotice(t(locale, "📋 SVG copiado.", "📋 SVG copied.", "📋 SVG copiado."));
      triggerCourtHaptics(15);
    } catch {
      setNotice(t(locale, "El navegador bloqueó el copiado.", "The browser blocked copying.", "O navegador bloqueou a cópia."));
    }
  };

  return (
    <section className="vos-section-card vos-stack">
      <p className={LABEL}>🏆 {t(locale, "Premios del Picadito", "Pickup Prizes", "Prêmios da Rachinha")}</p>
      <div className="grid grid-cols-2 gap-1">
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Campeón", "Champion", "Campeão")}</span>
          <input
            value={champion}
            onChange={(event) => setChampion(event.target.value)}
            placeholder={roster?.confirmed[0]?.name ?? t(locale, "Las Tiburonas", "The Sharks", "Os Tubarões")}
            className={`${INPUT} mt-1 text-xs`}
          />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Premio", "Prize", "Prêmio")}</span>
          <input value={pot} onChange={(event) => setPot(event.target.value)} inputMode="decimal" placeholder="1000" className={`${INPUT} mt-1 text-xs`} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>{t(locale, "Subcampeón", "Runner-up", "Vice-campeão")}</span>
          <input value={runnerUp} onChange={(event) => setRunnerUp(event.target.value)} className={`${INPUT} mt-1 text-xs`} />
        </label>
        <label className="text-xs">
          <span className={LABEL}>MVP</span>
          <input value={mvp} onChange={(event) => setMvp(event.target.value)} className={`${INPUT} mt-1 text-xs`} />
        </label>
        <label className="text-xs col-span-2">
          <span className={LABEL}>{t(locale, "Fecha (compartible)", "Date (shareable)", "Data (compartível)")}</span>
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="26/10/2026"
            className={`${INPUT} mt-1 text-xs`}
          />
        </label>
      </div>
      <button type="button" className={BTN_PRIMARY} onClick={generate}>
        🎨 {t(locale, "Generar cartel", "Build poster", "Gerar cartaz")}
      </button>
      {error ? (
        <p role="alert" className="text-[10px] font-semibold text-crimson">
          {error}
        </p>
      ) : null}
      {poster ? (
        <div className="space-y-1">
          <div dangerouslySetInnerHTML={{ __html: poster }} className="overflow-hidden rounded-xl border border-white/10" />
          <button type="button" className={BTN} onClick={() => void copy()}>
            📋 {t(locale, "Copiar SVG", "Copy SVG", "Copiar SVG")}
          </button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-[10px] font-semibold text-emerald">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

/** 🧭 Chained 5-step Picadito / weekend-tournament workflow bar. */
export const FLOW_STEPS = [
  { step: 1, icon: "1️⃣", label: { es: "Lista WhatsApp", en: "WhatsApp Roster", pt: "Lista WhatsApp" } },
  { step: 2, icon: "2️⃣", label: { es: "Armar Equipos / Cancha", en: "Build Teams / Court", pt: "Montar Times / Quadra" } },
  { step: 3, icon: "3️⃣", label: { es: "Jugar / Arbitrar", en: "Play / Officiate", pt: "Jogar / Arbitrar" } },
  { step: 4, icon: "4️⃣", label: { es: "Premios MVP", en: "MVP Prizes", pt: "Prêmios MVP" } },
  { step: 5, icon: "5️⃣", label: { es: "La Vaquita", en: "The Pot", pt: "A Vaquinha" } },
] as const;

/**
 * One-tap chain across the five Picadito steps. The roster saved in step 1
 * (and the match written by ⏱️ Cancha) is handed over through localStorage,
 * so every later step opens with the players, teams and score already there.
 */
export function FlowWizard({
  locale,
  current,
  onSelect,
}: {
  locale: Locale;
  current: number;
  onSelect?: (step: number) => void;
}) {
  const pick = (step: number): void => {
    triggerCourtHaptics(16);
    if (onSelect) {
      onSelect(step);
      return;
    }
    if (step === 3) {
      window.dispatchEvent(new CustomEvent("voleyos:open-scoreboard"));
      return;
    }
    const target = step === 1 ? "lista" : step === 2 ? "banco" : step === 4 ? "premios" : "vaquita";
    window.dispatchEvent(new CustomEvent("voleyos:open-suite", { detail: target }));
  };
  return (
    <nav
      data-testid="flow-wizard"
      aria-label={t(locale, "Flujo Picadito", "Pickup flow", "Fluxo Picadito")}
      className="flex gap-1 overflow-x-auto no-scrollbar rounded-2xl border border-volt/25 bg-volt/5 px-2 py-1.5"
    >
      {FLOW_STEPS.map((item) => (
        <button
          key={item.step}
          type="button"
          data-testid={`flow-step-${item.step}`}
          aria-current={current === item.step ? "step" : undefined}
          onClick={() => pick(item.step)}
          className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black leading-tight ${
            current === item.step ? "bg-volt text-obsidian" : "border border-white/10 text-white/60"
          }`}
        >
          {item.icon} {item.label[locale]}
        </button>
      ))}
    </nav>
  );
}

/** 🏆 Mi Temporada: local match history, streaks, rivalries and trend. */
function SeasonPanel({ locale }: { locale: Locale }) {
  const [history, setHistory] = useState<SeasonMatch[]>(() => loadSeason());
  const [notice, setNotice] = useState<string | null>(null);
  const stats = useMemo(() => seasonStats(history), [history]);

  const copySummary = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(seasonSummaryText(history, locale));
      setNotice(t(locale, "📲 Resumen copiado.", "📋 Summary copied.", "📋 Resumo copiado."));
    } catch {
      setNotice(
        t(locale, "El navegador bloqueó el copiado.", "The browser blocked copying.", "O navegador bloqueou a cópia."),
      );
    }
  };

  const exportCsv = (): void => {
    const csv = seasonToCsv(history);
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "voleyos-temporada.csv";
      link.click();
      URL.revokeObjectURL(url);
      setNotice(t(locale, "📄 CSV generado.", "📄 CSV generated.", "📄 CSV gerado."));
    } catch {
      void navigator.clipboard.writeText(csv).then(() =>
        setNotice(t(locale, "📄 CSV copiado.", "📄 CSV copied.", "📄 CSV copiado.")),
      );
    }
  };

  const printReport = (): void => {
    const spec: ReportSpec = {
      title: t(locale, "Mi Temporada", "My Season", "Minha Temporada"),
      module: "season",
      locale,
      generatedAt: new Date().toISOString(),
      sheets: [
        {
          name: t(locale, "Partidos", "Matches", "Jogos"),
          headers: [
            t(locale, "Fecha", "Date", "Data"),
            t(locale, "Partido", "Match", "Jogo"),
            t(locale, "Ganador", "Winner", "Vencedor"),
            t(locale, "Sets", "Sets", "Sets"),
          ],
          rows: history.map((match) => [
            match.date,
            `${match.teamA} ${match.setsA}-${match.setsB} ${match.teamB}`,
            match.winner === "A" ? match.teamA : match.teamB,
            match.setScores.map((set) => `${set.a}-${set.b}`).join(" / "),
          ]),
        },
      ],
    };
    void openPrintableReport(spec).then((opened) =>
      setNotice(
        opened
          ? t(locale, "🖨 Reporte listo para imprimir.", "🖨 Report ready to print.", "🖨 Relatório pronto para imprimir.")
          : t(locale, "Permití ventanas emergentes para imprimir.", "Allow pop-ups to print.", "Permita pop-ups para imprimir."),
      ),
    );
  };

  if (history.length === 0) {
    return (
      <section className="vos-section-card vos-stack">
        <p className={LABEL}>🏆 {t(locale, "Mi Temporada", "My Season", "Minha Temporada")}</p>
        <div className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center">
          <p className="text-[11px] text-white/55">
            {t(
              locale,
              "Todavía no guardaste partidos: cerrá uno en ⏱️ Cancha o tocá 💾 Guardar Partido.",
              "No matches yet: finish one in ⏱️ Court or tap 💾 Save Match.",
              "Ainda sem partidos: feche um na ⏱️ Cancha ou toque 💾 Salvar Partida.",
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="vos-section-card vos-stack" data-testid="season-vault">
      <p className={LABEL}>🏆 {t(locale, "Mi Temporada", "My Season", "Minha Temporada")}</p>
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <p className="text-lg font-black text-volt">{stats.matches}</p>
          <p className="text-[9px] uppercase text-white/45">{t(locale, "Partidos", "Matches", "Jogos")}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <p className="text-lg font-black text-volt">{stats.setsPlayed}</p>
          <p className="text-[9px] uppercase text-white/45">{t(locale, "Sets", "Sets", "Sets")}</p>
        </div>
        <div className="rounded-lg bg-white/5 px-1 py-2">
          <p className="text-lg font-black text-volt">{stats.bestStreak.streak > 0 ? `🔥${stats.bestStreak.streak}` : "—"}</p>
          <p className="truncate text-[9px] uppercase text-white/45">{stats.bestStreak.team}</p>
        </div>
      </div>

      <div>
        <p className={LABEL}>{t(locale, "Récord por equipo", "Record by team", "Recorde por time")}</p>
        <ul className="mt-1 space-y-0.5">
          {stats.winRates.slice(0, 5).map((row) => (
            <li key={`rate-${row.team}`} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1 text-[10px]">
              <span className="min-w-0 truncate font-bold text-white/75">{row.team}</span>
              <span className="shrink-0 tabular-nums text-white/55">
                {row.wins}-{row.played - row.wins} · {Math.round(row.rate * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className={LABEL}>{t(locale, "Tendencia de victorias", "Win trend", "Tendência de vitórias")}</p>
        <svg viewBox="0 0 240 60" className="mt-1 h-16 w-full rounded-lg bg-obsidian/70" role="img"
          aria-label={t(locale, "Tendencia de victorias", "Win trend", "Tendência de vitórias")}>
          <polyline
            data-testid="season-trend"
            points={trendPath(stats.trend.points)}
            fill="none"
            stroke="#FACC15"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[9px] text-white/45">{stats.trend.team} · {t(locale, "víctorias acumuladas", "cumulative wins", "vitórias acumuladas")}</p>
      </div>

      <div>
        <p className={LABEL}>{t(locale, "Clásicos del head-to-head", "Head-to-head classics", "Clássicos do confronto direto")}</p>
        <ul className="mt-1 space-y-0.5">
          {stats.rivalries.slice(0, 5).map((rivalry) => (
            <li key={`h2h-${rivalry.teamA}-${rivalry.teamB}`} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1 text-[10px]">
              <span className="min-w-0 truncate font-bold text-white/75">
                {rivalry.teamA} <span className="text-volt">{rivalry.winsA}</span> - <span className="text-volt">{rivalry.winsB}</span> {rivalry.teamB}
              </span>
              <span className="shrink-0 text-white/40">×{rivalry.total}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1">
        <button type="button" className={BTN} data-testid="season-whatsapp" onClick={() => void copySummary()}>
          📲 {t(locale, "WhatsApp", "WhatsApp", "WhatsApp")}
        </button>
        <button type="button" className={BTN} data-testid="season-csv" onClick={exportCsv}>
          📄 CSV
        </button>
        <button type="button" className={BTN} data-testid="season-print" onClick={printReport}>
          🖨 {t(locale, "PDF", "PDF", "PDF")}
        </button>
      </div>
      {notice ? (
        <p role="status" className="rounded-lg bg-emerald/15 px-2 py-1 text-[10px] font-semibold text-emerald">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

export type SuiteSection = "lista" | "banco" | "juez" | "senas" | "calor" | "vaquita" | "premios" | "temporada";

const SECTIONS: Array<{ id: SuiteSection; label: Record<Locale, string> }> = [
  { id: "lista", label: { es: "📋 Lista de WhatsApp", en: "📋 WhatsApp Roster", pt: "📋 Lista do WhatsApp" } },
  { id: "banco", label: { es: "🪇 Rotador con Banco", en: "🪇 Bench Rotator", pt: "🪇 Rodízio com Banco" } },
  { id: "juez", label: { es: "⚖️ El Juez", en: "⚖️ The Judge", pt: "⚖️ O Juiz" } },
  { id: "senas", label: { es: "📣 Señas & Gritos", en: "📣 Shouts & Calls", pt: "📣 Sinais & Gritos" } },
  { id: "calor", label: { es: "🔥 Calentamiento 4′", en: "🔥 4′ Warmup", pt: "🔥 Aquecimento 4′" } },
  { id: "vaquita", label: { es: "💰 La Vaquita 2.0", en: "💰 The Pot 2.0", pt: "💰 A Vaquinha 2.0" } },
  { id: "premios", label: { es: "🏆 Premios", en: "🏆 Prizes", pt: "🏆 Prêmios" } },
  { id: "temporada", label: { es: "🏆 Mi Temporada", en: "🏆 My Season", pt: "🏆 Minha Temporada" } },
];

const PANELS: Record<SuiteSection, (props: SuitePanelProps) => React.ReactElement> = {
  lista: WhatsAppMatchOrganizer,
  banco: BenchRotator,
  juez: JudgePanel,
  senas: CryTranslator,
  calor: WarmupExpress,
  vaquita: VaquitaPanel,
  premios: PrizePanel,
  temporada: SeasonPanel,
};

/** 🍻 Picadito & Amigos suite: pre-match organisation and bench rotation. */
const SECTION_STEP: Record<SuiteSection, number> = {
  lista: 1,
  banco: 2,
  juez: 3,
  senas: 0,
  calor: 0,
  vaquita: 5,
  premios: 4,
  temporada: 0,
};

export function CasualPlayerSuite({ locale, initialSection }: { locale: Locale; initialSection?: SuiteSection }) {
  const [section, setSection] = useState<SuiteSection>(initialSection ?? "lista");
  // The roster survives tab changes so step 1 hands its players to every
  // later step of the chained Picadito workflow.
  const [roster, setRoster] = useState<OrganizerRoster | null>(() => loadFlowRoster());
  const Panel = PANELS[section];
  const persistRoster = (next: OrganizerRoster | null): void => {
    setRoster(next);
    saveFlowRoster(next);
    syncWidgetSnapshot();
  };
  const selectStep = (step: number): void => {
    if (step === 3) {
      window.dispatchEvent(new CustomEvent("voleyos:open-scoreboard"));
      return;
    }
    const target = step === 1 ? "lista" : step === 2 ? "banco" : step === 4 ? "premios" : "vaquita";
    setSection(target);
    triggerCourtHaptics(16);
  };
  return (
    <div className="space-y-3">
      <FlowWizard locale={locale} current={SECTION_STEP[section]} onSelect={selectStep} />
      <div
        role="tablist"
        aria-label={t(locale, "Picadito & Amigos", "Pickup & Friends", "Picadito & Amigos")}
        className="flex flex-wrap gap-1.5"
      >
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => {
              setSection(item.id);
              triggerCourtHaptics(16);
            }}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              section === item.id ? "border-crimson bg-crimson text-white" : "border-white/10 text-white/60"
            }`}
          >
            {item.label[locale]}
          </button>
        ))}
      </div>
      <Panel locale={locale} roster={roster} onRosterChange={persistRoster} goToSection={setSection} />
    </div>
  );
}
