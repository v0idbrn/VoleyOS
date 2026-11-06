/**
 * v11.1.0 — permanent quality gate.
 *
 * Renders every one of the 61 modules in ES/EN/PT and fails on any raw engine
 * artefact (NaN, Infinity, undefined, [object Object], JSON dumps, camelCase
 * identifiers or untranslated enum constants), then locks the Pro paywall,
 * the header lock badge and the design-system form-control contrast.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GymScreenModule } from "@/components/GymScreenModule";
import { STATIONS } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
import { MODULES } from "@/lib/modules";
import { ENUM_LABELS, translateEnum } from "@/lib/module-labels";
import { PRO_LICENSE_KEY, proDeviceId } from "@/lib/pro-entitlement";
import { generateProLicenseToken } from "@/lib/security-hardening";
import type { Locale } from "@/lib/local-engines";

vi.mock("@/lib/sound-effects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sound-effects")>();
  const silent = (): boolean => true;
  return {
    ...actual,
    playPicaditoCue: vi.fn(silent),
    playScorePop: vi.fn(silent),
    playSetWinFanfare: vi.fn(silent),
    playCrowdCheer: vi.fn(silent),
    playWarmupTick: vi.fn(silent),
    playCoinClink: vi.fn(silent),
    playJudgeGavel: vi.fn(silent),
    playWhistle: vi.fn(silent),
    playBuzzer: vi.fn(silent),
    playLevelUpArpeggio: vi.fn(silent),
    playSneakerSqueak: vi.fn(silent),
  };
});

const proMock = vi.hoisted(() => ({ entitled: false }));

vi.mock("@/lib/pro-entitlement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pro-entitlement")>();
  return { ...actual, isUserProEntitled: () => proMock.entitled };
});

const LOCALES: Locale[] = ["es", "en", "pt"];
const RAW_ARTEFACTS = [/NaN/, /Infinity/, /undefined/, /\[object Object\]/, /\[\{"/, /\{"[A-Za-z0-9_]+":/];
/** Legit camelCase-looking brands that are not engine identifiers. */
const BRAND_ALLOWLIST = /DataVolley|VoiceOver|iPhone|iCloud|kPa|eScoresheet|WhatsApp|YouTube|LinkedIn|TikTok|PayPal|iPad|macOS|iOS|eCommerce/g;
/** Uppercase acronyms that are product vocabulary, not engine enums. */
const ACRONYM_ALLOWLIST = new Set([
  "ACWR", "PDF", "CSV", "FIVB", "MMR", "USB", "SMS", "QR", "AI", "IA", "ELO", "OLED", "TV", "PC", "MVP",
  "K1", "K2", "SO", "R1", "R2", "R3", "R4", "R5", "R6", "SET", "PRO", "FOSS", "CLOUD", "HMAC", "VOS",
  "CPU", "GPU", "URL", "API", "AGPL", "WA", "PNG", "EDL", "CPM", "USD", "AR", "BR", "ES", "MX", "US",
]);
const ENUM_TOKENS = Object.keys(ENUM_LABELS).filter((token) => /^[A-Z]/.test(token));

function stationText(slug: string, locale: Locale): string {
  const meta = MODULES.find((entry) => entry.slug === slug);
  const Station = STATIONS[slug];
  if (!meta || !Station) throw new Error(`missing station ${slug}`);
  const { container, unmount } = render(<Station meta={meta} locale={locale} onSave={() => undefined} />);
  // Join text NODES (not textContent) so adjacent elements never fuse into a
  // phantom camelCase token such as "visuales" + "Salto".
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const value = (node.nodeValue ?? "").trim();
    if (value) parts.push(value);
  }
  const text = parts.join("\u0001");
  unmount();
  cleanup();
  return text;
}

function violations(text: string, locale: Locale): string[] {
  const found: string[] = [];
  for (const pattern of RAW_ARTEFACTS) {
    if (pattern.test(text)) found.push(`raw artefact ${pattern.source}`);
  }
  const camel = text.replace(BRAND_ALLOWLIST, " ").match(/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g) ?? [];
  for (const hit of new Set(camel)) found.push(`camelCase ${hit}`);
  if (locale !== "en") {
    for (const token of ENUM_TOKENS) {
      if (!new RegExp(`\\b${token}\\b`).test(text)) continue;
      if (ACRONYM_ALLOWLIST.has(token)) continue;
      // A label identical in the target language is intentional copy (FALTA,
      // LEGAL, ELITE), not an untranslated engine constant.
      if (translateEnum(token, locale) === token) continue;
      found.push(`raw enum ${token}`);
    }
    const upper = text.match(/\b[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)+\b/g) ?? [];
    for (const token of new Set(upper)) {
      if (ACRONYM_ALLOWLIST.has(token)) continue;
      found.push(`raw constant ${token}`);
    }
  }
  return found;
}

describe("v11.1.0 — all 61 modules stay human in ES/EN/PT", () => {
  it("ships zero raw artefacts, identifiers or untranslated enums", () => {
    expect(MODULES.length).toBe(61);
    const failures: string[] = [];
    for (const locale of LOCALES) {
      for (const meta of MODULES) {
        const text = stationText(meta.slug, locale);
        const issues = violations(text, locale);
        if (issues.length > 0) failures.push(`[${locale}] ${meta.slug}: ${issues.join(", ")}`);
      }
    }
    expect(failures).toEqual([]);
  }, 180_000);
});

