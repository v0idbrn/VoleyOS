import type { Locale } from "@/lib/local-engines";

/** Layer 1 narrative: what the community is actually backing. */
export const SUPPORT_NARRATIVE: Record<Locale, string> = {
  es: "Gratis, 100% offline, sin cuentas, sin telemetría y sin anuncios — bancado por la comunidad.",
  en: "Free, 100% offline, no accounts, no telemetry and no ads — community backed.",
  pt: "Grátis, 100% offline, sem contas, sem telemetria e sem anúncios — bancado pela comunidade.",
};

export const SUPPORT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const ASK_KEY = "voleyos.donation.lastAsk";
const CHIP_KEY = "volleyos.supporter.chip";
const CHIP_PATTERN = /^VOS-CHIP\.[0-9A-F]{12}\.[0-9A-F]{8}$/;
const CHIP_SALT = "voleyos-supporter-v1";

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** True when the emotional support sheet may be shown (7-day cooldown). */
export function canAskSupport(now: number = Date.now()): boolean {
  const last = Number(store()?.getItem(ASK_KEY) ?? "NaN");
  if (!Number.isFinite(last)) return true;
  return now - last >= SUPPORT_COOLDOWN_MS;
}

/** Records the sheet as shown; returns the next timestamp it may appear. */
export function markSupportAsked(now: number = Date.now()): number {
  try {
    store()?.setItem(ASK_KEY, String(now));
  } catch {
    /* storage unavailable */
  }
  return now + SUPPORT_COOLDOWN_MS;
}

/** Days left before the support sheet may be asked again (0 = ready). */
export function supportCooldownDays(now: number = Date.now()): number {
  const last = Number(store()?.getItem(ASK_KEY) ?? "NaN");
  if (!Number.isFinite(last)) return 0;
  const remaining = last + SUPPORT_COOLDOWN_MS - now;
  return remaining <= 0 ? 0 : Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

async function sha256Hex(payload: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return toHex(digest);
}

async function chipSignature(body: string): Promise<string | null> {
  const hex = await sha256Hex(`${CHIP_SALT}|${body}`);
  return hex ? hex.slice(0, 8).toUpperCase() : null;
}

/**
 * Layer 2: `VOS-CHIP.<12HEX>.<8HEX>` supporter code issued from the Creator
 * Keygen Console. Verifiable fully offline; it only unlocks the golden
 * 👑 Patrocinador badge, never paid features.
 */
export async function signSupporterChip(seed: string): Promise<string | null> {
  const clean = seed.trim();
  if (clean.length === 0) return null;
  const hex = await sha256Hex(`${CHIP_SALT}|${clean}`);
  if (!hex) return null;
  const body = hex.slice(0, 12).toUpperCase();
  const signature = await chipSignature(body);
  if (!signature) return null;
  return `VOS-CHIP.${body}.${signature}`;
}

export async function verifySupporterChip(code: string): Promise<boolean> {
  const value = code.trim().toUpperCase();
  if (!CHIP_PATTERN.test(value)) return false;
  const body = value.split(".")[1] ?? "";
  const expected = await chipSignature(body);
  return expected !== null && expected === value.split(".")[2];
}

export function supporterChipActive(): boolean {
  const value = store()?.getItem(CHIP_KEY);
  return typeof value === "string" && value.startsWith("VOS-CHIP.");
}

export async function persistSupporterChip(code: string): Promise<boolean> {
  if (!(await verifySupporterChip(code))) return false;
  try {
    store()?.setItem(CHIP_KEY, code.trim().toUpperCase());
    return true;
  } catch {
    return false;
  }
}

export function clearSupporterChip(): void {
  try {
    store()?.removeItem(CHIP_KEY);
  } catch {
    /* ignore */
  }
}
