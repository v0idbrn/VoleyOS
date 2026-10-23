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
