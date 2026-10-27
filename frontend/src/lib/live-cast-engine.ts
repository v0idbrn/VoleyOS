/**
 * VoleyOS Live Cast Engine (v9.3.0).
 *
 * One signed match snapshot, three transports:
 *   Mode A — WhatsApp "Free" text bridge: a rich visual message plus a
 *            `VOS1:<compact base64>` capsule that any phone can paste back to
 *            clone the board with 0 MB of balance.
 *   Mode B — Local hotspot LAN server: the host pushes the packet JSON into
 *            the Android bridge (`http://<LAN_IP>:8765/state`), spectators on
 *            the same Wi-Fi hotspot poll every 400ms with no internet at all.
 *   Mode C — Ultra-light cloud relay over `ntfy.sh` (SSE + 3s poll fallback +
 *            BroadcastChannel for local tabs), plus QR URLs for spectators and
 *            the battery-handover QR that passes the hostSecret to a new scorer.
 *
 * The host signs every packet with `hostSecret`; spectators only verify and
 * render, so they are strictly read-only.
 */

import type { ScoreboardState } from "@/lib/local-engines";
import { safeJsonParse } from "@/lib/security-shield";

export type CastMode = "picadito" | "rey" | "oficial";

export interface LiveMatchPacket {
  roomId: string;
  seq: number;
  timestamp: number;
  mode: CastMode;
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  homeScore: number;
  awayScore: number;
  homeSets: number;
  awaySets: number;
  /** Compact set history, e.g. "25-20,23-25". */
  setHistory: string;
  servingSide: "A" | "B";
  isCourtSwapped: boolean;
  lastEvent: string;
  /** 16-char hex public identifier derived from the host secret. */
  pubHash: string;
  /** 16-char SHA-256 signature computed with the hostSecret. */
  sig: string;
}

export const LAN_PORT = 8765;
export const PAGES_ORIGIN = "https://v0idbrn.github.io/VoleyOS";
const NTFY_BASE = "https://ntfy.sh";
const TOPIC_PREFIX = "vos_live_";
const CHANNEL_PREFIX = "vos_live_channel_";
const VOS1_PREFIX = "VOS1:";
const DEFAULT_HOME_COLOR = "#FF3B5C";
const DEFAULT_AWAY_COLOR = "#0EA5E9";
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* ------------------------------------------------------------------ */
/* Crypto helpers                                                      */
/* ------------------------------------------------------------------ */

/** First 16 hex chars of SHA-256 (deterministic fallback without WebCrypto). */
async function sha16Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }
  // Two-lane FNV-1a so unsigned builds without WebCrypto stay deterministic.
  let low = 0x811c9dc5;
  let high = 0x01000193;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high + code, 0x85ebca6b) >>> 0;
  }
  return low.toString(16).padStart(8, "0") + high.toString(16).padStart(8, "0");
}

function randomHex(chars: number): string {
  const bytes = new Uint8Array(Math.ceil(chars / 2));
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, chars);
}

/** `CANCHA-XXXX` room code (XXXX, unambiguous uppercase alphabet). */
export function createRoomId(random: () => number = Math.random): string {
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)] ?? "X";
  }
  return `CANCHA-${suffix}`;
}

/** 16-char hex host secret. Never leaves the scorer except via handover QR. */
export function createHostSecret(): string {
  return randomHex(16);
}

/** 16-char hex public key derived from the host secret. */
export async function derivePubHash(hostSecret: string): Promise<string> {
  return sha16Hex(`vos.pub:${hostSecret}`);
}

function compactSetHistory(state: ScoreboardState): string {
  return (state.setHistory ?? [])
    .map((entry) => `${entry.scoreA}-${entry.scoreB}`)
    .join(",");
}

function canonicalString(packet: LiveMatchPacket): string {
  return [
    packet.roomId,
    packet.seq,
    packet.timestamp,
    packet.mode,
    packet.homeName,
    packet.awayName,
    packet.homeColor,
    packet.awayColor,
    packet.homeScore,
    packet.awayScore,
    packet.homeSets,
    packet.awaySets,
    packet.setHistory,
    packet.servingSide,
    packet.isCourtSwapped ? 1 : 0,
    packet.lastEvent,
    packet.pubHash,
  ].join("|");
}

