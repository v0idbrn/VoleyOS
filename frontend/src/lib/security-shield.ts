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

/** Deeply nested hostile JSON must never blow the recursion stack. */
export const MAX_SANITIZE_DEPTH = 64;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return null;
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      if (BANNED_KEYS.has(key)) continue;
      clean[key] = sanitizeValue(source[key], depth + 1);
    }
    return clean;
  }
  return value;
}

/** Parse untrusted JSON safely; returns `fallback` on any rejection. */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  if (typeof raw !== "string" || raw.length > MAX_JSON_BYTES) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return sanitizeValue(parsed) as T;
  } catch {
    return fallback;
  }
}

const SHA_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * v10 — synchronous SHA-256 (lowercase hex) for tamper-evident hash chains
 * that must stay synchronous (Merkle match chain, fallback KDF) where the
 * async WebCrypto `subtle.digest` would ripple promises through save paths.
 */
export function sha256Hex(message: string): string {
  const data = new TextEncoder().encode(message);
  const bitLength = data.length * 8;
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(offset + t * 4, false);
    for (let t = 16; t < 64; t += 1) {
      const w15 = w[t - 15] as number;
      const w2 = w[t - 2] as number;
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      w[t] = ((w[t - 16] as number) + s0 + (w[t - 7] as number) + s1) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let hh = h7;
    for (let t = 0; t < 64; t += 1) {
      const bigS1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + bigS1 + ch + (SHA_K[t] as number) + (w[t] as number)) >>> 0;
      const bigS0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (bigS0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + hh) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
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

/* ------------------------------------------------ universal clipboard */

interface VosClipboardBridge {
  copyToClipboard?: (value: string) => boolean;
}

/**
 * v10.1.1 — clipboard that survives Android WebView's `file://` origin.
 * `navigator.clipboard` requires a secure context, so under
 * `file:///android_asset/index.html` it throws `NotAllowedError` or fails
 * silently. Order: native bridge → async clipboard API → hidden textarea
 * with `document.execCommand("copy")`. Returns `true` only when a strategy
 * actually reported success, so callers can show a truthful toast.
 */
export async function copyTextUniversal(text: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined" || !text) return false;
  const bridge = (window as Window & { VoleyOSBridge?: VosClipboardBridge }).VoleyOSBridge;
  if (typeof bridge?.copyToClipboard === "function") {
    try {
      if (bridge.copyToClipboard(text) !== false) return true;
    } catch {
      /* bridge unavailable: keep falling down the chain */
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* NotAllowedError on file:// or denied permission: last resort below. */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-10000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
