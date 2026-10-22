"use client";

import { useEffect, useState } from "react";

import { awardIndoorPoint, newScoreboard, overlayFromScoreboard, type ScoreboardState } from "@/lib/local-engines";

const SPONSOR = "Mikasa Volt";

export function OverlayTv() {
  const [state, setState] = useState<ScoreboardState>(() => ({
    ...newScoreboard("Tiburones", "Cóndores", 3),
    scoreA: 24,
    scoreB: 22,
    setsA: 1,
    setsB: 1,
  }));
  const [paused, setPaused] = useState(false);
  const overlay = overlayFromScoreboard(state, SPONSOR);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setState((previous) => {
        if (previous.status !== "live") {
          return { ...newScoreboard("Tiburones", "Cóndores", 3), scoreA: 23, scoreB: 21, setsA: 1, setsB: 1 };
        }
        const team = (previous.scoreA + previous.scoreB) % 2 === 0 ? "B" : "A";
        try {
          return awardIndoorPoint(previous, team).state;
        } catch {
          return previous;
        }
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <main className="checker flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl" aria-live="polite">
        <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-2xl">
          <div className={`flex flex-1 flex-col justify-center border-l-8 px-6 py-5 transition ${overlay.teamA.serving ? "border-crimson" : "border-white/20"}`}>
            <p className="truncate text-lg font-black uppercase tracking-[0.18em] text-white">{overlay.teamA.name}</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-7xl font-black leading-none tabular-nums text-white">{overlay.teamA.points}</span>
              <span className="pb-2 text-sm font-bold text-volt">SETS {overlay.teamA.sets}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 border-x border-white/10 px-5 py-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Set {overlay.setNumber} / {overlay.bestOf}</p>
            {overlay.banner ? (
              <p className="animate-pulse rounded-md bg-crimson px-2 py-1 text-xs font-black uppercase tracking-wider text-white">{overlay.banner}</p>
            ) : (
              <p className="text-[10px] uppercase tracking-wider text-white/30">VolleyOS</p>
            )}
            <p className="text-[9px] text-white/40">Saque #{overlay.serverNumber} · Racha {overlay.streak}</p>
          </div>
          <div className={`flex flex-1 flex-col items-end justify-center border-r-8 px-6 py-5 text-right transition ${overlay.teamB.serving ? "border-crimson" : "border-white/20"}`}>
            <p className="truncate text-lg font-black uppercase tracking-[0.18em] text-white">{overlay.teamB.name}</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="pb-2 text-sm font-bold text-volt">SETS {overlay.teamB.sets}</span>
              <span className="text-7xl font-black leading-none tabular-nums text-white">{overlay.teamB.points}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/40">
          <span>Sponsor: {overlay.sponsor}</span>
          <span>Fondo transparente para OBS · 1920×1080</span>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setPaused((value) => !value)} className="rounded-lg bg-crimson px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
          {paused ? "Reanudar" : "Pausar"} demo
        </button>
        <button type="button" onClick={() => setState({ ...newScoreboard("Tiburones", "Cóndores", 3), scoreA: 24, scoreB: 22, setsA: 1, setsB: 1 })} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70">
          Reiniciar
        </button>
      </div>
      <p className="mt-4 max-w-md text-center text-[11px] leading-relaxed text-white/40">
        Agregá esta URL como Browser Source en OBS. El fondo cuadriculado es solo la vista previa; el overlay real es transparente.
      </p>
    </main>
  );
}
