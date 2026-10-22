"use client";

import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";

interface LiveRoom {
  room_id: string;
  module: string;
  title: string;
  state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  seal: string;
  sha256: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

function numberField(state: Record<string, unknown>, key: string, fallback = 0): number {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function points(state: Record<string, unknown>): { a: number; b: number } {
  const nested = state.points;
  if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
    const record = nested as Record<string, unknown>;
    return { a: numberField(record, "A"), b: numberField(record, "B") };
  }
  return { a: numberField(state, "score_a"), b: numberField(state, "score_b") };
}

function cards(state: Record<string, unknown>): string[] {
  if (!Array.isArray(state.cards)) return [];
  return state.cards.map((card) => {
    if (card === null || typeof card !== "object" || Array.isArray(card)) return "?";
    const record = card as Record<string, unknown>;
    return `${String(record.team ?? "?")} · ${String(record.type ?? record.kind ?? "card")}`;
  });
}

export function LiveRoomView({ roomId, locale }: { roomId: string; locale: Locale }) {
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/live/${encodeURIComponent(roomId)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as LiveRoom;
        if (active) {
          setRoom(payload);
          setError(null);
        }
      } catch {
        if (active) setError(t(locale, "Sala no disponible o sin conexión.", "Room unavailable or offline.", "Sala indisponível ou sem conexão."));
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [locale, roomId]);

  const score = points(room?.state ?? {});

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10">
      <a className="text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-volt" href={`/${locale}/`}>
        ← VolleyOS
      </a>
      <div className="mt-4 rounded-2xl border border-white/10 bg-panel/80 p-6 shadow-2xl shadow-black/40">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">
          {t(locale, "Sala en vivo", "Live room", "Sala ao vivo")} · {room?.module ?? "…"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{room?.title ?? roomId}</h1>
        {error ? <p className="mt-2 text-xs text-crimson">{error}</p> : null}
        <div className="mt-6 grid grid-cols-3 items-center gap-3 text-center">
          <div className="rounded-xl border border-white/10 bg-obsidian/60 p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40">A</p>
            <p className="text-5xl font-black tabular-nums text-volt">{score.a}</p>
          </div>
          <p className="text-xl font-black text-white/30">VS</p>
          <div className="rounded-xl border border-white/10 bg-obsidian/60 p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40">B</p>
            <p className="text-5xl font-black tabular-nums text-crimson">{score.b}</p>
          </div>
        </div>
        {cards(room?.state ?? {}).length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1 text-[10px]">
            {cards(room?.state ?? {}).map((card) => (
              <li key={card} className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200">{card}</li>
            ))}
          </ul>
        ) : null}
        {room ? (
          <div className="mt-6 space-y-1 text-[10px] text-white/40">
            <p>{t(locale, "Actualizada", "Updated", "Atualizada")}: {room.updated_at}</p>
            <p className="break-all font-mono text-volt">{room.seal}</p>
            <p className="break-all font-mono">SHA-256 {room.sha256}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
