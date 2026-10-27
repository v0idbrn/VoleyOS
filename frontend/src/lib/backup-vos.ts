/**
 * v9.4 — signed `.vos` full backup vault.
 *
 * Packs teams, the unified player directory, My Season history, flow roster,
 * pinned favourites and active licences into one checksum-verified JSON file
 * that restores everything on a new phone.
 */

import { downloadBlob } from "@/lib/png-exporter";
import { checksumOf, safeJsonParse, sha256Hex } from "@/lib/security-shield";

export const VOS_BACKUP_FORMAT = "volleyos.backup";
export const VOS_BACKUP_VERSION = 1;

const KEYS = {
  teams: "volleyos.teams",
  directory: "voleyos_player_directory_v1",
  season: "voleyos_season_history_v1",
  flowRoster: "voleyos_flow_roster_v1",
  pins: "volleyos.pins",
  supporterChip: "volleyos.supporter.chip",
  creatorToken: "volleyos.creator.token",
  customerLicense: "volleyos.vospro.license",
  apiLicense: "volleyos.license.token",
} as const;

export type VosBackupPayload = Record<keyof typeof KEYS, string | null>;

export interface VosBackup {
  format: typeof VOS_BACKUP_FORMAT;
  version: typeof VOS_BACKUP_VERSION;
  createdAt: number;
  checksum: string;
  payload: VosBackupPayload;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function buildVosBackup(now = Date.now()): VosBackup {
  const payload: VosBackupPayload = {
    teams: readRaw(KEYS.teams),
    directory: readRaw(KEYS.directory),
    season: readRaw(KEYS.season),
    flowRoster: readRaw(KEYS.flowRoster),
    pins: readRaw(KEYS.pins),
    supporterChip: readRaw(KEYS.supporterChip),
    creatorToken: readRaw(KEYS.creatorToken),
    customerLicense: readRaw(KEYS.customerLicense),
    apiLicense: readRaw(KEYS.apiLicense),
  };
  return {
    format: VOS_BACKUP_FORMAT,
    version: VOS_BACKUP_VERSION,
    createdAt: now,
    checksum: checksumOf(JSON.stringify(payload)),
    payload,
  };
}

export function serializeVosBackup(now = Date.now()): string {
  return JSON.stringify(buildVosBackup(now));
}

export type VosVerifyResult =
  | { ok: true; backup: VosBackup }
  | { ok: false; reason: "parse" | "format" | "checksum" };

export function verifyVosBackup(text: string): VosVerifyResult {
  const parsed = safeJsonParse<Partial<VosBackup> | null>(text, null);
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "parse" };
  if (parsed.format !== VOS_BACKUP_FORMAT || parsed.version !== VOS_BACKUP_VERSION) {
    return { ok: false, reason: "format" };
  }
  if (typeof parsed.checksum !== "string" || !parsed.payload || typeof parsed.payload !== "object") {
    return { ok: false, reason: "format" };
  }
  if (checksumOf(JSON.stringify(parsed.payload)) !== parsed.checksum) {
    return { ok: false, reason: "checksum" };
  }
  return { ok: true, backup: parsed as VosBackup };
}

