"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playWhistle } from "@/lib/court-audio";
import { DEFAULT_GYM_PAYLOAD, GYM_SCREEN } from "@/lib/gym-screen";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";

interface GymScreenModuleProps {
  locale: Locale;
  onClose: () => void;
}

export function GymScreenModule({ locale, onClose }: GymScreenModuleProps) {
  const [payload, setPayload] = useState<typeof DEFAULT_GYM_PAYLOAD>(DEFAULT_GYM_PAYLOAD);
  const [swapped, setSwapped] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bridge = (window as Window & { VoleyOSBridge?: { openGymScreen?: (payload: typeof DEFAULT_GYM_PAYLOAD) => void } }).VoleyOSBridge;
    if (bridge?.openGymScreen) {
      bridge.openGymScreen(payload);
      onClose();
      return;
    }
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

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Pantalla Gigante de Gimnasio", "Gym Giant Screen", "Tela Gigante do Ginásio")}
      className="fixed inset-0 z-50 grid place-items-center bg-obsidian/95 p-4"
    >
      <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-panel p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">
            Módulo
          </p>
          <button
            type="button"
            onClick={onClose}
            className="tap grid h-10 w-10 place-items-center rounded-xl text-lg text-white/45 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 grid aspect-video max-h-[70vh] grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {swapped ? t(locale, "Equipo B", "Team B", "Equipe B") : t(locale, "Equipo A", "Team A", "Equipe A")}
            </p>
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayload((current) => ({ ...current, timer: tick(current.timer) }))}
                className="tap h-12 w-12 rounded-full bg-white/10 text-white/70 text-xl font-black"
              >
                ⏱
              </button>
              <button
                type="button"
                onClick={() => setPayload((current) => ({ ...current, timer: "00:00" }))}
                className="tap h-12 w-12 rounded-full bg-crimson/20 text-crimson text-xl font-black"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
              {swapped ? t(locale, "Equipo A", "Team A", "Equipe A") : t(locale, "Equipo B", "Team B", "Equipe B")}
            </p>
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
