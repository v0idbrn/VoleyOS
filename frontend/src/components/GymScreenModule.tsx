"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playWhistle } from "@/lib/court-audio";
import { DEFAULT_GYM_PAYLOAD, GYM_SCREEN } from "@/lib/gym-screen";
import { t } from "@/lib/i18n";
import { readLiveMatchSnapshot, type LiveMatchSnapshot } from "@/components/stations";
import type { Locale } from "@/lib/local-engines";

interface GymScreenModuleProps {
  locale: Locale;
  onClose: () => void;
}

export function GymScreenModule({ locale, onClose }: GymScreenModuleProps) {
  const [payload, setPayload] = useState<typeof DEFAULT_GYM_PAYLOAD>(DEFAULT_GYM_PAYLOAD);
  const [swapped, setSwapped] = useState(false);
  const [nameA, setNameA] = useState(t(locale, "EQUIPO A", "TEAM A", "EQUIPE A"));
  const [nameB, setNameB] = useState(t(locale, "EQUIPO B", "TEAM B", "EQUIPE B"));
  const [busSynced, setBusSynced] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // v11.2.0 — mirror the shared Live Match Bus snapshot (team names + score).
  useEffect(() => {
    const applySnapshot = (snapshot: LiveMatchSnapshot | null): void => {
      if (!snapshot?.teamA || !snapshot?.teamB) return;
      setBusSynced(true);
      setNameA(snapshot.teamA);
      setNameB(snapshot.teamB);
      setPayload((current) => ({
        ...current,
        scoreA: snapshot.scoreA,
        scoreB: snapshot.scoreB,
        setA: snapshot.setsA,
        setB: snapshot.setsB,
        service: snapshot.serving,
        rotation: snapshot.rotation,
        sanctions: snapshot.sanctions,
      }));
    };
    applySnapshot(readLiveMatchSnapshot());
    const onSync = (event: Event): void => applySnapshot((event as CustomEvent<LiveMatchSnapshot>).detail);
    window.addEventListener("voleyos-live-match-sync", onSync);
    return () => window.removeEventListener("voleyos-live-match-sync", onSync);
  }, []);

  useEffect(() => {
    const bridge = (window as Window & { VoleyOSBridge?: { openGymScreen?: (payload: typeof DEFAULT_GYM_PAYLOAD) => void } }).VoleyOSBridge;
    if (bridge?.openGymScreen) {
      bridge.openGymScreen(payload);
      onClose();
      return;
    }
  }, []);

  // v11.0.5 — a real running clock, not a one-tap-per-second button.
  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setPayload((current) => ({ ...current, timer: tick(current.timer) }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const element = rootRef.current;
    if (element && typeof element.requestFullscreen === "function") {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          setFullscreen(false);
        } else {
          await element.requestFullscreen();
          setFullscreen(true);
        }
        return;
      } catch {
        /* fall through to the CSS overlay */
      }
    }
    setFullscreen((current) => !current);
  }, []);

  useEffect(() => {
    const onFsChange = (): void => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const bump = useCallback((key: keyof typeof payload, delta: number) => {
    setPayload((current) => {
      const next = { ...current } as any;
      const value = current[key];
      if (typeof value === "number") {
        next[key] = Math.max(0, value + delta);
      }
      return next as typeof DEFAULT_GYM_PAYLOAD;
    });
  }, []);

  const timerMinutes = (): number => {
    const parts = payload.timer.split(":").map((value) => Number(value));
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  };
  const setTimerMinutes = (total: number): void => {
    const clamped = Math.max(0, total);
    setPayload((current) => ({ ...current, timer: `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}` }));
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Pantalla Gigante de Gimnasio", "Gym Giant Screen", "Tela Gigante do Ginásio")}
      className={`${fullscreen ? "fixed inset-0 z-[9995]" : "fixed inset-0 z-50"} overflow-y-auto bg-obsidian/95 p-4`}
    >
      <div className={`mx-auto flex min-h-full w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl shadow-black/60 ${fullscreen ? "justify-center" : ""}`}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">
            Módulo
          </p>
          {busSynced ? (
            <span data-testid="live-bus-sync-badge" className="text-[9px] font-bold uppercase tracking-wider text-emerald/70 bg-emerald/10 px-2 py-1 rounded">
              🔗 {t(locale, "Sincronizado con Cancha en Vivo", "Synced with Live Court", "Sincronizado com a Quadra ao Vivo")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="tap grid h-10 w-10 place-items-center rounded-xl text-lg text-white/45 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3">
            <input
              type="text"
              value={swapped ? nameB : nameA}
              onChange={(event) => (swapped ? setNameB(event.target.value) : setNameA(event.target.value))}
              aria-label={swapped ? t(locale, "Nombre Equipo B", "Team B name", "Nome Equipe B") : t(locale, "Nombre Equipo A", "Team A name", "Nome Equipe A")}
              className="w-full max-w-56 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-center text-[11px] font-black uppercase tracking-widest text-white/70 outline-none focus:border-volt"
            />
            <p className="text-8xl font-black text-crimson tabular-nums">{swapped ? payload.scoreB : payload.scoreA}</p>
            <p className="text-xl font-bold text-volt">Sets {swapped ? payload.setB : payload.setA}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bump(swapped ? "scoreB" : "scoreA", 1)}
                className="tap h-12 w-12 rounded-full bg-crimson/20 text-crimson text-2xl font-black hover:bg-crimson/40"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => bump(swapped ? "scoreB" : "scoreA", -1)}
                className="tap h-12 w-12 rounded-full bg-white/10 text-white/70 text-2xl font-black"
              >
                −1
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <p className="text-7xl font-black text-white tabular-nums">{payload.timer}</p>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="gym-timer-toggle-btn"
                aria-pressed={timerRunning}
                onClick={() => setTimerRunning((current) => !current)}
                className="tap h-12 rounded-full bg-volt/20 px-4 text-xl font-black text-volt hover:bg-volt/40"
              >
                {timerRunning ? "⏸️" : "▶️"}
              </button>
              <button
                type="button"
                onClick={() => setTimerMinutes(timerMinutes() + 60)}
                className="tap h-12 rounded-full bg-white/10 px-3 text-[11px] font-black text-white/80"
              >
                +1 Min
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerMinutes(0);
                }}
                className="tap h-12 rounded-full bg-crimson/20 px-3 text-[11px] font-black text-crimson"
              >
                ↺ Reset
              </button>
            </div>
            <button
              type="button"
              data-testid="gym-fullscreen-btn"
              onClick={() => void toggleFullscreen()}
              className="tap rounded-2xl bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white/80 hover:bg-white/20"
            >
              ⛶ {t(locale, "Pantalla Completa (TV / Proyector)", "Fullscreen (TV / Projector)", "Tela Cheia (TV / Projetor)")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSwapped((current) => !current);
                playWhistle("double");
              }}
              className="tap rounded-2xl bg-white/10 px-4 py-3 text-xl font-black text-volt hover:bg-white/20 vos-flash"
            >
              🔄 {t(locale, "Cambio de Cancha", "Swap Sides", "Troca de Lado")}
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            <input
              type="text"
              value={swapped ? nameA : nameB}
              onChange={(event) => (swapped ? setNameA(event.target.value) : setNameB(event.target.value))}
              aria-label={swapped ? t(locale, "Nombre Equipo A", "Team A name", "Nome Equipe A") : t(locale, "Nombre Equipo B", "Team B name", "Nome Equipe B")}
              className="w-full max-w-56 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-center text-[11px] font-black uppercase tracking-widest text-white/70 outline-none focus:border-volt"
            />
            <p className="text-8xl font-black text-crimson tabular-nums">{swapped ? payload.scoreA : payload.scoreB}</p>
            <p className="text-xl font-bold text-volt">Sets {swapped ? payload.setA : payload.setB}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bump(swapped ? "scoreA" : "scoreB", 1)}
                className="tap h-12 w-12 rounded-full bg-crimson/20 text-crimson text-2xl font-black hover:bg-crimson/40"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => bump(swapped ? "scoreA" : "scoreB", -1)}
                className="tap h-12 w-12 rounded-full bg-white/10 text-white/70 text-2xl font-black"
              >
                −1
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPayload((current) => ({ ...current, service: current.service === "A" ? "B" : "A" }))}
            className="tap h-16 rounded-2xl bg-crimson text-3xl font-black tracking-widest text-white hover:bg-imperial"
          >
            {payload.service === "A" ? t(locale, "Saque A", "Serve A", "Saque A") : t(locale, "Saque B", "Serve B", "Saque B")}
          </button>
          <button
            type="button"
            onClick={() => {
              const a = payload.scoreA;
              const b = payload.scoreB;
              if ((a >= 25 && a - b >= 2) || (b >= 25 && b - a >= 2)) {
                setPayload((current) => ({
                  ...current,
                  setA: current.setA + (a > b ? 1 : 0),
                  setB: current.setB + (b > a ? 1 : 0),
                  scoreA: 0,
                  scoreB: 0,
                  service: current.service === "A" ? "B" : "A",
                }));
              }
            }}
            className="tap h-16 rounded-2xl bg-volt text-xl font-black text-obsidian hover:bg-amber-400"
          >
            {t(locale, "Pasar Set", "Advance Set", "Passar Set")}
          </button>
          <button
            type="button"
            onClick={() => setPayload((current) => ({ ...current, setter: String(Number(current.setter) + 1) }))}
            className="tap h-16 rounded-2xl bg-white/10 text-3xl font-black text-white"
          >
            Setter {payload.setter}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-white/30">
          {GYM_SCREEN[locale].hint}
        </p>
      </div>
    </div>
  );
}

function tick(timer: string): string {
  const parts = timer.split(":").map((v) => Number(v));
  if (parts.length !== 2 || parts.some((v) => Number.isNaN(v))) return timer;
  const total = (parts[0] ?? 0) * 60 + (parts[1] ?? 0) + 1;
  const m = (total % 3600) % 60;
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