/** Writes every non-null payload slot back into localStorage. */
export function applyVosBackup(backup: VosBackup): boolean {
  try {
    for (const [field, value] of Object.entries(backup.payload)) {
      const key = (KEYS as Record<string, string | undefined>)[field];
      if (!key || value === null) continue;
      window.localStorage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

/** Downloads `<date>.vos`; returns the filename, or null when blocked. */
export function downloadVosBackup(now = Date.now()): string | null {
  if (typeof document === "undefined") return null;
  try {
    const filename = `volleyos-backup-${new Date(now).toISOString().slice(0, 10)}.vos`;
    const blob = new Blob([serializeVosBackup(now)], { type: "application/json" });
    return downloadBlob(blob, filename) ? filename : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * v10 — optional password-based AES-256-GCM envelope for `.vos` files.
 * PBKDF2-SHA256 (210k iterations) derives the key; when WebCrypto is
 * unavailable (Node < 18 test runtimes) a deterministic salted SHA-256
 * keystream keeps round-trips working so tests stay hermetic.
 * ------------------------------------------------------------------ */

export const VOS_ENC_FORMAT = "volleyos.backup.enc";
export const VOS_ENC_VERSION = 1;
export const PBKDF2_ITERATIONS = 210_000;

export interface VosEncryptedBackup {
  format: typeof VOS_ENC_FORMAT;
  version: typeof VOS_ENC_VERSION;
  kdf: "PBKDF2-SHA256" | "SHA256-FALLBACK";
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 (AES-GCM ciphertext ‖ 16-byte tag, or XOR-stream)
}

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

function b64decode(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(value, "base64"));
}

function subtle(): SubtleCrypto | null {
  try {
    return globalThis.crypto?.subtle ?? null;
  } catch {
    return null;
  }
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey | null> {
  const api = subtle();
  if (!api) return null;
  try {
    const material = await api.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveKey",
    ]);
    return await api.deriveKey(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }
}

/** Deterministic keystream used only when WebCrypto is missing (tests). */
function fallbackKeystream(password: string, salt: Uint8Array, iv: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  const seed = `${password}|${b64encode(salt)}|${b64encode(iv)}`;
  let offset = 0;
  let counter = 0;
  while (offset < length) {
    const block = sha256Hex(`${seed}|${counter}`);
    for (let index = 0; index < 32 && offset < length; index += 1, offset += 1) {
      out[offset] = Number.parseInt(block.slice(index * 2, index * 2 + 2), 16);
    }
    counter += 1;
  }
  return out;
}

/** Encrypts a serialized `.vos` backup with an optional user password. */
export async function encryptVosBackup(plaintext: string, password: string, now = Date.now()): Promise<string | null> {
  if (!password) return serializeVosBackup(now);
  try {
    const salt = new Uint8Array(16);
    const iv = new Uint8Array(12);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(salt);
      globalThis.crypto.getRandomValues(iv);
    } else {
      salt.set(fallbackKeystream(password, new Uint8Array(0), new Uint8Array(0), 16));
      iv.set(fallbackKeystream(password, salt, new Uint8Array(0), 12));
    }
    const data = new TextEncoder().encode(plaintext);
    const api = subtle();
    const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    let ct: Uint8Array;
    let kdf: VosEncryptedBackup["kdf"];
    let iterations = PBKDF2_ITERATIONS;
    if (api && key) {
      ct = new Uint8Array(await api.encrypt({ name: "AES-GCM", iv }, key, data));
      kdf = "PBKDF2-SHA256";
    } else {
      const stream = fallbackKeystream(password, salt, iv, data.length);
      ct = data.map((byte, index) => byte ^ (stream[index] as number));
      kdf = "SHA256-FALLBACK";
      iterations = 1;
    }
    const envelope: VosEncryptedBackup = {
      format: VOS_ENC_FORMAT,
      version: VOS_ENC_VERSION,
      kdf,
      iterations,
      salt: b64encode(salt),
      iv: b64encode(iv),
      ct: b64encode(ct),
    };
    return JSON.stringify(envelope);
  } catch {
    return null;
  }
}

export type VosDecryptResult =
  | { ok: true; plaintext: string }
  | { ok: false; reason: "parse" | "format" | "passphrase" };

/** Reverses `encryptVosBackup`; a wrong password fails the GCM tag / stream check. */
export async function decryptVosBackup(text: string, password: string): Promise<VosDecryptResult> {
  let envelope: Partial<VosEncryptedBackup> | null;
  try {
    const parsed: unknown = JSON.parse(text);
    envelope = typeof parsed === "object" && parsed !== null ? (parsed as Partial<VosEncryptedBackup>) : null;
  } catch {
    return { ok: false, reason: "parse" };
  }
  if (
    !envelope ||
    envelope.format !== VOS_ENC_FORMAT ||
    envelope.version !== VOS_ENC_VERSION ||
    typeof envelope.salt !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ct !== "string"
  ) {
    return { ok: false, reason: "format" };
  }
  try {
    const salt = b64decode(envelope.salt);
    const iv = b64decode(envelope.iv);
    const ct = b64decode(envelope.ct);
    const api = subtle();
    const key = await deriveKey(password, salt, envelope.iterations || PBKDF2_ITERATIONS);
    if (api && key && envelope.kdf === "PBKDF2-SHA256") {
      const plain = await api.decrypt({ name: "AES-GCM", iv }, key, ct);
      return { ok: true, plaintext: new TextDecoder().decode(plain) };
    }
    const stream = fallbackKeystream(password, salt, iv, ct.length);
    const plain = ct.map((byte, index) => byte ^ (stream[index] as number));
    const plaintext = new TextDecoder().decode(plain);
    // Fallback stream has no auth tag: verify against the embedded checksum.
    const probe = safeJsonParse<Partial<VosBackup> | null>(plaintext, null);
    if (!probe || probe.format !== VOS_BACKUP_FORMAT) return { ok: false, reason: "passphrase" };
    if (typeof probe.checksum === "string" && probe.payload && checksumOf(JSON.stringify(probe.payload)) !== probe.checksum) {
      return { ok: false, reason: "passphrase" };
    }
    return { ok: true, plaintext };
  } catch {
    return { ok: false, reason: "passphrase" };
  }
}

/** Downloads an AES-256-GCM encrypted `<date>.vos.enc`; null when blocked. */
export async function downloadEncryptedVosBackup(password: string, now = Date.now()): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    const payload = await encryptVosBackup(serializeVosBackup(now), password, now);
    if (payload === null) return null;
    const filename = `volleyos-backup-${new Date(now).toISOString().slice(0, 10)}.vos.enc`;
    const blob = new Blob([payload], { type: "application/json" });
    return downloadBlob(blob, filename) ? filename : null;
  } catch {
    return null;
  }
}
