/**
 * Creator unlock: the shipped bundle only carries the SHA-256 digest of the
 * creator token, never the token itself. Typing the token hashes it locally and
 * compares it against the public digest; the unlocked state stays in localStorage.
 *
 * Build flag NEXT_PUBLIC_DEV_UNLOCK=true marks a private build that skips the gate.
 */

const CREATOR_STORAGE_KEY = "volleyos.creator.unlocked";
const MAX_INPUT_LENGTH = 128;

export function buildUnlocksCreator(): boolean {
  return process.env.NEXT_PUBLIC_DEV_UNLOCK === "true";
}

export function creatorUnlocked(): boolean {
  if (buildUnlocksCreator()) return true;
  try {
    return window.localStorage.getItem(CREATOR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistCreatorUnlock(): void {
  try {
    window.localStorage.setItem(CREATOR_STORAGE_KEY, "1");
  } catch {
    /* storage blocked: unlock lasts for this session only */
  }
}

export function clearCreatorUnlock(): void {
  try {
    window.localStorage.removeItem(CREATOR_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
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