/** Stamp `pubHash` + `sig` so the packet is host-authentic. */
export async function signPacket(packet: LiveMatchPacket, hostSecret: string): Promise<LiveMatchPacket> {
  const pubHash = await derivePubHash(hostSecret);
  const unsigned: LiveMatchPacket = { ...packet, pubHash, sig: "" };
  const sig = await sha16Hex(`vos.sig:${hostSecret}:${canonicalString(unsigned)}`);
  return { ...unsigned, sig };
}

/** Spectators verify against the host secret they joined with (read-only). */
export async function verifyPacket(packet: LiveMatchPacket, hostSecret: string): Promise<boolean> {
  if (!/^[0-9a-f]{16}$/.test(packet.sig) || !/^[0-9a-f]{16}$/.test(packet.pubHash)) return false;
  const unsigned: LiveMatchPacket = { ...packet, sig: "" };
  const expected = await sha16Hex(`vos.sig:${hostSecret}:${canonicalString(unsigned)}`);
  return expected === packet.sig && packet.pubHash === (await derivePubHash(hostSecret));
}

export interface PacketOptions {
  roomId: string;
  seq: number;
  mode: CastMode;
  hostSecret: string;
  homeColor?: string;
  awayColor?: string;
  lastEvent?: string;
}

/** Build + sign a packet from the live scoreboard state. */
export async function buildPacket(state: ScoreboardState, options: PacketOptions): Promise<LiveMatchPacket> {
  return signPacket(
    {
      roomId: options.roomId,
      seq: options.seq,
      timestamp: Date.now(),
      mode: options.mode,
      homeName: state.teamA,
      awayName: state.teamB,
      homeColor: options.homeColor ?? DEFAULT_HOME_COLOR,
      awayColor: options.awayColor ?? DEFAULT_AWAY_COLOR,
      homeScore: state.scoreA,
      awayScore: state.scoreB,
      homeSets: state.setsA,
      awaySets: state.setsB,
      setHistory: compactSetHistory(state),
      servingSide: state.serving,
      isCourtSwapped: state.isCourtSwapped ?? false,
      lastEvent: options.lastEvent ?? "",
      pubHash: "",
      sig: "",
    },
    options.hostSecret,
  );
}

function modeLabel(mode: CastMode, override?: string): string {
  if (override) return override;
  if (mode === "picadito") return "Picadito";
  if (mode === "rey") return "Rey de la Cancha";
  return "Oficial";
}

/* ------------------------------------------------------------------ */
/* Mode A — WhatsApp "Free" text bridge (VOS1:)                        */
/* ------------------------------------------------------------------ */

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function compactTuple(packet: LiveMatchPacket): unknown[] {
  return [
    packet.roomId,
    packet.seq,
    packet.timestamp,
    packet.mode,
    packet.homeName,
    packet.awayName,
    packet.homeColor,
    packet.awayColor,
    packet.homeScore,
    packet.awayScore,
    packet.homeSets,
    packet.awaySets,
    packet.setHistory,
    packet.servingSide,
    packet.isCourtSwapped ? 1 : 0,
    packet.lastEvent,
    packet.pubHash,
    packet.sig,
  ];
}

function packetFromTuple(raw: unknown): LiveMatchPacket | null {
  if (!Array.isArray(raw) || raw.length < 18) return null;
  const [
    roomId, seq, timestamp, mode, homeName, awayName, homeColor, awayColor,
    homeScore, awayScore, homeSets, awaySets, setHistory, servingSide,
    swapped, lastEvent, pubHash, sig,
  ] = raw as [
    unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
    unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  ];
  if (typeof roomId !== "string" || !roomId.startsWith("CANCHA-")) return null;
  if (typeof seq !== "number" || typeof timestamp !== "number") return null;
  if (mode !== "picadito" && mode !== "rey" && mode !== "oficial") return null;
  if (typeof homeName !== "string" || typeof awayName !== "string") return null;
  if (typeof homeColor !== "string" || typeof awayColor !== "string") return null;
  if (typeof homeScore !== "number" || typeof awayScore !== "number") return null;
  if (typeof homeSets !== "number" || typeof awaySets !== "number") return null;
  if (typeof setHistory !== "string") return null;
  if (servingSide !== "A" && servingSide !== "B") return null;
  if (typeof lastEvent !== "string" || typeof pubHash !== "string" || typeof sig !== "string") return null;
  return {
    roomId,
    seq,
    timestamp,
    mode,
    homeName,
    awayName,
    homeColor,
    awayColor,
    homeScore,
    awayScore,
    homeSets,
    awaySets,
    setHistory,
    servingSide,
    isCourtSwapped: swapped === 1 || swapped === true,
    lastEvent,
    pubHash,
    sig,
  };
}

