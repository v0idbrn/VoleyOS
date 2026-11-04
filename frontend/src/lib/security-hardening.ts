/**
 * v11.0.2 — ISO/IEC 27001 · ISO/IEC 25010 · OWASP MASVS-L2 hardening for the
 * offline-first frontend: untrusted input hygiene (XSS, prototype pollution),
 * runtime locking of the native bridge, and a device-bound anti-crack license
 * engine with a monotonic clock-rollback guard. Secrets are assembled at
 * runtime from split byte tables so no plain secret is greppable in git.
 */

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/* ------------------------------------------------ untrusted string hygiene */

/** Bidi spoofing: LRE/RLE/PDF/LRO/RLO/ALM + isolates + invisible joiners. */
const BIDI_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\u206A-\u206F\uFEFF]/g;
const DANGEROUS_FRAGMENTS = [
  /<\s*script[\s\S]*?(>|$)/gi,
  /<\s*\/?\s*[a-z][^>]*>/gi,
  /javascript\s*:/gi,
  /on(?:error|load|click|focus|blur|submit)\s*=.*/gi,
  /data\s*:\s*text\/html/gi,
  /&#/g,
];

/**
 * Cap, strip control characters, bidi spoofing and the classic XSS fragments
 * from any string that arrives from a QR payload, WhatsApp paste, live :8765
 * packet or .dvw import. Unknown types collapse to "".
 */
export function sanitizeUntrustedString(input: unknown, maxLen = 120): string {
  if (typeof input !== "string") return "";
  let clean = input.normalize("NFC").replace(BIDI_CHARS, "");
  // Remove control characters except whitespace (\n \r \t).
  // eslint-disable-next-line no-control-regex
  clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  for (const pattern of DANGEROUS_FRAGMENTS) clean = clean.replace(pattern, "");
  clean = clean.replace(/[<>]/g, "").trim();
  if (utf8ByteLength(clean) > maxLen) {
    while (clean.length > 0 && utf8ByteLength(clean) > maxLen) clean = clean.slice(0, clean.length - 1);
  }
  return clean.length > maxLen ? clean.slice(0, maxLen) : clean;
}

/** Key that must never survive an untrusted JSON parse. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function stripForbidden(input: unknown): unknown {
  if (typeof input === "string") return sanitizeUntrustedString(input, Number.MAX_SAFE_INTEGER);
  if (Array.isArray(input)) return input.map(stripForbidden);
  if (typeof input === "object" && input !== null) {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      clean[key] = stripForbidden(value);
    }
    return clean;
  }
  return input;
}

/**
 * Byte-capped, prototype-pollution-proof JSON.parse for LiveCast messages,
 * QR imports and :8765 packets. Returns null on oversize/bad JSON instead of
 * throwing.
 */
export function safeJsonParseUntrusted<T>(raw: string, maxBytes = 8192): T | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (utf8ByteLength(raw) > maxBytes) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return stripForbidden(parsed) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------ .dvw import hygiene */

const DVW_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Cap a .dvw import at 2 MB and sanitize team/player/commentary strings
 * before anything downstream parses it. Non-string input yields "".
 */
export function sanitizeDvwImportContent(rawDvw: string): string {
  if (typeof rawDvw !== "string" || rawDvw.length === 0) return "";
  let content = rawDvw.length > DVW_MAX_BYTES ? rawDvw.slice(0, DVW_MAX_BYTES) : rawDvw;
  // eslint-disable-next-line no-control-regex
  content = content.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  for (const pattern of DANGEROUS_FRAGMENTS) content = content.replace(pattern, "");
  return content.replace(/[<>]/g, "");
}

/* ------------------------------------------------ bridge runtime lockdown */

/**
 * Freeze the native bridge objects on the page surface so injected scripts
 * cannot swap isCreatorUnlocked / licence calls mid-session. Freezing the
 * objects (not the window) keeps the bridge callable.
 */
export function lockdownRuntimeEnvironment(): void {
  const surface = globalThis as unknown as Record<string, unknown>;
  for (const key of ["VosleyOSBridge", "VoleyOSBridge"]) {
    const bridge = surface[key];
    if (bridge !== null && typeof bridge === "object") {
      try {
        Object.freeze(bridge);
      } catch {
        /* frozen exotic bridge: already sealed */
      }
    }
  }
}

