import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildUnlocksCreator, clearCreatorUnlock, creatorUnlocked, matchesCreatorKey, persistCreatorUnlock } from "./creator-unlock";

const TOKEN = "VOS-MASTER-0123456789ABCDEF";
const DIGEST = createHash("sha256").update(TOKEN).digest("hex");

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("creator unlock", () => {
  it("accepts only the token whose SHA-256 matches the public digest", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    await expect(matchesCreatorKey(TOKEN)).resolves.toBe(true);
    await expect(matchesCreatorKey(` ${TOKEN} `)).resolves.toBe(true);
    await expect(matchesCreatorKey("VOS-MASTER-FFFFFFFFFFFFFFFF")).resolves.toBe(false);
    await expect(matchesCreatorKey("")).resolves.toBe(false);
  });

  it("refuses every token when no digest is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", "");
    await expect(matchesCreatorKey(TOKEN)).resolves.toBe(false);
  });

  it("persists the unlocked state and clears it again", () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "false");
    expect(creatorUnlocked()).toBe(false);
    persistCreatorUnlock();
    expect(creatorUnlocked()).toBe(true);
    clearCreatorUnlock();
    expect(creatorUnlocked()).toBe(false);
  });

  it("treats a DEV_UNLOCK build as unlocked without storage", () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "true");
    expect(buildUnlocksCreator()).toBe(true);
    expect(creatorUnlocked()).toBe(true);
  });
});
