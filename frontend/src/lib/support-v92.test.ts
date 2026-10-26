import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SUPPORT_COOLDOWN_MS,
  canAskSupport,
  clearSupporterChip,
  markSupportAsked,
  persistSupporterChip,
  signSupporterChip,
  supportCooldownDays,
  supporterChipActive,
  verifySupporterChip,
} from "@/lib/support";
import {
  APP_VERSION,
  RELEASES_URL,
  checkForUpdate,
  isNewerVersion,
  parseVersion,
} from "@/lib/update-check";

describe("donation sheet cooldown", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks on the first emotional moment and then stays quiet for 7 days", () => {
    const now = 1_800_000_000_000;
    expect(canAskSupport(now)).toBe(true);
    expect(markSupportAsked(now)).toBe(now + SUPPORT_COOLDOWN_MS);
    expect(canAskSupport(now)).toBe(false);
    expect(canAskSupport(now + SUPPORT_COOLDOWN_MS - 1)).toBe(false);
    expect(canAskSupport(now + SUPPORT_COOLDOWN_MS)).toBe(true);
  });

  it("reports the days left on the cooldown", () => {
    const now = 1_800_000_000_000;
    expect(supportCooldownDays(now)).toBe(0);
    markSupportAsked(now);
    expect(supportCooldownDays(now)).toBe(7);
    expect(supportCooldownDays(now + 5 * 24 * 60 * 60 * 1000)).toBe(2);
    expect(supportCooldownDays(now + SUPPORT_COOLDOWN_MS)).toBe(0);
  });

  it("treats a corrupted timestamp as an invitation to ask again", () => {
    window.localStorage.setItem("voleyos.donation.lastAsk", "not-a-number");
    expect(canAskSupport()).toBe(true);
  });
});

describe("supporter chip codes", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("signs and verifies VOS-CHIP codes offline", async () => {
    const chip = await signSupporterChip("ana");
    expect(chip).toMatch(/^VOS-CHIP\.[0-9A-F]{12}\.[0-9A-F]{8}$/);
    expect(await verifySupporterChip(chip ?? "")).toBe(true);
    expect(await verifySupporterChip((chip ?? "").toLowerCase())).toBe(true);
  });

  it("rejects tampered and malformed codes", async () => {
    const chip = (await signSupporterChip("ana")) ?? "";
    const [prefix, body, sig] = chip.split(".") as [string, string, string];
    const flipped = `${prefix}.${body.slice(0, -1)}${body.endsWith("A") ? "B" : "A"}.${sig}`;
    expect(await verifySupporterChip(flipped)).toBe(false);
    expect(await verifySupporterChip(`${prefix}.${body}.00000000`)).toBe(false);
    expect(await verifySupporterChip("VOS-CHIP")).toBe(false);
    expect(await verifySupporterChip("VOS-PRO.ABCD-1234.PLAYER.LIFE.HOLD.0123456789abcdef")).toBe(false);
    expect(await verifySupporterChip("")).toBe(false);
    expect(await signSupporterChip("   ")).toBeNull();
  });

  it("activates and clears the golden badge state", async () => {
    expect(supporterChipActive()).toBe(false);
    expect(await persistSupporterChip(await signSupporterChip("lucia") ?? "")).toBe(true);
    expect(supporterChipActive()).toBe(true);
    expect(await persistSupporterChip("VOS-CHIP.ABCDEF012345.00000000")).toBe(false);
    expect(supporterChipActive()).toBe(true);
    clearSupporterChip();
    expect(supporterChipActive()).toBe(false);
  });
});

describe("github update checker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses and compares semantic tags", () => {
    expect(parseVersion("v9.2.0")).toEqual([9, 2, 0]);
    expect(parseVersion("9.2")).toEqual([9, 2]);
    expect(isNewerVersion("v9.2.0", "9.1.4")).toBe(true);
    expect(isNewerVersion("9.2.0", APP_VERSION)).toBe(false);
    expect(isNewerVersion("9.1.0", "9.2.0")).toBe(false);
    expect(isNewerVersion("10.0.0", "9.9.9")).toBe(true);
    expect(isNewerVersion("9.2.0", "9.2.0")).toBe(false);
  });

  it("only fetches the release endpoint when asked and flags a newer APK", async () => {
    const fetcher = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: "v99.0.0",
          html_url: "https://github.com/v0idbrn/VoleyOS/releases/tag/v99.0.0",
          assets: [
            { name: "voleyos.apk", browser_download_url: "https://example.com/voleyos.apk" },
          ],
        }),
      }) as unknown as Response,
    );
    const result = await checkForUpdate(APP_VERSION, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(RELEASES_URL, expect.anything());
    expect(result).toEqual({ status: "update", version: "v99.0.0", url: "https://example.com/voleyos.apk" });
  });

  it("reports up-to-date for the shipped tag", async () => {
    const fetcher = vi.fn(async () =>
      ({ ok: true, status: 200, json: async () => ({ tag_name: `v${APP_VERSION}` }) }) as unknown as Response,
    );
    const result = await checkForUpdate(APP_VERSION, fetcher as unknown as typeof fetch);
    expect(result.status).toBe("up-to-date");
  });

  it("fails soft on HTTP errors and network failures", async () => {
    const httpError = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response);
    expect((await checkForUpdate(APP_VERSION, httpError as unknown as typeof fetch)).status).toBe("error");

    const offline = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await checkForUpdate(APP_VERSION, offline as unknown as typeof fetch);
    expect(result).toEqual({ status: "error", message: "offline" });
  });
});