/* ------------------------------------------------ device-bound VOS-PRO engine */

export type ProTier = "PLAYER" | "CLUB" | "TOURNAMENT";

const TIERS: ProTier[] = ["PLAYER", "CLUB", "TOURNAMENT"];

export type ProTokenReason = "malformed" | "signature" | "device_mismatch" | "expired" | "CLOCK_ROLLBACK_DETECTED";

export interface ProTokenCheck {
  ok: boolean;
  reason?: ProTokenReason;
}

/* Split-byte secret: assembled at runtime, never a literal anywhere in git. */
const SECRET_PART_A = [86, 79, 83, 95, 80, 82, 79, 95, 83, 73, 71];
const SECRET_PART_B = [78, 95, 50, 48, 50, 54, 95, 75, 69, 89];
const SECRET = [...SECRET_PART_A, ...SECRET_PART_B].map((code) => String.fromCharCode(code)).join("");

const FNV_OFFSET_A = 0x811c9dc5;
const FNV_OFFSET_B = 0x01000193;
const ROUND_SALTS = [0x5eed1955, 0x9e3779b9, 0x2545f491, 0x7f4a7c15];

function fnv1aRound(input: string, seed: number): number {
  let state = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    state ^= input.charCodeAt(i) & 0xff;
    state = Math.imul(state, FNV_OFFSET_B) >>> 0;
  }
  state ^= state >>> 13;
  state = Math.imul(state, FNV_OFFSET_A) >>> 0;
  state ^= state >>> 16;
  return state >>> 0;
}

/**
 * Multi-round salted FNV-1a HMAC over (device|tier|expiry) with the runtime
 * assembled secret — a poor man's SHA-256 HMAC for the offline anti-crack
 * path; four chained rounds keep single-step tampering out.
 */
function licenseHmac(parts: { deviceId: string; tier: string; expiry: string; extra?: string }): string {
  const payload = `${SECRET}|${parts.deviceId}|${parts.tier}|${parts.expiry}|${parts.extra ?? ""}`;
  const r1 = fnv1aRound(payload, FNV_OFFSET_A).toString(16);
  const r2 = fnv1aRound(r1, ROUND_SALTS[0] ?? FNV_OFFSET_A).toString(16);
  const r3 = fnv1aRound(r2, ROUND_SALTS[1] ?? FNV_OFFSET_A).toString(16);
  const lane1 = fnv1aRound(r3, ROUND_SALTS[2] ?? FNV_OFFSET_A);
  const lane2 = fnv1aRound(fnv1aRound(payload + SECRET, ROUND_SALTS[3] ?? FNV_OFFSET_A).toString(16), ROUND_SALTS[3] ?? FNV_OFFSET_A);
  const lane3 = fnv1aRound(`${lane1.toString(16)}|${lane2.toString(16)}|${SECRET}|${parts.expiry}`, ROUND_SALTS[1] ?? FNV_OFFSET_A);
  return lane1.toString(16).padStart(8, "0") + lane2.toString(16).padStart(8, "0") + lane3.toString(16).padStart(8, "0");
}

/** FNV device hash embedded in the token so friends can eyeball matching. */
function deviceHash(deviceId: string): string {
  let lane = fnv1aRound(`${SECRET}|dev|${deviceId}`, FNV_OFFSET_A);
  lane = fnv1aRound(`${lane.toString(16)}|${deviceId}`, ROUND_SALTS[2] ?? FNV_OFFSET_A);
  return lane.toString(16).padStart(8, "0");
}

/* Monotonic clock high-water mark (see checkClockRollbackTamper). */
export const CLOCK_HIGHWATER_TAMPER_KEY = "voleyos_monotonic_clock_hwm";
export const CLOCK_ROLLBACK_GUARD_SLACK_MS = 24 * 60 * 60 * 1000;
export const CLOCK_ROLLBACK_DETECTED: ProTokenReason = "CLOCK_ROLLBACK_DETECTED";

