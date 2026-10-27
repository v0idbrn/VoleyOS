"use client";

import { useEffect, useMemo, useState } from "react";

import { startBenchMesh, subscribeLiveRoom, type LiveMatchPacket } from "@/lib/live-cast-engine";
import {
  awardIndoorPoint,
  newScoreboard,
  overlayFromScoreboard,
  type ScoreboardState,
} from "@/lib/local-engines";

const SPONSOR = "Mikasa Volt";
/** EBU broadcast chroma green — key this color out in OBS. */
export const CHROMA_GREEN = "#00B140";

export interface TvParams {
  chroma: boolean;
  clean: boolean;
  room: string | null;
  base: string | null;
  pin: string | null;
}

/**
 * OBS Browser-Source params:
 *   ?chroma=1              solid chroma green instead of the preview checker
 *   ?clean=1               hide the preview controls (production overlay)
 *   ?room=CANCHA-XXXX      follow a cloud-relayed room (ntfy.sh)
 *   ?base=http://ip:8765   follow the zero-data LAN bench mesh…
 *   &pin=NNNN              …with its 4-digit bench PIN
 */
export function parseTvParams(search: string): TvParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const room = params.get("room");
  const base = params.get("base");
  const pin = params.get("pin");
  return {
    chroma: params.get("chroma") === "1",
    clean: params.get("clean") === "1",
    room: room && room.startsWith("CANCHA-") ? room : null,
    base: base && /^https?:\/\//u.test(base) ? base : null,
    pin: pin && /^\d{4}$/u.test(pin) ? pin : null,
  };
}

function parseSetHistory(raw: string): { setNumber: number; scoreA: number; scoreB: number }[] {
  return raw
    .split(",")
    .map((entry, index) => {
      const [scoreA, scoreB] = entry.split("-");
      const a = Number(scoreA);
      const b = Number(scoreB);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return { setNumber: index + 1, scoreA: a, scoreB: b };
    })
    .filter((entry): entry is { setNumber: number; scoreA: number; scoreB: number } => entry !== null);
}

/** Live packet → the scoreboard state the lower-third renders. */
function packetToState(packet: LiveMatchPacket): ScoreboardState {
  return {
    ...newScoreboard(packet.homeName, packet.awayName, 3, {
      matchFormat: packet.mode === "picadito" ? "short15" : "bo3",
      scoreA: packet.homeScore,
      scoreB: packet.awayScore,
      setsA: packet.homeSets,
      setsB: packet.awaySets,
      serving: packet.servingSide,
      isCourtSwapped: packet.isCourtSwapped,
      status: "live",
    }),
    setHistory: parseSetHistory(packet.setHistory),
  };
}

function demoBoard(): ScoreboardState {
  return {
    ...newScoreboard("Tiburones", "Cóndores", 3),
    scoreA: 24,
    scoreB: 22,
    setsA: 1,
    setsB: 1,
    setHistory: [
      { setNumber: 1, scoreA: 25, scoreB: 20 },
      { setNumber: 2, scoreA: 18, scoreB: 25 },
    ],
  };
}

