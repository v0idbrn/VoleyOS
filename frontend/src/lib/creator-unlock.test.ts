import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUnlocksCreator,
  clearCreatorUnlock,
  creatorUnlocked,
  matchesCreatorKey,
  persistCreatorToken,
  readCreatorToken,
} from "./creator-unlock";

const TOKEN = "TEST-CREATOR-0123456789ABCDEF";
const DIGEST = createHash("sha256").update(TOKEN).digest("hex");
const TOKEN_KEY = "volleyos.creator.token";

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("creator unlock", () => {
  it("accepts only the token whose SHA-256 matches the public digest", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    await expect(matchesCreatorKey(TOKEN)).resolves.toBe(true);
    await expect(matchesCreatorKey(` ${TOKEN} `)).resolves.toBe(true);
    await expect(matchesCreatorKey("TEST-CREATOR-FFFFFFFFFFFFFFFF")).resolves.toBe(false);
    await expect(matchesCreatorKey("")).resolves.toBe(false);
  });

  it("refuses every token when no digest is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", "");
    await expect(matchesCreatorKey(TOKEN)).resolves.toBe(false);
  });

  it("hydrates the unlocked state by re-hashing the stored token", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    persistCreatorToken(TOKEN);
    await expect(creatorUnlocked()).resolves.toBe(true);
    clearCreatorUnlock();
    await expect(creatorUnlocked()).resolves.toBe(false);
  });

  it("rejects injected booleans and clears the bad value", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    for (const injected of ["true", "1", "admin"]) {
      window.localStorage.setItem(TOKEN_KEY, injected);
      await expect(creatorUnlocked()).resolves.toBe(false);
      expect(readCreatorToken()).toBeNull();
    }
  });

  it("rejects a stored token with the wrong digest", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    persistCreatorToken("TEST-CREATOR-WRONG");
    await expect(creatorUnlocked()).resolves.toBe(false);
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("treats a DEV_UNLOCK build as unlocked without storage", () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "true");
    expect(buildUnlocksCreator()).toBe(true);
  });
});