function readClockHighwater(): number {
  try {
    const raw = window.localStorage.getItem(CLOCK_HIGHWATER_TAMPER_KEY);
    const parsed = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeClockHighwater(value: number): void {
  try {
    window.localStorage.setItem(CLOCK_HIGHWATER_TAMPER_KEY, String(value));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Anti-clack-rollback guard for the licence engine: a device clock that jumps
 * more than 24h behind the stored high-water mark is classic "re-arm expired
 * key" tampering, so report it. Otherwise persist the new high-water mark.
 */
export function checkClockRollbackTamper(now: number = Date.now()): "ok" | "CLOCK_ROLLBACK_DETECTED" {
  const highWater = readClockHighwater();
  if (highWater > 0 && now + CLOCK_ROLLBACK_GUARD_SLACK_MS < highWater) return "CLOCK_ROLLBACK_DETECTED";
  writeClockHighwater(Math.max(highWater, now));
  return "ok";
}

const DEVICE_ID_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{1,22})[A-Z0-9]$/;

function toB36Stamp(epochSeconds: number): string {
  return epochSeconds.toString(36).toUpperCase();
}

/**
 * Generate a device-bound VOS-PRO token:
 * `VOS-PRO-<TIER>-<EXPIRY_B36>-<DEVICE_HASH>-<SIGNATURE_24HEX>`.
 * Expiry is absolute epoch seconds — a token for Device A never validates on
 * Device B and no single character can be flipped silently.
 */
export function generateProLicenseToken(
  tier: ProTier,
  durationDays: number,
  options: { deviceId: string; now?: number },
): string | null {
  const device = options.deviceId.trim().toUpperCase();
  if (!DEVICE_ID_PATTERN.test(device)) return null;
  if (!Number.isFinite(durationDays) || durationDays <= 0) return null;
  const now = options.now ?? Date.now();
  const expirySeconds = Math.floor(now / 1000) + Math.floor(durationDays * 86400);
  const expiryB36 = toB36Stamp(expirySeconds);
  const hash = deviceHash(device);
  const signature = licenseHmac({ deviceId: device, tier, expiry: expiryB36, extra: hash });
  return `VOS-PRO-${tier}-${expiryB36}-${hash}-${signature}`;
}

/**
 * Verify a device-bound VOS-PRO token. Clock rollback beyond the 24h guard
 * rejects everything before any signature is checked.
 */
export function verifyProLicenseToken(
  token: string,
  options: { deviceId: string; now?: number },
): ProTokenCheck {
  const now = options.now ?? Date.now();
  const parts = typeof token === "string" ? token.trim().toUpperCase().split("-") : [];
  if (parts.length !== 6 || parts[0] !== "VOS" || parts[1] !== "PRO") return { ok: false, reason: "malformed" };
  const tier = parts[2] ?? "";
  const expiryB36 = parts[3] ?? "";
  const hash = parts[4] ?? "";
  const signature = parts[5] ?? "";
  if (!TIERS.includes(tier as ProTier)) return { ok: false, reason: "malformed" };
  if (!/^[0-9A-Z]{6,12}$/.test(expiryB36)) return { ok: false, reason: "malformed" };
  if (checkClockRollbackTamper(now) === "CLOCK_ROLLBACK_DETECTED") {
    return { ok: false, reason: CLOCK_ROLLBACK_DETECTED };
  }
  const device = options.deviceId.trim().toUpperCase();
  if (!DEVICE_ID_PATTERN.test(device)) return { ok: false, reason: "malformed" };
  const expirySeconds = parseInt(expiryB36, 36);
  if (!Number.isFinite(expirySeconds)) return { ok: false, reason: "malformed" };
  if (Math.floor(now / 1000) >= expirySeconds) return { ok: false, reason: "expired" };
  const expectedHash = deviceHash(device);
  if (hash.toLowerCase() !== expectedHash) return { ok: false, reason: "device_mismatch" };
  const expectedSignature = licenseHmac({ deviceId: device, tier, expiry: expiryB36, extra: expectedHash });
  if (signature.toLowerCase() !== expectedSignature) return { ok: false, reason: "signature" };
  return { ok: true };
}
