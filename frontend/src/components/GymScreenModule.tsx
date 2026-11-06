"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playWhistle } from "@/lib/court-audio";
import { DEFAULT_GYM_PAYLOAD } from "@/lib/gym-screen";
import { t } from "@/lib/i18n";
import { readLiveMatchSnapshot, type LiveMatchSnapshot } from "@/components/stations";
import type { Locale } from "@/lib/local-engines";

interface GymScreenModuleProps {
  locale: Locale;
  onClose: () => void;
}

type Bridge = {
  openGymScreen?: (payload: typeof DEFAULT_GYM_PAYLOAD) => void;
  setSensorAutoRotateMode?: (mode: string) => void;
};

const ACCENT_A = "#E11D48";
const ACCENT_B = "#0EA5E9";

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
    const bridge = (window as Window & { VoleyOSBridge?: Bridge }).VoleyOSBridge;
    // v11.2.1 — let the phone rotate freely while the giant board is up.
    bridge?.setSensorAutoRotateMode?.("full_sensor");
    if (bridge?.openGymScreen) {
      bridge.openGymScreen(payload);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const next = { ...current } as Record<string, unknown>;
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

  // v11.2.1 — ✕ Salir: leave fullscreen and hand control back to the hub,
  // which lands on the Indoor 6v6 scoreboard (module-04).
  const exitBoard = useCallback((): void => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    window.dispatchEvent(new CustomEvent("voleyos-exit-gym-board"));
  }, []);

  const swapSides = useCallback((): void => {
    setSwapped((current) => !current);
    playWhistle("double");
  }, []);

  const teamCard = (side: "A" | "B", accent: string) => {
    const scoreKey = side === "A" ? "scoreA" : "scoreB";
    const setKey = side === "A" ? "setA" : "setB";
    return (
      <div
        style={{
          height: "100%",
          minHeight: 0,
          borderRadius: "22px",
          background: accent,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        }}
      >
        <input
          type="text"
          value={side === "A" ? nameA : nameB}
          onChange={(event) => (side === "A" ? setNameA(event.target.value) : setNameB(event.target.value))}
          aria-label={side === "A" ? t(locale, "Nombre Equipo A", "Team A name", "Nome Equipe A") : t(locale, "Nombre Equipo B", "Team B name", "Nome Equipe B")}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            width: "100%",
            textAlign: "center",
            color: "#FFFFFF",
            fontWeight: 900,
            textTransform: "uppercase",
            fontSize: "clamp(1rem, 3.2vmin, 2rem)",
          }}
        />
        <span
          style={{
            background: "rgba(0,0,0,0.35)",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "3px 12px",
            fontSize: "clamp(0.65rem, 1.8vmin, 1rem)",
            fontWeight: 800,
            letterSpacing: "0.08em",
          }}
        >
          {t(locale, "Sets", "Sets", "Sets")}: {side === "A" ? payload.setA : payload.setB}
        </span>
        <button
          type="button"
          aria-label={t(locale, "Punto para", "Point for", "Ponto para") + " " + (side === "A" ? nameA : nameB)}
          onClick={() => bump(scoreKey, 1)}
          style={{
            background: "transparent",
            border: "none",
            color: "#FFFFFF",
            fontSize: "clamp(4.5rem, 24vmin, 14rem)",
            lineHeight: 0.92,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {side === "A" ? payload.scoreA : payload.scoreB}
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => bump(scoreKey, 1)}
            style={{ minWidth: 54, minHeight: 42, borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#FFFFFF", fontSize: 16, fontWeight: 900, border: "1px solid rgba(255,255,255,0.25)" }}
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => bump(scoreKey, -1)}
            style={{ minWidth: 54, minHeight: 42, borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#FFFFFF", fontSize: 16, fontWeight: 900, border: "1px solid rgba(255,255,255,0.25)" }}
          >
            −1
          </button>
          <button
            type="button"
            onClick={() => bump(setKey, 1)}
            style={{ minWidth: 54, minHeight: 42, borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#FBBF24", fontSize: 14, fontWeight: 900, border: "1px solid rgba(255,255,255,0.25)" }}
          >
            +1 {t(locale, "Set", "Set", "Set")}
          </button>
        </div>
      </div>
    );
  };

  const dockBtn: React.CSSProperties = {
    minHeight: 42,
    borderRadius: 999,
    border: "none",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 900,
    color: "#FFFFFF",
    background: "rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };

  return (
    <div
      ref={rootRef}
      data-testid="gym-fullscreen-root"
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Pantalla Gigante de Gimnasio", "Gym Giant Screen", "Tela Gigante do Ginásio")}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 99990,
        background: "#05060A",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "12px 16px 76px 16px",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      {/* Top status strip */}
      <div
        style={{
          height: 36,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {busSynced ? (
            <span
              data-testid="live-bus-sync-badge"
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#34D399",
                background: "rgba(52,211,153,0.12)",
                borderRadius: 999,
                padding: "3px 10px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              🔗 {t(locale, "Sincronizado con Cancha en Vivo", "Synced with Live Court", "Sincronizado com a Quadra ao Vivo")}
            </span>
          ) : null}
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#FBBF24",
              background: "rgba(251,191,36,0.12)",
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
            SET {payload.setA}-{payload.setB}
          </span>
        </div>
        <span
          style={{
            fontSize: "clamp(1.3rem, 3.5vmin, 2.2rem)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 900,
            color: "#FBBF24",
          }}
        >
          {payload.timer}
        </span>
        <button
          type="button"
          data-testid="gym-exit-btn"
          onClick={exitBoard}
          style={{ ...dockBtn, background: "rgba(225,29,72,0.25)", color: "#FDA4AF" }}
        >
          ✕ {t(locale, "Salir", "Exit", "Sair")}
        </button>
      </div>

      {/* 50/50 arena */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        {teamCard(swapped ? "B" : "A", ACCENT_A)}
        {teamCard(swapped ? "A" : "B", ACCENT_B)}
      </div>

      {/* Bottom floating controls capsule */}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99995,
          background: "rgba(14, 16, 23, 0.92)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 999,
          padding: "6px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "96vw",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          data-testid="gym-timer-toggle-btn"
          aria-pressed={timerRunning}
          onClick={() => setTimerRunning((current) => !current)}
          style={{ ...dockBtn, fontSize: 18 }}
        >
          {timerRunning ? "⏸️" : "▶️"}
        </button>
        <button type="button" onClick={() => setTimerMinutes(timerMinutes() + 60)} style={dockBtn}>
          +1 Min
        </button>
        <button type="button" onClick={swapSides} style={dockBtn}>
          🔄 {t(locale, "Cambio de Cancha", "Swap Sides", "Troca de Lado")}
        </button>
        <button
          type="button"
          onClick={() => {
            setTimerRunning(false);
            setTimerMinutes(0);
            setPayload((current) => ({ ...current, scoreA: 0, scoreB: 0 }));
          }}
          style={{ ...dockBtn, color: "#FDA4AF" }}
        >
          ↺ Reset
        </button>
        <button type="button" data-testid="gym-fullscreen-btn" onClick={() => void toggleFullscreen()} style={dockBtn}>
          ⛶ {t(locale, "Pantalla Completa", "Fullscreen", "Tela Cheia")}
        </button>
        <button type="button" onClick={exitBoard} style={{ ...dockBtn, background: "rgba(225,29,72,0.25)", color: "#FDA4AF" }}>
          ✕ {t(locale, "Salir", "Exit", "Sair")}
        </button>
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