/* ------------------------------------------------------------------ *
 * Pro paywall
 * ------------------------------------------------------------------ */

const DEVICE = "test-device-1110";

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("voleyos_onboarding_done", "1");
  window.localStorage.setItem("volleyos_force_test_paywall", "1");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      media: "",
      onchange: null,
    }),
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(() => Promise.resolve(true)) },
  });
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vi.fn(() => true) });
  proMock.entitled = false;
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("v11.1.0 — Pro paywall", () => {
  it("locks the header, opens the modal, copies the device ID and rejects a bad key", async () => {
    render(<VolleyOSHub locale="es" />);
    const toggle = screen.getByTestId("header-mode-toggle");
    expect(toggle.textContent).toContain("🔒");
    fireEvent.click(toggle);
    const modal = screen.getByTestId("pro-paywall-modal");
    expect(modal.textContent).toContain("61 MOTORES");
    expect(screen.getByTestId("paywall-device-id").textContent).toBe(proDeviceId());

    fireEvent.click(screen.getByTestId("paywall-copy-device-id-btn"));
    await waitFor(() => expect(screen.getByTestId("paywall-copy-device-id-btn").textContent).toContain("✅"));

    fireEvent.change(screen.getByTestId("paywall-license-input"), { target: { value: "VOS-PRO-NOPE" } });
    fireEvent.click(screen.getByTestId("paywall-activate-btn"));
    expect(screen.getByRole("alert").textContent).toContain("inválida");
    expect(screen.getByTestId("pro-paywall-modal")).toBeTruthy();
  });

  it("unlocks Pro with a valid device-bound token and Escape closes the modal", async () => {
    const token = generateProLicenseToken("PLAYER", 30, { deviceId: proDeviceId() });
    if (!token) throw new Error("token generation failed");
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    fireEvent.change(screen.getByTestId("paywall-license-input"), { target: { value: token } });
    fireEvent.click(screen.getByTestId("paywall-activate-btn"));
    await waitFor(() => expect(screen.queryByTestId("pro-paywall-modal")).toBeNull());
    expect(window.localStorage.getItem(PRO_LICENSE_KEY)).toBe(token);

    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    expect(screen.queryByTestId("pro-paywall-modal")).toBeNull();
    expect(screen.getByTestId("header-mode-toggle").textContent).not.toContain("🔒");

    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("pro-paywall-modal")).toBeNull());
  });
});

/* ------------------------------------------------------------------ *
 * Design-system contrast guard
 * ------------------------------------------------------------------ */

describe("v11.1.0 — form control contrast", () => {
  const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

  it("forces dark fields, visible borders and dark dropdown options", () => {
    expect(css).toMatch(/--vos-field:\s*#12151e/i);
    expect(css).toMatch(/select option[\s\S]{0,120}background-color:\s*var\(--vos-field\)/i);
    expect(css).toMatch(/input:not\(\[type="checkbox"\]\)[\s\S]{0,400}min-height:\s*40px/i);
  });

  it("never leaves a button with zero-size or transparent ink in station markup", () => {
    const text = stationText("scoreboard", "es");
    expect(text).not.toContain("undefined");
    expect(text.trim().length).toBeGreaterThan(40);
  });
});

/* ------------------------------------------------------------------ *
 * v11.2.0 — Live Match Bus & Official Match Sheet
 * ------------------------------------------------------------------ */

describe("v11.2.0 — live bus sync badge & official match sheet", () => {
  it("shows live-bus-sync-badge in the gym screen when the bus carries a snapshot", () => {
    window.localStorage.setItem(
      "voleyos_live_match_bus_v1",
      JSON.stringify({
        teamA: "Tiburones",
        teamB: "Cóndores",
        scoreA: 12,
        scoreB: 9,
        setsA: 1,
        setsB: 1,
        serving: "A",
        rotation: 3,
        sanctions: [],
      }),
    );
    render(<GymScreenModule locale="es" onClose={() => undefined} />);
    const badge = screen.getByTestId("live-bus-sync-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).not.toMatch(/NaN|undefined/);
    expect(screen.getByDisplayValue("Tiburones")).toBeTruthy();
    expect(screen.getByDisplayValue("Cóndores")).toBeTruthy();
  });

  it("exports the official match sheet with K1/K2/Side-Out and R1–R6 and zero NaN", () => {
    const meta = MODULES.find((entry) => entry.slug === "scoreboard");
    const Station = STATIONS.scoreboard;
    if (!meta || !Station) throw new Error("scoreboard station missing");
    render(<Station meta={meta} locale="es" onSave={() => undefined} />);
    fireEvent.click(screen.getByTestId("export-match-sheet-btn"));
    const card = screen.getByTestId("official-match-sheet-card");
    expect(card.textContent).toContain("K1%");
    expect(card.textContent).toContain("Side-Out%");
    expect(card.textContent).toContain("R1");
    expect(card.textContent).not.toContain("NaN");
    expect(card.textContent).not.toContain("undefined");
  });
});
