/**
 * Creator unlock: the shipped bundle only carries the SHA-256 digest of the
 * creator token, never the token itself.
 *
 * The unlocked state is never a boolean: the entered token is stored and every
 * hydration re-hashes it against the public digest, so injecting "true", "1" or
 * "admin" into localStorage leaves the paywall locked and clears the bad value.
 *
 * Build flag NEXT_PUBLIC_DEV_UNLOCK=true marks a private build that skips the gate.
 */

const CREATOR_TOKEN_KEY = "volleyos.creator.token";
const LEGACY_UNLOCK_KEY = "volleyos.creator.unlocked";
const MAX_INPUT_LENGTH = 128;

export function buildUnlocksCreator(): boolean {
  return process.env.NEXT_PUBLIC_DEV_UNLOCK === "true";
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCreatorToken(): string | null {
  const store = storage();
  if (!store) return null;
  store.removeItem(LEGACY_UNLOCK_KEY);
  const value = store.getItem(CREATOR_TOKEN_KEY);
  return value && value.length <= MAX_INPUT_LENGTH ? value : null;
}

export function persistCreatorToken(token: string): void {
  const store = storage();
  if (!store) return;
  store.setItem(CREATOR_TOKEN_KEY, token.trim());
}

export function clearCreatorUnlock(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(CREATOR_TOKEN_KEY);
  store.removeItem(LEGACY_UNLOCK_KEY);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function matchesCreatorKey(candidate: string): Promise<boolean> {
  const expected = (process.env.NEXT_PUBLIC_CREATOR_KEY_SHA256 ?? "").trim().toLowerCase();
  if (expected.length !== 64) return false;
  const value = candidate.trim();
  if (value.length === 0 || value.length > MAX_INPUT_LENGTH) return false;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return false;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest) === expected;
}

/** True only when the stored value hashes to the configured digest. */
export async function creatorUnlocked(): Promise<boolean> {
  if (buildUnlocksCreator()) return true;
  const token = readCreatorToken();
  if (token === null) return false;
  if (await matchesCreatorKey(token)) return true;
  clearCreatorUnlock();
  return false;
}

/* ------------------------------------------------- device-bound VOS-PRO */

const CUSTOMER_LICENSE_KEY = "volleyos.vospro.license";
const INSTALL_ID_KEY = "volleyos.install.id";
const DEVICE_ID_PATTERN = /^[0-9A-F]{4}-[0-9A-F]{4}$/;
const EXPIRY_PATTERN = /^(LIFE|[0-9]{8})$/;
const HOLDER_PATTERN = /^[A-Z0-9-]{1,32}$/;

export type LicenseTier = "PLAYER" | "CLUB" | "TOURNAMENT";

export interface CustomerLicense {
  deviceId: string;
  tier: LicenseTier;
  expiry: string;
  holder: string;
}

export type LicenseCheck =
  | { ok: true; license: CustomerLicense }
  | {
      ok: false;
      reason: "malformed" | "signature" | "device_mismatch" | "expired" | "no_key" | "clock_rollback";
    };

/* ------------------------------------------------ anti-time-travel guard */

export const CLOCK_HIGHWATER_KEY = "voleyos_clock_highwater_v1";
/** A rollback is only tampering when it jumps back more than 5 minutes. */
export const CLOCK_ROLLBACK_SLACK_MS = 300_000;

/* ------------------------------------------------ anti-time-travel guard */

/**
 * Monotonic high-water clock guard (anti-time-travel). Returns the new
 * high-water epoch ms, or `-1` when the device clock was rolled back more
 * than `CLOCK_ROLLBACK_SLACK_MS` below the highest time ever observed —
 * the classic trick to revalidate an expired 7d/30d/1y licence.
 *
 * Mirrors the Android `voleyos_clock_guard` SharedPreferences guard through
 * the `VoleyOSBridge` when running inside the APK, and always maintains the
 * same high-water mark in localStorage for the web build.
 */
export function updateMonotonicClock(currentClientEpochMs: number): number {
  if (!Number.isFinite(currentClientEpochMs)) return -1;
  const store = storage();
  let highWater = 0;
  if (store) {
    const raw = store.getItem(CLOCK_HIGHWATER_KEY);
    const parsed = raw === null ? Number.NaN : Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) highWater = parsed;
  }
  const bridge = (
    globalThis as {
      VoleyOSBridge?: { updateAndCheckMonotonicClock?: (currentClientEpochMs: number) => number };
    }
  ).VoleyOSBridge;
  if (typeof bridge?.updateAndCheckMonotonicClock === "function") {
    try {
      const native = bridge.updateAndCheckMonotonicClock(currentClientEpochMs);
      if (typeof native === "number" && Number.isFinite(native)) {
        if (native < 0) return -1;
        highWater = Math.max(highWater, native);
      }
    } catch {
      // Bridge unavailable: the localStorage mirror still guards the web build.
    }
  }
  if (currentClientEpochMs + CLOCK_ROLLBACK_SLACK_MS < highWater) return -1;
  const next = Math.max(highWater, currentClientEpochMs);
  if (store) {
    try {
      store.setItem(CLOCK_HIGHWATER_KEY, String(next));
    } catch {
      /* storage unavailable */
    }
  }
  return next;
}

/** True when the observed time rolled back past the 5-minute tolerance. */
export function clockRolledBack(currentClientEpochMs: number): boolean {
  return updateMonotonicClock(currentClientEpochMs) < 0;
}

