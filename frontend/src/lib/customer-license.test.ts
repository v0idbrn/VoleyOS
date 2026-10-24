import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDeviceInstallId,
  holderSlug,
  signCustomerLicense,
  verifyCustomerLicense,
} from "./creator-unlock";
import {
  KOFI_URL,
  MP_ALIAS,
  PRICING,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
  expiryForDuration,
  priceFor,
  waReceiptUrl,
} from "./payment-config";

const DIGEST = createHash("sha256").update("secret-key-for-tests").digest("hex");

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
});

describe("payment endpoints", () => {
  it("ships the production WhatsApp, MP and Ko-fi endpoints", () => {
    expect(WHATSAPP_NUMBER).toBe("+5493874661269");
    expect(WHATSAPP_URL).toBe("https://wa.me/5493874661269");
    expect(MP_ALIAS).toBe("unfrgvnn.dead");
    expect(KOFI_URL).toBe("https://ko-fi.com/unfrgvnn");
  });

  it("fills the WhatsApp receipt with device id and plan", () => {
    const url = waReceiptUrl({ deviceId: "AB12-CD34", tier: "CLUB", duration: "1y", currency: "USD" });
    expect(url.startsWith(`${WHATSAPP_URL}?text=`)).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1] ?? "");
    expect(text).toContain("AB12-CD34");
    expect(text).toContain("CLUB · 1y");
    expect(text).toContain("$24.99");
  });

  it("exposes the full 3-tier × 4-duration × 4-currency matrix", () => {
    let prices = 0;
    for (const tier of Object.values(PRICING)) {
      for (const duration of Object.values(tier)) {
        for (const value of Object.values(duration)) {
          expect(value.length).toBeGreaterThan(2);
          prices += 1;
        }
      }
    }
    expect(prices).toBe(48);
    expect(priceFor("PLAYER", "7d", "ARS")).toBe("$2.500");
    expect(priceFor("TOURNAMENT", "LIFE", "BRL")).toBe("R$ 349,90");
    expect(priceFor("CLUB", "30d", "EUR")).toBe("€8.99");
  });

  it("computes expiries as YYYYMMDD or LIFE", () => {
    expect(expiryForDuration("LIFE")).toBe("LIFE");
    expect(expiryForDuration("7d", new Date(Date.UTC(2026, 0, 1)))).toBe("20260108");
    expect(expiryForDuration("1y", new Date(Date.UTC(2026, 0, 1)))).toBe("20270101");
  });
});

describe("device-bound VOS-PRO licence (anti-sharing)", () => {
  it("signs and verifies a licence on the same device", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const code = await signCustomerLicense({
      deviceId: "AB12-CD34",
      tier: "PLAYER",
      expiry: "20991231",
      holder: "María José",
    });
    expect(code).toMatch(/^VOS-PRO\.AB12-CD34\.PLAYER\.20991231\.MARIA-JOSE\.[0-9a-f]{16}$/);
    const check = await verifyCustomerLicense(code ?? "", { deviceId: "AB12-CD34" });
    expect(check.ok).toBe(true);
  });

  it("rejects the same licence on a DIFFERENT device (sharing blocked)", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const code = await signCustomerLicense({
      deviceId: "AB12-CD34",
      tier: "CLUB",
      expiry: "LIFE",
      holder: "Club Norte",
    });
    const check = await verifyCustomerLicense(code ?? "", { deviceId: "FFFF-0000" });
    expect(check).toEqual({ ok: false, reason: "device_mismatch" });
  });

  it("rejects tampered fields and forged signatures", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const code = await signCustomerLicense({
      deviceId: "AB12-CD34",
      tier: "PLAYER",
      expiry: "20260101",
      holder: "Ana",
    });
    const parts = (code ?? "").split(".");
    expect((await verifyCustomerLicense(code ?? "", { deviceId: "AB12-CD34", now: new Date(Date.UTC(2026, 0, 1)) })).ok).toBe(true);

    // upgrade the tier without re-signing
    const forged = [...parts];
    forged[2] = "TOURNAMENT";
    expect(await verifyCustomerLicense(forged.join("."), { deviceId: "AB12-CD34" })).toEqual({ ok: false, reason: "signature" });

    // garbage
    expect(await verifyCustomerLicense("VOS-PRO.WHAT")).toEqual({ ok: false, reason: "malformed" });
    expect(await verifyCustomerLicense("")).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects an expired licence but accepts LIFE forever", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const expired = await signCustomerLicense({
      deviceId: "AB12-CD34",
      tier: "PLAYER",
      expiry: "20260101",
      holder: "Ana",
    });
    const check = await verifyCustomerLicense(expired ?? "", {
      deviceId: "AB12-CD34",
      now: new Date(Date.UTC(2026, 0, 2)),
    });
    expect(check).toEqual({ ok: false, reason: "expired" });

    const life = await signCustomerLicense({ deviceId: "AB12-CD34", tier: "TOURNAMENT", expiry: "LIFE", holder: "Ana" });
    expect((await verifyCustomerLicense(life ?? "", { deviceId: "AB12-CD34", now: new Date(Date.UTC(2200, 0, 1)) })).ok).toBe(true);
  });

  it("rejects signing without a configured creator key digest", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", "");
    const code = await signCustomerLicense({ deviceId: "AB12-CD34", tier: "PLAYER", expiry: "LIFE", holder: "Ana" });
    expect(code).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const valid = await signCustomerLicense({ deviceId: "AB12-CD34", tier: "PLAYER", expiry: "LIFE", holder: "Ana" });
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", "");
    expect(await verifyCustomerLicense(valid ?? "", { deviceId: "AB12-CD34" })).toEqual({ ok: false, reason: "no_key" });
  });

  it("keeps a stable install id outside the Android bridge", () => {
    const first = getDeviceInstallId();
    expect(first).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(getDeviceInstallId()).toBe(first);
  });

  it("slugifies holders into the licence format", () => {
    expect(holderSlug("  Club & Néstor Kirchner  ")).toBe("CLUB-NESTOR-KIRCHNER");
    expect(holderSlug("###")).toBe("HOLD");
  });
});
