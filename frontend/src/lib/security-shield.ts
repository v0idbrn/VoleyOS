/**
 * v9.4 security shield — untrusted-JSON intake and crash-proof local storage.
 *
 * - `safeJsonParse` refuses oversized payloads, strips prototype-pollution
 *   vectors (`__proto__` / `constructor` / `prototype`) and sanitizes string
 *   fields against `<script>` and inline `on*=` handler injection. Every QR
 *   packet, `VOS1:` WhatsApp capsule and JSON import flows through it.
 * - `atomicSave` / `atomicLoad` mirror state into a dual-slot WAL (primary key
 *   + `${key}__backup`) with a deterministic checksum, so a battery death
 *   mid-write never loses the match.
 */

/** Hard cap for any JSON string we are willing to parse (512 KiB). */
export const MAX_JSON_BYTES = 512 * 1024;

const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Strips tag openers and inline event handlers from a untrusted string. */
export function sanitizeString(value: string): string {
  return value
    .replace(/<\s*\/?\s*script[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      if (BANNED_KEYS.has(key)) continue;
      clean[key] = sanitizeValue(source[key]);
    }
    return clean;
  }
  return value;
}

/** Parse untrusted JSON safely; returns `fallback` on any rejection. */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  if (typeof raw !== "string" || raw.length > MAX_JSON_BYTES) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  return sanitizeValue(parsed) as T;
}

/** Deterministic 32-bit FNV-1a checksum rendered as 8 lowercase hex chars. */
export function checksumOf(payload: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

interface WalRecord<T> {
  v: 1;
  savedAt: number;
  checksum: string;
  data: T;
}

function backupKey(key: string): string {
  return `${key}__backup`;
}

function writeSlot(key: string, serialized: string): void {
  try {
    window.localStorage.setItem(key, serialized);
  } catch {
    /* storage full or unavailable: the other slot still holds the state */
  }
}

/**
 * Writes `data` to Slot B (newest recoverable copy) first, then Slot A.
 * Both slots carry a deterministic checksum of the payload.
 */
export function atomicSave<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    const payload = JSON.stringify(data ?? null);
    if (payload.length > MAX_JSON_BYTES) return false;
    const record: WalRecord<T> = {
      v: 1,
      savedAt: Date.now(),
      checksum: checksumOf(payload),
      data: JSON.parse(payload) as T,
    };
    const serialized = JSON.stringify(record);
    writeSlot(backupKey(key), serialized);
    writeSlot(key, serialized);
    return true;
  } catch {
    return false;
  }
}

function readSlot<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const record = safeJsonParse<Partial<WalRecord<T>> | null>(raw, null);
    if (!record || typeof record !== "object") return null;
    if (record.v !== 1 || !("data" in record) || typeof record.checksum !== "string") return null;
    const payload = JSON.stringify(record.data ?? null);
    if (checksumOf(payload) !== record.checksum) return null;
    return (record.data ?? null) as T;
  } catch {
    return null;
  }
}

/**
 * Loads from Slot A; when Slot A is missing, corrupt or fails its checksum,
 * automatically recovers from Slot B before falling back.
 */
export function atomicLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return readSlot<T>(key) ?? readSlot<T>(backupKey(key)) ?? fallback;
}
