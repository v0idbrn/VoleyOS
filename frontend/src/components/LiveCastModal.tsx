"use client";

import { copyTextUniversal } from "@/lib/security-shield";

import { useEffect, useRef, useState } from "react";

import { t } from "@/lib/i18n";
import {
  buildPacket,
  createBenchJoinUrl,
  createBenchPin,
  createHandoverUrl,
  createSpectatorUrl,
  decodeWhatsAppFreePulse,
  encodeWhatsAppFreePulse,
  setLocalLivePin,
  startLocalHotspotServer,
  subscribeLiveRoom,
  type LiveMatchPacket,
} from "@/lib/live-cast-engine";
import { newScoreboard, type Locale, type ScoreboardState } from "@/lib/local-engines";
import { persistLiveScoreboard } from "@/lib/court-ux";
import { renderQrSvg } from "@/lib/qr-transfer";

function t3(locale: Locale, es: string, en: string, pt: string): string {
  return t(locale, es, en, pt);
}

const BTN =
  "tap w-full rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white";
const FIELD =
  "w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-xs text-white outline-none focus:border-volt";
const LEGEND = "text-[10px] font-black uppercase tracking-[0.18em] text-white/45";

type CastTab = 1 | 2 | 3 | 4;

interface LiveCastModalProps {
  locale: Locale;
  state: ScoreboardState;
  roomId: string;
  hostSecret: string;
  onClose: () => void;
  /** Fires `true` once any broadcast mode is running (hotspot server or cloud relay). */
  onActiveChange?: (active: boolean) => void;
  /** Fires when the ntfy.sh cloud relay is toggled on/off from Mode 3. */
  onRelayChange?: (relaying: boolean) => void;
  initialTab?: CastTab;
  /** Spectator entry: a `CANCHA-XXXX` room (e.g. from a scanned `?room=` QR). */
  initialJoin?: string | null;
}

/** Best-effort offline clone of a received packet back into a live scoreboard. */
function packetToState(packet: LiveMatchPacket): ScoreboardState {
  return newScoreboard(packet.homeName, packet.awayName, 3, {
    matchFormat: packet.mode === "picadito" ? "short15" : "bo3",
    scoreA: packet.homeScore,
    scoreB: packet.awayScore,
    setsA: packet.homeSets,
    setsB: packet.awaySets,
    serving: packet.servingSide,
    isCourtSwapped: packet.isCourtSwapped,
    status: "live",
  });
}

/** Read-only giant scoreboard for spectators following a room. */
function SpectatorBoard({ packet, locale }: { packet: LiveMatchPacket; locale: Locale }) {
  return (
    <div data-testid="spectator-board" className="rounded-xl border border-white/10 bg-obsidian p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-crimson">
        📡 {t3(locale, "Sala en vivo", "Live room", "Sala ao vivo")} · {packet.roomId}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg py-2 ring-1 ring-white/10" style={{ background: `${packet.homeColor}22` }}>
          <p className="truncate px-1 text-[11px] font-black" style={{ color: packet.homeColor }}>
            {packet.homeName}
          </p>
          <p className="text-4xl font-black tabular-nums" data-testid="spectator-home">
            {packet.homeScore}
          </p>
          <p className="text-[10px] text-white/50">Sets {packet.homeSets}</p>
        </div>
        <div className="rounded-lg py-2 ring-1 ring-white/10" style={{ background: `${packet.awayColor}22` }}>
          <p className="truncate px-1 text-[11px] font-black" style={{ color: packet.awayColor }}>
            {packet.awayName}
          </p>
          <p className="text-4xl font-black tabular-nums" data-testid="spectator-away">
            {packet.awayScore}
          </p>
          <p className="text-[10px] text-white/50">Sets {packet.awaySets}</p>
        </div>
      </div>
      <p className="mt-2 text-[9px] uppercase tracking-widest text-white/45">
        ⚪ {t3(locale, "Saca", "Serving", "Saca")}: {packet.servingSide === "A" ? packet.homeName : packet.awayName}
      </p>
    </div>
  );
}