/**
 * Rich visual WhatsApp message + `VOS1:` capsule. Works on phones that only
 * have carrier "Free WhatsApp" (0 MB balance): the text itself carries the
 * whole scoreboard.
 */
export async function encodeWhatsAppFreePulse(packet: LiveMatchPacket, label?: string): Promise<string> {
  const payload = toBase64Url(JSON.stringify(compactTuple(packet)));
  const serving = packet.servingSide === "A" ? packet.homeName : packet.awayName;
  const lines = [
    `🏐 *EN VIVO: ${packet.homeName} ${packet.homeScore} - ${packet.awayScore} ${packet.awayName}* (Sets: ${packet.homeSets}-${packet.awaySets})`,
    `🔥 Saca: ${serving} · Modo: ${modeLabel(packet.mode, label)}`,
    `📲 _Copiá este mensaje y abrí VoleyOS para clonar el tablero sin internet:_`,
    `${VOS1_PREFIX}${payload}`,
  ];
  return lines.join("\n");
}

/** Extract `VOS1:` from any pasted WhatsApp message and rebuild the packet. */
export async function decodeWhatsAppFreePulse(text: string): Promise<LiveMatchPacket | null> {
  const match = /VOS1:([A-Za-z0-9_-]+)/u.exec(text);
  if (!match || !match[1]) return null;
  try {
    const raw: unknown = safeJsonParse<unknown>(fromBase64Url(match[1]), null);
    return packetFromTuple(raw);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Mode B — local hotspot LAN server                                   */
/* ------------------------------------------------------------------ */

interface LocalBridge {
  startLocalHotspotServer?: () => string;
  updateLocalLiveServer?: (jsonPayload: string) => void;
  setLocalLivePin?: (pin: string) => void;
}

function localBridge(): LocalBridge | null {
  const bridge = (globalThis as typeof globalThis & { VoleyOSBridge?: LocalBridge }).VoleyOSBridge;
  return bridge ?? null;
}

/** `http://<LAN_IP>:8765` for a raw IP, or null outside the APK. */
export function localServerBase(ip: string): string {
  return `http://${ip}:${LAN_PORT}`;
}

/** Ask the Android bridge to boot the pure-Java hotspot server (returns its URL). */
export function startLocalHotspotServer(): string | null {
  const bridge = localBridge();
  const url = bridge?.startLocalHotspotServer?.();
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Push the latest packet JSON into the native server (no-op on the web). */
export function pushLocalLiveServer(packet: LiveMatchPacket): boolean {
  const bridge = localBridge();
  if (!bridge?.updateLocalLiveServer) return false;
  try {
    bridge.updateLocalLiveServer(JSON.stringify(packet));
    return true;
  } catch {
    return false;
  }
}

type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>;

function isPacket(value: unknown): value is LiveMatchPacket {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<LiveMatchPacket>;
  return typeof candidate.roomId === "string" && typeof candidate.homeScore === "number" && typeof candidate.sig === "string";
}

/** Single GET of `http://<LAN_IP>:8765/state` (spectator, 0 internet). */
export async function pollLocalState(base: string, fetchImpl?: FetchLike): Promise<LiveMatchPacket | null> {
  const doFetch = fetchImpl ?? (typeof fetch === "function" ? (fetch as unknown as FetchLike) : null);
  if (!doFetch) return null;
  try {
    const response = await doFetch(`${base.replace(/\/$/u, "")}/state`);
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isPacket(payload) ? payload : null;
  } catch {
    return null;
  }
}

/** 400ms spectator loop over local Wi-Fi. Returns a stop function. */
export function startSpectatorPoll(
  base: string,
  onPacket: (packet: LiveMatchPacket) => void,
  options: { intervalMs?: number; fetchImpl?: FetchLike } = {},
): () => void {
  const interval = options.intervalMs ?? 400;
  const timer = globalThis.setInterval(() => {
    void pollLocalState(base, options.fetchImpl).then((packet) => {
      if (packet) onPacket(packet);
    });
  }, interval);
  return () => globalThis.clearInterval(timer);
}

/* ------------------------------------------------------------------ */
/* Mode B+ — PIN bench mesh on :8765 (v10.0.0)                         */
/* ------------------------------------------------------------------ */

/** 4-digit PIN gating `/state` + the giant bench scoreboard (0000–9999). */
export function createBenchPin(random: () => number = Math.random): string {
  const value = Math.floor(random() * 10000);
  if (!Number.isFinite(value) || value < 0 || value > 9999) return "1901";
  return String(value).padStart(4, "0");
}

export function isValidBenchPin(pin: string): boolean {
  return /^\d{4}$/u.test(pin);
}

/** `http://<ip>:8765/?pin=NNNN` — the PIN-locked bench mesh entry QR. */
export function createBenchJoinUrl(base: string, pin: string): string {
  return `${base.replace(/\/$/u, "")}/?pin=${encodeURIComponent(pin)}`;
}

/** Arms (or clears with "") the PIN inside the native hotspot server. */
export function setLocalLivePin(pin: string): boolean {
  const bridge = localBridge();
  if (!bridge?.setLocalLivePin) return false;
  try {
    bridge.setLocalLivePin(pin);
    return true;
  } catch {
    return false;
  }
}

export type BenchPollStatus = "ok" | "denied" | "offline";

export interface BenchPollResult {
  status: BenchPollStatus;
  packet: LiveMatchPacket | null;
}

/**
 * PIN-aware GET of `/state?pin=NNNN`. 403 means the PIN was refused (the
 * mesh owner rotated it); anything else that fails is plain offline.
 */
export async function pollBenchState(
  base: string,
  pin: string,
  fetchImpl?: FetchLike,
): Promise<BenchPollResult> {
  const doFetch = fetchImpl ?? (typeof fetch === "function" ? (fetch as unknown as FetchLike) : null);
  if (!doFetch) return { status: "offline", packet: null };
  try {
    const response = await doFetch(`${base.replace(/\/$/u, "")}/state?pin=${encodeURIComponent(pin)}`);
    if (response.status === 403) return { status: "denied", packet: null };
    if (!response.ok) return { status: "offline", packet: null };
    const payload: unknown = await response.json();
    return isPacket(payload) ? { status: "ok", packet: payload } : { status: "offline", packet: null };
  } catch {
    return { status: "offline", packet: null };
  }
}

export interface BenchMeshOptions {
  base: string;
  pin: string;
  onPacket: (packet: LiveMatchPacket) => void;
  onStatus?: (status: BenchPollStatus) => void;
  intervalMs?: number;
  fetchImpl?: FetchLike;
}

/** 400ms PIN-gated spectator loop for bench screens. Returns a stop function. */
export function startBenchMesh(options: BenchMeshOptions): () => void {
  const timer = globalThis.setInterval(() => {
    void pollBenchState(options.base, options.pin, options.fetchImpl).then((result) => {
      if (result.packet) options.onPacket(result.packet);
      options.onStatus?.(result.status);
    });
  }, options.intervalMs ?? 400);
  return () => globalThis.clearInterval(timer);
}

/* ------------------------------------------------------------------ */
/* Mode C — cloud SSE relay (ntfy.sh) + handover                       */
/* ------------------------------------------------------------------ */

export function ntfyTopic(roomId: string): string {
  return `${TOPIC_PREFIX}${roomId}`;
}

function channel(roomId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(`${CHANNEL_PREFIX}${roomId}`);
  } catch {
    return null;
  }
}

type PostLike = (input: string, init: { method: string; body: string; headers: Record<string, string> }) => Promise<{ ok: boolean }>;

/** Publish a packet: ntfy.sh POST + BroadcastChannel for tabs on this device. */
export async function publishLiveUpdate(packet: LiveMatchPacket, postImpl?: PostLike): Promise<boolean> {
  const body = JSON.stringify(packet);
  let delivered = false;
  const poster = postImpl ?? (typeof fetch === "function" ? (fetch as unknown as PostLike) : null);
  if (poster) {
    try {
      const response = await poster(`${NTFY_BASE}/${ntfyTopic(packet.roomId)}`, {
        method: "POST",
        body,
        headers: { Title: `VoleyOS ${packet.roomId}`, Tags: "volleyball", Priority: "10" },
      });
      delivered = response.ok;
    } catch {
      delivered = false;
    }
  }
  // Local tabs mirror the packet for free, but the return value reports the
  // cloud relay specifically so the UI can show a true EN VIVO badge.
  const local = channel(packet.roomId);
  if (local) {
    try {
      local.postMessage(body);
    } catch {
      /* channel closed */
    }
    local.close();
  }
  return delivered;
}

interface EventSourceLike {
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: () => void;
}

interface LiveSubscribeOptions {
  eventSourceImpl?: (url: string) => EventSourceLike;
  pollMs?: number;
  fetchImpl?: FetchLike;
}

function parseRelayMessage(raw: string): LiveMatchPacket | null {
  try {
    const envelope: unknown = safeJsonParse<unknown>(raw, null);
    const body =
      typeof envelope === "object" && envelope !== null && "message" in envelope
        ? String((envelope as { message: unknown }).message)
        : raw;
    const payload: unknown = safeJsonParse<unknown>(body, null);
    return isPacket(payload) ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Follow a room: EventSource on the ntfy topic with a 3s poll fallback, plus
 * BroadcastChannel so other tabs on the host device stay in sync.
 */
export function subscribeLiveRoom(
  roomId: string,
  onPacket: (packet: LiveMatchPacket) => void,
  options: LiveSubscribeOptions = {},
): () => void {
  const topic = ntfyTopic(roomId);
  const esCtor =
    options.eventSourceImpl ??
    (typeof EventSource !== "undefined"
      ? (url: string) => new EventSource(url) as unknown as EventSourceLike
      : null);

  let source: EventSourceLike | null = null;
  if (esCtor) {
    try {
      source = esCtor(`${NTFY_BASE}/${topic}/json`);
      source.onmessage = (event) => {
        const packet = parseRelayMessage(event.data);
        if (packet) onPacket(packet);
      };
      source.onerror = () => {
        /* the 3s poll below keeps the room alive */
      };
    } catch {
      source = null;
    }
  }

  const doFetch =
    options.fetchImpl ?? (typeof fetch === "function" ? (fetch as unknown as FetchLike) : null);
  const poll = globalThis.setInterval(() => {
    if (!doFetch) return;
    void (async () => {
      try {
        const response = await doFetch(`${NTFY_BASE}/${topic}/json?poll=1`);
        if (!response.ok) return;
        const payload: unknown = await response.json();
        const packet = parseRelayMessage(JSON.stringify(payload));
        if (packet) onPacket(packet);
      } catch {
        /* offline */
      }
    })();
  }, options.pollMs ?? 3000);

  const local = channel(roomId);
  const onLocal = (event: MessageEvent<string> | { data: string }): void => {
    const packet = parseRelayMessage(String(event.data));
    if (packet) onPacket(packet);
  };
  if (local) local.onmessage = onLocal as (event: MessageEvent<string>) => void;

  return () => {
    globalThis.clearInterval(poll);
    source?.close();
    local?.close();
  };
}

function compactSnapshot(packet: LiveMatchPacket): string {
  return toBase64Url(JSON.stringify(compactTuple(packet)));
}

/** QR URL opening the full-screen spectator scoreboard (GitHub Pages). */
export function createSpectatorUrl(packet: LiveMatchPacket): string {
  const params = new URLSearchParams({
    room: packet.roomId,
    pub: packet.pubHash,
    snap: compactSnapshot(packet),
  });
  return `${PAGES_ORIGIN}/?${params.toString()}`;
}

/** Handover QR: same URL plus the hostSecret so the new phone keeps hosting. */
export function createHandoverUrl(packet: LiveMatchPacket, hostSecret: string): string {
  const params = new URLSearchParams({
    room: packet.roomId,
    pub: packet.pubHash,
    snap: compactSnapshot(packet),
    secret: hostSecret,
  });
  return `${PAGES_ORIGIN}/?${params.toString()}`;
}

export interface RoomParams {
  roomId: string | null;
  pubHash: string | null;
  snapshot: LiveMatchPacket | null;
  hostSecret: string | null;
}

/** Parse `?room=&pub=&snap=&secret=` from a spectator or handover URL. */
export function parseRoomParams(search: string): RoomParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const room = params.get("room");
  const pub = params.get("pub");
  const secret = params.get("secret");
  const snap = params.get("snap");
  let snapshot: LiveMatchPacket | null = null;
  if (snap) {
    try {
      const raw: unknown = safeJsonParse<unknown>(fromBase64Url(snap), null);
      snapshot = packetFromTuple(raw);
    } catch {
      snapshot = null;
    }
  }
  return {
    roomId: room && room.startsWith("CANCHA-") ? room : null,
    pubHash: pub && /^[0-9a-f]{16}$/u.test(pub) ? pub : null,
    snapshot,
    hostSecret: secret && /^[0-9a-f]{16}$/u.test(secret) ? secret : null,
  };
}