export function OverlayTv({ search }: { search?: string } = {}) {
  const initial = typeof window === "undefined" ? "" : (search ?? window.location.search);
  const params = useMemo(() => parseTvParams(initial), [initial]);
  const [state, setState] = useState<ScoreboardState>(demoBoard);
  const [paused, setPaused] = useState(false);
  const [chroma, setChroma] = useState(params.chroma);
  const [livePacket, setLivePacket] = useState<LiveMatchPacket | null>(null);
  const [lanStatus, setLanStatus] = useState<"connecting" | "live" | "denied" | "offline">("connecting");
  const overlay = overlayFromScoreboard(state, SPONSOR);
  const following = params.room ?? (params.base && params.pin ? "LAN" : null);

  /* Live feed: cloud room, or the PIN-gated LAN bench mesh. */
  useEffect(() => {
    if (params.room) {
      return subscribeLiveRoom(params.room, (packet) => setLivePacket(packet));
    }
    if (params.base && params.pin) {
      setLanStatus("connecting");
      return startBenchMesh({
        base: params.base,
        pin: params.pin,
        onPacket: (packet) => setLivePacket(packet),
        onStatus: (status) =>
          setLanStatus(status === "ok" ? "live" : status === "denied" ? "denied" : "offline"),
      });
    }
    return undefined;
  }, [params.room, params.base, params.pin]);

  useEffect(() => {
    if (livePacket) setState(packetToState(livePacket));
  }, [livePacket]);

  /* Demo loop only when nothing is following a real feed. */
  useEffect(() => {
    if (following || paused) return;
    const timer = window.setInterval(() => {
      setState((previous) => {
        if (previous.status !== "live") return demoBoard();
        const team = (previous.scoreA + previous.scoreB) % 2 === 0 ? "B" : "A";
        try {
          return awardIndoorPoint(previous, team).state;
        } catch {
          return previous;
        }
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [following, paused]);

  const homeColor = livePacket?.homeColor ?? "#E11D48";
  const awayColor = livePacket?.awayColor ?? "#0EA5E9";

  return (
    <main
      data-testid="tv-stage"
      data-chroma={chroma ? "1" : "0"}
      className={`flex min-h-screen flex-col items-center justify-center p-4${chroma ? "" : " checker"}`}
      style={chroma ? { backgroundColor: CHROMA_GREEN } : undefined}
    >
      <div className="w-full max-w-5xl" aria-live="polite">
        <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/15 bg-black/85 shadow-2xl">
          <div
            className="flex flex-1 flex-col justify-center border-l-8 px-6 py-5 transition"
            style={{ borderLeftColor: overlay.teamA.serving ? homeColor : "rgba(255,255,255,0.2)" }}
          >
            <p className="truncate text-lg font-black uppercase tracking-[0.18em]" style={{ color: overlay.teamA.serving ? "#ffffff" : "#cbd5e1" }}>
              {overlay.teamA.name}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-7xl font-black leading-none tabular-nums text-white">{overlay.teamA.points}</span>
              <span className="pb-2 text-sm font-bold" style={{ color: homeColor }}>SETS {overlay.teamA.sets}</span>
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
          <div
            className="flex flex-1 flex-col items-end justify-center border-r-8 px-6 py-5 text-right transition"
            style={{ borderRightColor: overlay.teamB.serving ? awayColor : "rgba(255,255,255,0.2)" }}
          >
            <p className="truncate text-lg font-black uppercase tracking-[0.18em]" style={{ color: overlay.teamB.serving ? "#ffffff" : "#cbd5e1" }}>
              {overlay.teamB.name}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="pb-2 text-sm font-bold" style={{ color: awayColor }}>SETS {overlay.teamB.sets}</span>
              <span className="text-7xl font-black leading-none tabular-nums text-white">{overlay.teamB.points}</span>
            </div>
          </div>
        </div>
        {state.setHistory && state.setHistory.length > 0 ? (
          <div data-testid="tv-set-chips" className="mt-2 flex flex-wrap justify-center gap-1">
            {state.setHistory.map((entry) => (
              <span
                key={entry.setNumber}
                className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/70"
              >
                S{entry.setNumber} {entry.scoreA}-{entry.scoreB}
              </span>
            ))}
          </div>
        ) : null}
        {following ? (
          <p data-testid="tv-follow" className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">
            🔴 {following === "LAN" ? `MESH · ${params.base}` : `SALA · ${params.room}`}
            {params.base && params.pin && lanStatus !== "live" ? ` · ${lanStatus.toUpperCase()}` : ""}
          </p>
        ) : null}
        {livePacket?.lastEvent ? (
          <p data-testid="tv-ticker" className="mt-2 truncate rounded-lg bg-white/5 px-3 py-1 text-center text-[11px] font-semibold text-white/70">
            ▶ {livePacket.lastEvent}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/40">
          <span>Sponsor: {overlay.sponsor}</span>
          <span>
            {chroma
              ? `Clave de croma ${CHROMA_GREEN} · 1920×1080`
              : following
                ? "Overlay en vivo para OBS · 1920×1080"
                : "Fondo transparente para OBS · 1920×1080"}
          </span>
        </div>
      </div>
      {!params.clean ? (
        <div data-testid="tv-controls" className="mt-6 flex flex-wrap justify-center gap-2">
          {!following ? (
            <button
              type="button"
              data-testid="tv-pause"
              onClick={() => setPaused((value) => !value)}
              className="rounded-lg bg-crimson px-4 py-2 text-xs font-black uppercase tracking-wider text-white"
            >
              {paused ? "Reanudar" : "Pausar"} demo
            </button>
          ) : null}
          {!following ? (
            <button
              type="button"
              onClick={() => setState(demoBoard())}
              className="rounded-lg border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70"
            >
              Reiniciar
            </button>
          ) : null}
          <button
            type="button"
            data-testid="tv-chroma-toggle"
            onClick={() => setChroma((value) => !value)}
            className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wider ${
              chroma ? "border-white bg-white/10 text-white" : "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {chroma ? "🍃 Fondo chroma ON" : "🏁 Poner fondo chroma"}
          </button>
        </div>
      ) : null}
      <p className="mt-4 max-w-2xl text-center text-[11px] leading-relaxed text-white/40">
        Agregá esta URL como Browser Source en OBS. Parámetros: <code className="text-volt">?chroma=1</code> (fondo verde{" "}
        <code className="text-volt">{CHROMA_GREEN}</code> para clave de croma), <code className="text-volt">?clean=1</code>{" "}
        (oculta los controles), <code className="text-volt">?room=CANCHA-XXXX</code> o{" "}
        <code className="text-volt">?base=http://IP:8765&pin=NNNN</code> (marca en vivo). El fondo cuadriculado es solo la
        vista previa; el overlay real es transparente.
      </p>
    </main>
  );
}