/**
 * v9.3.0 — 3-transport live broadcast cockpit:
 * 1. Zero-data Wi-Fi hotspot LAN server (pure Java, port 8765)
 * 2. "WhatsApp Gratis" VOS1: text pulse for 0-MB phones
 * 3. Cloud QR room (ntfy.sh SSE) + join-by-code spectator view
 * 4. Scorer battery handover QR
 */
export function LiveCastModal({
  locale,
  state,
  roomId,
  hostSecret,
  onClose,
  onActiveChange,
  onRelayChange,
  initialTab = 1,
  initialJoin = null,
}: LiveCastModalProps) {
  const [tab, setTab] = useState<CastTab>(initialJoin ? 3 : initialTab);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [benchPin, setBenchPin] = useState<string | null>(null);
  const [hotspotError, setHotspotError] = useState(false);
  const [pulse, setPulse] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);
  const [cloudUrl, setCloudUrl] = useState("");
  const [handoverUrl, setHandoverUrl] = useState("");
  const [relaying, setRelaying] = useState(false);
  const [joinInput, setJoinInput] = useState(initialJoin ?? "");
  const [joinCode, setJoinCode] = useState<string | null>(initialJoin);
  const [spectator, setSpectator] = useState<LiveMatchPacket | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ target: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const seqRef = useRef(0);

  const castMode = state.matchFormat === "short15" ? "picadito" : "oficial";

  /** Fresh signed packet for the current scoreboard. */
  const makePacket = async (): Promise<LiveMatchPacket> => {
    seqRef.current += 1;
    return buildPacket(state, { roomId, seq: seqRef.current, mode: castMode, hostSecret });
  };

  /* Build the per-tab artifact whenever the tab or the match changes. */
  useEffect(() => {
    let alive = true;
    if (tab === 2) {
      void (async () => {
        try {
          const packet = await makePacket();
          const text = await encodeWhatsAppFreePulse(packet);
          if (alive) setPulse(text);
        } catch {
          if (alive) setPulse("");
        }
      })();
    } else if (tab === 3) {
      void (async () => {
        try {
          const packet = await makePacket();
          if (alive) setCloudUrl(createSpectatorUrl(packet));
        } catch {
          if (alive) setCloudUrl("");
        }
      })();
    } else if (tab === 4) {
      void (async () => {
        try {
          const packet = await makePacket();
          if (alive) setHandoverUrl(createHandoverUrl(packet, hostSecret));
        } catch {
          if (alive) setHandoverUrl("");
        }
      })();
    }
    return () => {
      alive = false;
    };
    // makePacket closes over state; the effect re-runs on every score change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, state, roomId, hostSecret, castMode]);

  const benchUrl = serverUrl && benchPin ? createBenchJoinUrl(serverUrl, benchPin) : null;

  /* Render the QR for whatever URL the active tab shows. */
  const qrTarget =
    tab === 1 ? (benchUrl ?? serverUrl) : tab === 3 ? cloudUrl : tab === 4 ? handoverUrl : null;
  useEffect(() => {
    if (!qrTarget) {
      setQr(null);
      return;
    }
    let alive = true;
    void renderQrSvg(qrTarget)
      .then((svg) => {
        if (alive) setQr({ target: qrTarget, svg });
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [qrTarget]);

  /* Follow the joined room (cloud SSE + 3s poll fallback + local tabs). */
  useEffect(() => {
    if (tab !== 3 || !joinCode) {
      setSpectator(null);
      return;
    }
    let alive = true;
    const stop = subscribeLiveRoom(joinCode, (packet) => {
      if (alive) setSpectator(packet);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [tab, joinCode]);

  const startHotspot = (): void => {
    const url = startLocalHotspotServer();
    if (url) {
      // v10.0.0 bench mesh: arm a fresh 4-digit PIN before spectators arrive.
      const pin = createBenchPin();
      setLocalLivePin(pin);
      setBenchPin(pin);
      setServerUrl(url);
      setHotspotError(false);
      onActiveChange?.(true);
    } else {
      setHotspotError(true);
    }
  };

  const copyUrl = async (value: string): Promise<void> => {
    if (await copyTextUniversal(value)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendPulseToWhatsApp = (): void => {
    if (!pulse) return;
    try {
      window.open(`https://wa.me/?text=${encodeURIComponent(pulse)}`, "_blank", "noopener");
    } catch {
      /* popup blocked: the message stays copyable below */
    }
  };

  const clonePastedPulse = async (): Promise<void> => {
    const packet = await decodeWhatsAppFreePulse(pasteText);
    if (!packet) {
      setCloneMessage(
        t3(locale, "❌ No encontré ningún código VOS1: en el mensaje.", "❌ No VOS1: code found in that message.", "❌ Nenhum código VOS1: encontrado na mensagem."),
      );
      return;
    }
    persistLiveScoreboard(packetToState(packet));
    setCloneMessage(
      t3(locale, `✅ Partido clonado: ${packet.homeName} ${packet.homeScore} - ${packet.awayScore} ${packet.awayName}`, `✅ Match cloned: ${packet.homeName} ${packet.homeScore} - ${packet.awayScore} ${packet.awayName}`, `✅ Partida clonada: ${packet.homeName} ${packet.homeScore} - ${packet.awayScore} ${packet.awayName}`),
    );
  };

  const toggleRelay = (): void => {
    const next = !relaying;
    setRelaying(next);
    onRelayChange?.(next);
    if (next) onActiveChange?.(true);
  };

  const joinRoom = (): void => {
    const code = joinInput.trim().toUpperCase();
    if (!code.startsWith("CANCHA-")) {
      setSpectator(null);
      setJoinCode(null);
      setJoinError(
        t3(locale, "❌ El código debe ser CANCHA-XXXX.", "❌ The code must be CANCHA-XXXX.", "❌ O código precisa ser CANCHA-XXXX."),
      );
      return;
    }
    setJoinError(null);
    setJoinCode(code);
  };

  const TABS: { id: CastTab; label: string }[] = [
    { id: 1, label: `📶 ${t3(locale, "1. Hotspot Cancha (0% Internet)", "1. Court Hotspot (0% Internet)", "1. Hotspot da Quadra (0% Internet)")}` },
    { id: 2, label: `💬 ${t3(locale, '2. WhatsApp Gratis (VOS1:)', '2. Free WhatsApp (VOS1:)', '2. WhatsApp Grátis (VOS1:)')}` },
    { id: 3, label: `🌎 ${t3(locale, "3. Nube en Vivo (QR)", "3. Cloud Live (QR)", "3. Nuvem ao Vivo (QR)")}` },
    { id: 4, label: `🔋 ${t3(locale, "4. Pasar la Posta", "4. Battery Handover", "4. Passar a Posta")}` },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t3(locale, "Transmitir en vivo", "Broadcast live", "Transmitir ao vivo")}
      data-testid="live-cast-modal"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-panel p-4 text-white shadow-2xl">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[12px] font-black uppercase tracking-wider text-volt">
            📡 {t3(locale, "Transmitir en Vivo", "Broadcast Live", "Transmitir ao Vivo")}
            {relaying ? <span data-testid="live-badge" className="ml-2 animate-pulse text-crimson">🔴 EN VIVO</span> : null}
          </p>
          <button
            type="button"
            aria-label={t3(locale, "Cerrar", "Close", "Fechar")}
            onClick={onClose}
            className="tap grid h-8 w-8 place-items-center rounded-lg text-white/50"
          >
            ✕
          </button>
        </div>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          {t3(locale, `Sala ${roomId}`, `Room ${roomId}`, `Sala ${roomId}`)} · {t3(locale, "3 caminos + relevo de batería", "3 transports + battery handover", "3 transportes + troca de bateria")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-testid={`cast-mode-${entry.id}`}
              aria-pressed={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`tap rounded-lg border px-2 py-2 text-[9px] font-black leading-tight ${
                tab === entry.id ? "border-volt bg-volt/15 text-volt" : "border-white/10 text-white/55"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {tab === 1 ? (
            <div className="space-y-2">
              <p className="text-[10px] leading-relaxed text-white/65">
                1) {t3(locale, "Prendé 'Compartir Wi-Fi / Zona Wi-Fi' en tu celular (no gasta datos ni necesita saldo).", "Turn on 'Hotspot / Tethering' on your phone (uses no data and needs no balance).", "Ative 'Wi-Fi / Zona Wi-Fi' no seu celular (não gasta dados nem precisa de saldo).")}
                <br />
                2) {t3(locale, "Que tus amigos se conecten a tu Wi-Fi y escaneen este QR.", "Have your friends join your Wi-Fi and scan this QR.", "Deixe seus amigos conectarem ao seu Wi-Fi e escanear este QR.")}
              </p>
              <button type="button" data-testid="hotspot-start" className={`${BTN} bg-volt text-obsidian`} onClick={startHotspot}>
                ▶ {t3(locale, "Iniciar servidor de cancha (0 MB)", "Start court server (0 MB)", "Iniciar servidor da quadra (0 MB)")}
              </button>
              {serverUrl ? (
                <div className="space-y-1 text-center">
                  <div data-testid="hotspot-qr" className="mx-auto w-fit overflow-hidden rounded-lg bg-white p-1.5 [&_svg]:h-36 [&_svg]:w-36" dangerouslySetInnerHTML={{ __html: qr?.target === (benchUrl ?? serverUrl) ? qr.svg : "" }} />
                  <p data-testid="hotspot-url" className="break-all font-mono text-[10px] text-volt">{serverUrl}</p>
                  {benchPin ? (
                    <p data-testid="bench-pin" className="text-[10px] text-white/70">
                      🔑 {t3(locale, "PIN de la banca", "Bench PIN", "PIN do banco")}:{" "}
                      <span className="font-mono text-base font-black text-volt">{benchPin}</span>
                    </p>
                  ) : null}
                  {benchUrl ? (
                    <p data-testid="bench-url" className="break-all font-mono text-[9px] text-white/50">{benchUrl}</p>
                  ) : null}
                  <button type="button" className={`${BTN} border border-white/15 bg-white/5`} onClick={() => void copyUrl(serverUrl)}>
                    {copied ? t3(locale, "✓ Copiado", "✓ Copied", "✓ Copiado") : t3(locale, "📋 Copiar URL", "📋 Copy URL", "📋 Copiar URL")}
                  </button>
                </div>
              ) : hotspotError ? (
                <p data-testid="hotspot-error" className="text-[10px] text-amber-300">
                  ⚠️ {t3(locale, "El servidor corre solo dentro de la APK de Android.", "The server only runs inside the Android APK.", "O servidor roda apenas dentro do APK Android.")}
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === 2 ? (
            <div className="space-y-2">
              <p className="text-[10px] leading-relaxed text-white/65">
                {t3(locale, "Para los que solo tienen WhatsApp sin megas: el mensaje lleva el partido entero adentro (VOS1:), se clona 100% sin internet.", "For contacts with WhatsApp but no data plan: the message itself carries the whole match (VOS1:), cloned 100% offline.", "Para quem só tem WhatsApp sem dados: a mensagem carrega o jogo inteiro (VOS1:), clonada 100% offline.")}
              </p>
              <pre data-testid="wa-pulse-preview" className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-emerald/30 bg-emerald/5 p-2 text-[10px] leading-snug text-emerald">{pulse || "…"}</pre>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" data-testid="wa-send" className={`${BTN} bg-emerald text-obsidian`} onClick={sendPulseToWhatsApp}>
                  💬 {t3(locale, "Enviar a WhatsApp", "Send to WhatsApp", "Enviar ao WhatsApp")}
                </button>
                <button type="button" className={`${BTN} border border-white/15 bg-white/5`} onClick={() => void copyUrl(pulse)}>
                  📋 {t3(locale, "Copiar", "Copy", "Copiar")}
                </button>
              </div>
              <p className={LEGEND}>{t3(locale, "📥 Pegar Mensaje de WhatsApp (VOS1)", "📥 Paste WhatsApp Message (VOS1)", "📥 Colar Mensagem do WhatsApp (VOS1)")}</p>
              <textarea
                data-testid="wa-paste"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                rows={3}
                placeholder="🏐 *EN VIVO… VOS1:…"
                className={FIELD}
              />
              <button type="button" data-testid="wa-clone" className={`${BTN} border border-volt/50 bg-volt/10 text-volt`} onClick={() => void clonePastedPulse()}>
                🧬 {t3(locale, "Clonar partido sin internet", "Clone match offline", "Clonar partida offline")}
              </button>
              {cloneMessage ? <p data-testid="wa-clone-message" className="text-[10px] text-white/70">{cloneMessage}</p> : null}
            </div>
          ) : null}

          {tab === 3 ? (
            <div className="space-y-2">
              <div className="space-y-1 text-center">
                <div data-testid="cloud-qr" className="mx-auto w-fit overflow-hidden rounded-lg bg-white p-1.5 [&_svg]:h-36 [&_svg]:w-36" dangerouslySetInnerHTML={{ __html: qr?.target === cloudUrl ? qr.svg : "" }} />
                <p data-testid="cloud-url" className="break-all font-mono text-[9px] text-volt">{cloudUrl}</p>
                <p data-testid="cloud-room" className="text-[11px] font-black uppercase tracking-wider text-white/80">{roomId}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" className={`${BTN} border border-white/15 bg-white/5`} onClick={() => void copyUrl(cloudUrl)}>
                    {copied ? t3(locale, "✓ Copiado", "✓ Copied", "✓ Copiado") : t3(locale, "📋 Copiar enlace", "📋 Copy link", "📋 Copiar link")}
                  </button>
                  <button type="button" data-testid="relay-toggle" aria-pressed={relaying} className={`${BTN} ${relaying ? "bg-crimson" : "border border-crimson/50 bg-crimson/10 text-crimson"}`} onClick={toggleRelay}>
                    {relaying ? "🔴 EN VIVO" : `📡 ${t3(locale, "Activar nube", "Go live", "Ativar nuvem")}`}
                  </button>
                </div>
              </div>
              <p className={LEGEND}>👀 {t3(locale, "Unirse a sala (escribir código CANCHA-XXXX)", "Join room (type CANCHA-XXXX)", "Entrar na sala (digite CANCHA-XXXX)")}</p>
              <div className="grid grid-cols-[1fr_auto] gap-1.5">
                <input
                  data-testid="join-input"
                  value={joinInput}
                  onChange={(event) => setJoinInput(event.target.value)}
                  placeholder="CANCHA-XXXX"
                  className={FIELD}
                />
                <button type="button" data-testid="join-go" className={`${BTN} w-auto bg-volt px-3 text-obsidian`} onClick={joinRoom}>
                  👀
                </button>
              </div>
              {joinCode && spectator ? <SpectatorBoard packet={spectator} locale={locale} /> : null}
              {joinCode && !spectator ? (
                <p data-testid="join-waiting" className="text-center text-[10px] text-white/50">
                  ⏳ {t3(locale, "Esperando el marcador del anotador…", "Waiting for the scorer's board…", "Aguardando o placar do anotador…")}
                </p>
              ) : null}
              {joinError ? <p data-testid="join-error" className="text-[10px] text-amber-300">{joinError}</p> : null}
            </div>
          ) : null}

          {tab === 4 ? (
            <div className="space-y-2">
              <p className="text-[10px] leading-relaxed text-white/65">
                ⚠️ {t3(locale, "¿Batería baja? Escaneá este QR desde OTRA teléfono: el nuevo celular pasa a anotar la sala en vivo y este queda solo mirando.", "Low battery? Scan this QR from ANOTHER phone: the new phone takes over live scoring and this one becomes a spectator.", "Bateria baixa? Escaneie este QR de OUTRO celular: o novo celular assume o placar e este vira espectador.")}
              </p>
              <div className="space-y-1 text-center">
                <div data-testid="handover-qr" className="mx-auto w-fit overflow-hidden rounded-lg bg-white p-1.5 [&_svg]:h-36 [&_svg]:w-36" dangerouslySetInnerHTML={{ __html: qr?.target === handoverUrl ? qr.svg : "" }} />
                <p data-testid="handover-url" className="break-all font-mono text-[9px] text-amber-300">{handoverUrl}</p>
                <button type="button" className={`${BTN} border border-amber-300/40 bg-amber-300/10 text-amber-200`} onClick={() => void copyUrl(handoverUrl)}>
                  🔋 {t3(locale, "Copiar enlace de relevo", "Copy handover link", "Copiar link de troca")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
