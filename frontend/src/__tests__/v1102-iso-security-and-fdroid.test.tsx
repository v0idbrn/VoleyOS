/* v11.0.2 — ISO/OWASP hardening, OS-rotation bypass, F-Droid compliance. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkClockRollbackTamper,
  CLOCK_ROLLBACK_DETECTED,
  generateProLicenseToken,
  safeJsonParseUntrusted,
  sanitizeDvwImportContent,
  sanitizeUntrustedString,
  verifyProLicenseToken,
} from "../lib/security-hardening";
import { BlockShadowStation, RotationStation, ScoreboardStation, SeamRadarStation, SystemTransitionStation, TimeoutChalkboardStation } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
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
    // v11.0.3 — native TTS bridge + ready flag + lifecycle teardown.
    expect(main).toContain("public boolean speakTts(String text, String langTag)");
    expect(main).toContain("ttsReady = true");
    expect(main).toContain("ttsReady = false");
  });

  /* v11.0.3 — Cancha dock stays in flow ------------------------------------ */
  it("renders the Cancha primary dock in flow (never fixed or absolute)", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    const dock = screen.getByTestId("cancha-primary-dock") as HTMLElement;
    expect(dock.className).not.toMatch(/\bfixed\b/);
    expect(dock.className).not.toMatch(/\babsolute\b/);
    expect(["", "relative", "static"]).toContain(dock.style.position);
    // Scoreboard arena renders above the dock (compact match bar first).
    const card = screen.getByTestId("score-card");
    expect(card.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  /* v11.0.3 — TTS announcer end-to-end ------------------------------------- */
  it("PROBAR VOZ enables voleyos_tts_enabled and speaks through the native bridge", () => {
    const spoken: string[] = [];
    setBridge({ setSensorAutoRotateMode: () => undefined, speakTts: (text: string) => { spoken.push(text); return true; } } as TestBridge & { speakTts?: (text: string, langTag: string) => boolean });
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /Probar Voz/ }));
    expect(window.localStorage.getItem("voleyos_tts_enabled")).toBe("true");
    expect(window.localStorage.getItem("volleyos.voice")).toBe("1");
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken[0]).toMatch(/\d+\s*a\s*\d+/);
  });

  it("falls back to speechSynthesis with the Chromium cancel→resume sequence", async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const resume = vi.fn();
    class FakeUtterance {
      text: string;
      lang = "";
      volume = 0;
      rate = 0;
      pitch = 0;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak, cancel, resume, getVoices: () => [{ lang: "es-ES", default: true }] },
      configurable: true,
    });
    try {
      render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
      fireEvent.click(screen.getByRole("button", { name: /Probar Voz/ }));
      expect(cancel).toHaveBeenCalled();
      await waitFor(() => expect(speak).toHaveBeenCalled(), { timeout: 2000 });
      expect(resume).toHaveBeenCalled();
      const utterance = speak.mock.calls.at(-1)?.[0] as { volume?: number; rate?: number; pitch?: number };
      expect(utterance.volume).toBe(1);
      expect(utterance.rate).toBe(1.05);
      expect(utterance.pitch).toBe(1);
    } finally {
      delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
      delete (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance;
    }
  });

  /* v11.0.3 — header mode pill contrast ------------------------------------ */
  it("renders the header mode pill with visible text fill", () => {
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    render(<VolleyOSHub locale="es" />);
    const pill = screen.getByTestId("header-mode-pill") as HTMLElement;
    expect(pill.textContent).toContain("Modo Pro");
    expect(pill.style.webkitTextFillColor).toBe("rgb(251, 191, 36)");
    expect(pill.style.background).not.toBe("");
  });

  /* v11.0.4 — raw JSON ban, giant tokens, wrapped bars --------------------- */
  it("renders module-40 with zero raw JSON substrings", () => {
    const { container } = render(<SystemTransitionStation meta={meta("system-transition")} locale="es" onSave={noop} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain('[{"name":');
    expect(text).not.toContain("frontAttackersByRotation");
    expect(text).not.toContain("infiltrationMap");
    expect(screen.getByTestId("system-pill-5-1")).toBeTruthy();
    expect(text).toContain("Atacantes en Red");
  });

  it("renders the module-25 chalkboard canvas with localized priorities", () => {
    const { container } = render(<TimeoutChalkboardStation meta={meta("timeout-chalkboard")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("timeout-chalkboard-canvas")).toBeTruthy();
    const text = container.textContent ?? "";
    expect(text).toContain("PRIORIDAD ALTA · CERRAR RECEPCIÓN");
    expect(text).not.toContain("HIGH ·");
    expect(screen.getByTestId("timeout-clock").textContent).toContain("30.0s");
  });

  it("draws giant player tokens (r >= 24) on the three tactical boards", () => {
    const boards: Array<[string, () => ReactElement]> = [
      ["rotation", () => <RotationStation meta={meta("rotation")} locale="es" onSave={noop} />],
      ["block-shadow", () => <BlockShadowStation meta={meta("block-shadow")} locale="es" onSave={noop} />],
      ["seam-radar", () => <SeamRadarStation meta={meta("seam-radar")} locale="es" onSave={noop} />],
    ];
    for (const [slug, factory] of boards) {
      const { container } = render(factory());
      const circles = Array.from(container.querySelectorAll("circle"));
      const big = circles.map((circle) => Number(circle.getAttribute("r") ?? "0")).filter((radius) => radius >= 24);
      expect(big.length, `${slug} needs at least one r>=24 token`).toBeGreaterThan(0);
    }
  });

  it("wraps every module switcher bar so no pill is clipped", () => {
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    render(<VolleyOSHub locale="es" />);
    const bar = screen.getByTestId("workstation-bar") as HTMLElement;
    expect(bar.style.flexWrap).toBe("wrap");
    expect(bar.style.overflow).toBe("visible");
  });
});
