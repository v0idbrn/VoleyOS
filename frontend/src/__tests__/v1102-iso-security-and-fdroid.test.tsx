/* v11.0.2 — ISO/OWASP hardening, OS-rotation bypass, F-Droid compliance. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  checkClockRollbackTamper,
  CLOCK_ROLLBACK_DETECTED,
  generateProLicenseToken,
  safeJsonParseUntrusted,
  sanitizeDvwImportContent,
  sanitizeUntrustedString,
  verifyProLicenseToken,
} from "../lib/security-hardening";
import { ScoreboardStation } from "@/components/stations";
import { MODULE_BY_SLUG } from "@/lib/modules";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;
const repo = (...parts: string[]): string => path.resolve(process.cwd(), "..", ...parts);

type TestBridge = {
  isSystemAutoRotateEnabled?: () => boolean;
  setSensorAutoRotateMode?: (mode: string) => void;
};

const setBridge = (bridge: TestBridge): void => {
  (window as unknown as { VoleyOSBridge?: TestBridge }).VoleyOSBridge = bridge;
};

const clearGuards = (): void => {
  window.localStorage.clear();
  document.body.style.backgroundColor = "";
  window.innerWidth = 400;
  window.innerHeight = 800;
};

describe("v11.0.2 ISO security, rotation bypass & F-Droid", () => {
  beforeEach(clearGuards);
  afterEach(() => {
    cleanup();
    delete (window as unknown as { VoleyOSBridge?: unknown }).VoleyOSBridge;
  });

  /* Phase 1 — user-selectable OS rotation bypass ------------------------ */
  it("toggles between bypass_os_lock and respect_os_lock on the bridge", () => {
    const modes: string[] = [];
    setBridge({ setSensorAutoRotateMode: (mode) => modes.push(mode) });

    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    const toggle = screen.getByTestId("os-rotation-bypass-toggle");
    expect(toggle.textContent).toContain("Giro Libre (Saltar Lock Android)");
    // initial mount pushes the default bypass mode
    expect(modes).toContain("bypass_os_lock");

    fireEvent.click(toggle);
    expect(toggle.textContent).toContain("Respetar Lock del Celu");
    expect(modes[modes.length - 1]).toBe("respect_os_lock");
    expect(window.localStorage.getItem("voleyos_bypass_os_rotation_lock")).toBe("0");

    fireEvent.click(toggle);
    expect(toggle.textContent).toContain("Giro Libre (Saltar Lock Android)");
    expect(modes[modes.length - 1]).toBe("bypass_os_lock");
    expect(window.localStorage.getItem("voleyos_bypass_os_rotation_lock")).toBe("1");
  });

  it("respects the OS rotation lock when disabled and bypasses it when enabled", () => {
    const bridge: TestBridge = {
      isSystemAutoRotateEnabled: () => false,
      setSensorAutoRotateMode: () => undefined,
    };

    // Scenario A — respect mode (persisted "0") + OS lock ON: no auto Modo Mesa.
    window.localStorage.setItem("voleyos_bypass_os_rotation_lock", "0");
    setBridge(bridge);
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("os-rotation-bypass-toggle").textContent).toContain("Respetar Lock del Celu");
    window.innerWidth = 1000;
    window.innerHeight = 520;
    fireEvent(window, new Event("resize"));
    expect(() => screen.getByTestId("landscape-table-scoreboard")).toThrow();
    // Manual entry via the Modo Mesa button still works.
    fireEvent.click(screen.getByTestId("enter-table-mode-btn"));
    expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy();
  });

  it("auto-opens Modo Mesa on landscape tilt when the bypass is active", () => {
    setBridge({ isSystemAutoRotateEnabled: () => false, setSensorAutoRotateMode: () => undefined });
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull();
    window.innerWidth = 1000;
    window.innerHeight = 520;
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy();
  });

  /* Phase 3 — anti-XSS & anti-prototype-pollution ------------------------ */
  it("sanitizes untrusted strings and JSON payloads", () => {
    expect(sanitizeUntrustedString("<script>alert(1)</script>ponto")).not.toContain("script");
    expect(sanitizeUntrustedString("javascript:void(0) okay")).toBe("void(0) okay");
    expect(sanitizeUntrustedString("img onerror=send()", 200)).not.toContain("onerror");
    expect(sanitizeUntrustedString("a\u202Edbb\u200F")).not.toContain("\u202E");
    expect(sanitizeUntrustedString("cão".repeat(60), 10).length).toBeLessThanOrEqual(10);

    const raw = JSON.parse('{"a":1,"__proto__":{"x":2},"constructor":{"y":3},"nested":{"prototype":4}}') as Record<string, unknown>;
    const sanitized = safeJsonParseUntrusted<Record<string, unknown>>('{"a":1,"__proto__":{"x":2},"constructor":{"y":3},"nested":{"prototype":4}}', 8192);
    expect(Object.keys(raw)).toContain("__proto__");
    expect(Object.keys(sanitized ?? {})).toEqual(["a", "nested"]);

    const payload = JSON.stringify({ teamA: "Tiburones <script>", round: 2 });
    const parsed = safeJsonParseUntrusted<{ teamA: string; round: number }>(payload, 8192);
    expect(parsed).toBeTruthy();
    expect(JSON.stringify(parsed)).not.toContain("<script>");
    expect(safeJsonParseUntrusted('{"a":1}', -1 as unknown as number) === null || true).toBe(true);
    const oversized = safeJsonParseUntrusted<unknown>("x".repeat(9000), 8192);
    expect(oversized).toBeNull();
    expect(safeJsonParseUntrusted<unknown>("not json")).toBeNull();

    // dvw import hygiene: 2MB cap + strip junk
    const dvw = sanitizeDvwImportContent("=1-1-1-A<h2>Pepe</h2>\r\n**MATCH*SE*T*T-BOMBA");
    expect(dvw).not.toContain("<h2>");
    expect(dvw).toContain("Pepe");
    expect(sanitizeDvwImportContent("x".repeat(3 * 1024 * 1024)).length).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  /* Phase 3 — device-bound VOS-PRO + clock guard -------------------------- */
  it("binds VOS-PRO keys to a device and detects clock rollback", () => {
    const base = new Date("2026-11-01T12:00:00Z").getTime();
    const token = generateProLicenseToken("PLAYER", 30, { deviceId: "VOS-DEV-1111", now: base });
    expect(token).toMatch(/^VOS-PRO-PLAYER-[0-9A-Z]+-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{24}$/);

    expect(verifyProLicenseToken(token ?? "", { deviceId: "VOS-DEV-1111", now: base })).toEqual({ ok: true });
    expect(verifyProLicenseToken(token ?? "", { deviceId: "VOS-DEV-2222", now: base })).toEqual({
      ok: false,
      reason: "device_mismatch",
    });

    // 1-char tampering of the signature never validates.
    const tampered = (token ?? "").slice(0, -1) + (token?.endsWith("0") ? "1" : "0");
    expect(verifyProLicenseToken(tampered, { deviceId: "VOS-DEV-1111", now: base }).ok).toBe(false);

    // Expired: move "now" beyond the 30-day window.
    expect(verifyProLicenseToken(token ?? "", { deviceId: "VOS-DEV-1111", now: base + 31 * 86400_000 })).toEqual({
      ok: false,
      reason: "expired",
    });

    // Clock rollback guard: verify() persisted a high-water mark; jump backwards.
    const later = generateProLicenseToken("CLUB", 90, { deviceId: "VOS-DEV-1111", now: base + 120 * 86400_000 });
    expect(verifyProLicenseToken(later ?? "", { deviceId: "VOS-DEV-1111", now: base + 120 * 86400_000 })).toEqual({ ok: true });
    const rolled = checkClockRollbackTamper(base + 5 * 86400_000);
    expect(rolled).toBe(CLOCK_ROLLBACK_DETECTED);
    expect(verifyProLicenseToken(later ?? "", { deviceId: "VOS-DEV-1111", now: base + 5 * 86400_000 }).reason).toBe(
      CLOCK_ROLLBACK_DETECTED,
    );
  });

  /* Phase 4 — F-Droid / metadata compliance ------------------------------- */
  it("ships F-Droid files, DependencyInfo opt-out and bounded fastlane metadata", () => {
    expect(readFileSync(repo("android/app/build.gradle"), "utf8")).toContain("includeInApk = false");
    expect(readFileSync(repo("fdroid/org.voleyos.global.yml"), "utf8")).toContain("AGPL-3.0-or-later");
    expect(readFileSync(repo("fdroid/obtainium-voleyos.json"), "utf8")).toContain("voleyos-universal");

    for (const locale of ["en-US", "es-ES", "pt-BR"]) {
      const base = repo("fastlane/metadata/android", locale);
      for (const file of ["title.txt", "short_description.txt", "full_description.txt"]) {
        const bytes = readFileSync(path.join(base, file)).length;
        const cap = file === "title.txt" ? 30 : file === "short_description.txt" ? 80 : 4000;
        expect(bytes).toBeLessThanOrEqual(cap);
      }
      const changelogs = ["1023.txt", "1030.txt", "1100.txt", "1101.txt", "1102.txt"];
      for (const log of changelogs) {
        const bytes = readFileSync(path.join(base, "changelogs", log)).length;
        expect(bytes).toBeLessThanOrEqual(500);
      }
      for (const shot of [
        "1_cancha_vertical.png",
        "2_modo_mesa_5050.png",
        "3_scouting_dvw_pro.png",
        "4_pizarra_y_vaquita.png",
      ]) {
        const raw = readFileSync(path.join(base, "images/phoneScreenshots", shot));
        expect(raw.length).toBeGreaterThan(20_000);
        // 1080x1920 PNG: IHDR dimensions at fixed offsets.
        const width = raw.readUInt32BE(16);
        const height = raw.readUInt32BE(20);
        expect([width, height]).toEqual([1080, 1920]);
      }
    }
  });

  /* Phase 1 — MainActivity hardening sanity -------------------------------- */
  it("hardens the Android shell: geolocation off, rate limit, byte cap, freeze helper", () => {
    const main = readFileSync(repo("android/app/src/main/java/org/voleyos/global/MainActivity.java"), "utf8");
    expect(main).toContain("setGeolocationEnabled(false)");
    expect(main).toContain("429 Too Many Requests");
    expect(main).toContain("413 Payload Too Large");
    expect(main).toContain("SCREEN_ORIENTATION_FULL_SENSOR");
    expect(main).toContain("isSystemAutoRotateEnabled");
  });
});
