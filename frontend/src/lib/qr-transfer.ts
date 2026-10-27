/**
 * Air-gapped multi-frame QR transfer. A match state is split into numbered
 * frames; each frame is a self-contained QR string. The receiver accepts frames
 * in any order and verifies the SHA-256 checksum before applying the state.
 */

import QRCode from "qrcode";

import type { ScoreboardState } from "@/lib/local-engines";
import { safeJsonParse } from "@/lib/security-shield";

export const QR_CLONE_KEY = "volleyos.clonedScoreboard";
const PREFIX = "VOSQ1";
const CHUNK_SIZE = 480;

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

export async function sha256Short(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "00000000";
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 10);
}

export interface QrFrame {
  index: number;
  total: number;
  checksum: string;
  chunk: string;
  text: string;
}

export async function createQrFrames(payload: unknown): Promise<QrFrame[]> {
  const canonical = JSON.stringify(payload);
  const encoded = toBase64(canonical);
  const checksum = await sha256Short(canonical);
  const chunks: string[] = [];
  for (let index = 0; index < encoded.length; index += CHUNK_SIZE) {
    chunks.push(encoded.slice(index, index + CHUNK_SIZE));
  }
  return chunks.map((chunk, index) => ({
    index,
    total: chunks.length,
    checksum,
    chunk,
    text: `${PREFIX}|${index + 1}/${chunks.length}|${checksum}|${chunk}`,
  }));
}

export async function renderQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "L",
    margin: 1,
    width: 320,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export interface IngestResult {
  frames: Map<number, string>;
  total: number;
  complete: boolean;
  payload: unknown;
  error: string | null;
}

const EMPTY: IngestResult = { frames: new Map(), total: 0, complete: false, payload: null, error: null };

/** Add one scanned frame; returns the reassembled payload once every frame is present. */
export async function ingestQrFrame(current: IngestResult, scanned: string): Promise<IngestResult> {
  const value = scanned.trim();
  if (!value.startsWith(`${PREFIX}|`)) return { ...current, error: "not a VolleyOS frame" };
  const [, progress, checksum, chunk] = value.split("|");
  if (!progress || !checksum || !chunk) return { ...current, error: "corrupt frame" };
  const [rawIndex, rawTotal] = progress.split("/");
  const index = Number(rawIndex);
  const total = Number(rawTotal);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
    return { ...current, error: "bad frame numbering" };
  }
  const frames = new Map(current.frames);
  frames.set(index, chunk);
  if (frames.size < total) return { frames, total, complete: false, payload: null, error: null };
  const joined = Array.from({ length: total }, (_, offset) => frames.get(offset + 1) ?? "").join("");
  try {
    const canonical = fromBase64(joined);
    const actual = await sha256Short(canonical);
    if (actual !== checksum) return { frames, total, complete: false, payload: null, error: "checksum mismatch" };
    return { frames, total, complete: true, payload: safeJsonParse<unknown>(canonical, null), error: null };
  } catch {
    return { frames, total, complete: false, payload: null, error: "cannot decode payload" };
  }
}

export function emptyIngest(): IngestResult {
  return { ...EMPTY, frames: new Map() };
}

export function storeClonedScoreboard(state: ScoreboardState): void {
  try {
    window.localStorage.setItem(QR_CLONE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function readClonedScoreboard(): ScoreboardState | null {
  try {
    const raw = window.localStorage.getItem(QR_CLONE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const candidate = value as Partial<ScoreboardState>;
    if (typeof candidate.teamA !== "string" || typeof candidate.scoreA !== "number" || !Array.isArray(candidate.lineupA)) return null;
    return candidate as ScoreboardState;
  } catch {
    return null;
  }
}

export function clearClonedScoreboard(): void {
  try {
    window.localStorage.removeItem(QR_CLONE_KEY);
  } catch {
    /* ignore */
  }
}