/**
 * Stable per-install device id: the Android bridge ANDROID_ID fingerprint
 * when running inside the APK, otherwise a persisted random XXXX-XXXX so the
 * anti-sharing check still behaves identically on the web build.
 */
export function getDeviceInstallId(): string {
  const bridge = (
    globalThis as { VoleyOSBridge?: { getDeviceFingerprint?: () => unknown } }
  ).VoleyOSBridge;
  const fromBridge = bridge?.getDeviceFingerprint?.();
  if (typeof fromBridge === "string" && DEVICE_ID_PATTERN.test(fromBridge)) return fromBridge;
  const store = storage();
  if (store) {
    const existing = store.getItem(INSTALL_ID_KEY);
    if (existing && DEVICE_ID_PATTERN.test(existing)) return existing;
    const bytes = new Uint8Array(4);
    globalThis.crypto.getRandomValues(bytes);
    const generated = Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
      .replace(/^([0-9A-F]{4})/, "$1-");
    store.setItem(INSTALL_ID_KEY, generated);
    return generated;
  }
  return "0000-0000";
}

export function holderSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug.length > 0 ? slug : "HOLD";
}

async function licenseSignature(parts: {
  deviceId: string;
  tier: LicenseTier;
  expiry: string;
  holder: string;
}): Promise<string | null> {
  const keyDigest = (process.env.NEXT_PUBLIC_CREATOR_KEY_SHA256 ?? "").trim().toLowerCase();
  if (keyDigest.length !== 64) return null;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const payload = `${keyDigest}|${parts.deviceId}|${parts.tier}|${parts.expiry}|${parts.holder}`;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return toHex(digest).slice(0, 16);
}

/**
 * Sign a customer licence bound to ONE device:
 * `VOS-PRO.<DEVICE_ID>.<TIER>.<EXPIRY>.<HOLDER>.<SIGNATURE_16HEX>`.
 */
export async function signCustomerLicense(input: {
  deviceId: string;
  tier: LicenseTier;
  expiry: string;
  holder: string;
}): Promise<string | null> {
  const device = input.deviceId.trim().toUpperCase();
  const expiry = input.expiry.trim().toUpperCase();
  const holder = holderSlug(input.holder);
  if (!DEVICE_ID_PATTERN.test(device)) return null;
  if (!EXPIRY_PATTERN.test(expiry)) return null;
  if (!HOLDER_PATTERN.test(holder)) return null;
  const signature = await licenseSignature({ deviceId: device, tier: input.tier, expiry, holder });
  if (!signature) return null;
  return `VOS-PRO.${device}.${input.tier}.${expiry}.${holder}.${signature}`;
}

function todayStamp(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * Verify a VOS-PRO licence: signature must match, the embedded device id must
 * equal THIS phone's install id (blocks sharing across phones) and the expiry
 * must not have passed.
 */
export async function verifyCustomerLicense(
  code: string,
  options: { deviceId?: string; now?: Date } = {},
): Promise<LicenseCheck> {
  const parts = code.trim().split(".");
  if (parts.length !== 6 || parts[0] !== "VOS-PRO") return { ok: false, reason: "malformed" };
  const [, rawDevice, rawTier, rawExpiry, rawHolder, rawSignature] = parts;
  const device = (rawDevice ?? "").toUpperCase();
  const tier = rawTier as LicenseTier;
  const expiry = (rawExpiry ?? "").toUpperCase();
  const holder = rawHolder ?? "";
  const signature = (rawSignature ?? "").toLowerCase();
  if (!DEVICE_ID_PATTERN.test(device)) return { ok: false, reason: "malformed" };
  if (tier !== "PLAYER" && tier !== "CLUB" && tier !== "TOURNAMENT") return { ok: false, reason: "malformed" };
  if (!EXPIRY_PATTERN.test(expiry)) return { ok: false, reason: "malformed" };
  if (!HOLDER_PATTERN.test(holder)) return { ok: false, reason: "malformed" };
  if (!/^[0-9a-f]{16}$/.test(signature)) return { ok: false, reason: "malformed" };

  const expected = await licenseSignature({ deviceId: device, tier, expiry, holder });
  if (expected === null) return { ok: false, reason: "no_key" };
  if (expected !== signature) return { ok: false, reason: "signature" };

  const currentDevice = (options.deviceId ?? getDeviceInstallId()).toUpperCase();
  if (device !== currentDevice) return { ok: false, reason: "device_mismatch" };

  const observed = (options.now ?? new Date()).getTime();
  if (expiry !== "LIFE") {
    // Time-limited licence: a rolled-back system clock must reject instantly.
    if (clockRolledBack(observed)) return { ok: false, reason: "clock_rollback" };
    if (expiry < todayStamp(options.now ?? new Date())) return { ok: false, reason: "expired" };
  } else {
    updateMonotonicClock(observed);
  }
  return { ok: true, license: { deviceId: device, tier, expiry, holder } };
}

export function loadCustomerLicense(): string | null {
  const store = storage();
  if (!store) return null;
  const value = store.getItem(CUSTOMER_LICENSE_KEY);
  return value && value.startsWith("VOS-PRO.") && value.length <= 128 ? value : null;
}

export function persistCustomerLicense(code: string): void {
  const store = storage();
  if (!store) return;
  store.setItem(CUSTOMER_LICENSE_KEY, code.trim());
}

export function clearCustomerLicense(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(CUSTOMER_LICENSE_KEY);
}
