import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GymScreenModule } from "@/components/GymScreenModule";
import { AcwrStation, MatchupMatrixStation, ScoreboardStation } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
import { matchupMatrix } from "@/lib/local-engines";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { proDeviceId } from "@/lib/pro-entitlement";
import { generateBatchClubLicenses, generateProLicenseToken, verifyProLicenseToken } from "@/lib/security-hardening";
import { getActiveLicenseSummary } from "@/lib/pro-entitlement";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};
const noop = (): void => undefined;
const repo = (...parts: string[]): string => path.resolve(process.cwd(), "..", ...parts);

describe("v11.0.5 Paywall & Editable Inputs", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.style.backgroundColor = "";
  });

  afterEach(() => cleanup());

  it("enforces the Pro paywall: mode switch opens the modal and a valid VOS-PRO key unlocks Pro", async () => {
    window.localStorage.setItem("voleyos_force_test_paywall", "1");
    window.localStorage.setItem("volleyos.uiMode", "simple");
    render(<VolleyOSHub locale="es" />);
    // Unentitled pro mode in storage is reset to simple on mount.
    await waitFor(() => expect(screen.getByTestId("header-mode-toggle").textContent).toContain("Modo Simple"));
    expect(screen.getByTestId("pro-lock-badge").textContent).toContain("PRO");
    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    const modal = screen.getByTestId("pro-paywall-modal");
    expect(modal).toBeTruthy();
    expect(screen.getByTestId("paywall-device-id").textContent).toContain("VOS-DEV-");
    // An invalid key never unlocks Pro.
    fireEvent.change(screen.getByTestId("paywall-license-input"), { target: { value: "VOS-PRO-FAKE-KEY" } });
    fireEvent.click(screen.getByTestId("paywall-activate-btn"));
    expect(screen.getByRole("alert").textContent).toContain("inválida");
    expect(screen.getByTestId("pro-paywall-modal")).toBeTruthy();
    expect(window.localStorage.getItem("volleyos.uiMode")).not.toBe("pro");
    // A valid device-bound key unlocks Pro immediately.
    const token = generateProLicenseToken("PLAYER", 30, { deviceId: proDeviceId() });
    expect(token).toBeTruthy();
    fireEvent.change(screen.getByTestId("paywall-license-input"), { target: { value: token ?? "" } });
    fireEvent.click(screen.getByTestId("paywall-activate-btn"));
    await waitFor(() => expect(screen.queryByTestId("pro-paywall-modal")).toBeNull());
    expect(window.localStorage.getItem("voleyos_pro_license")).toBe(token);
    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    expect(screen.getByTestId("header-mode-pill").textContent).toContain("Modo Pro");
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("pro");
    expect(screen.queryByTestId("pro-lock-badge")).toBeNull();
  });

  it("Monitor ACWR recalculates AGUDA 7D and the ACWR ratio live from editable inputs", () => {
    render(<AcwrStation meta={meta("acwr")} locale="es" onSave={noop} />);
    // 7 preset days at 185 jumps → acute 1295.
    expect(screen.getByText("1295")).toBeTruthy();
    fireEvent.change(screen.getByTestId("acwr-day-input-0"), { target: { value: "300" } });
    expect(screen.getByText("1410")).toBeTruthy();
    // Chronic override 2000 → ratio 1410/2000 = 0.71 → SUBCARGA zone.
    fireEvent.change(screen.getByTestId("acwr-chronic-input"), { target: { value: "2000" } });
    expect(screen.getByText("0.71")).toBeTruthy();
    expect(screen.getByText("SUBCARGA")).toBeTruthy();
  });

  it("Matriz de Cruces 6x6 renders the editor and never ties bestStart to avoidRotation", () => {
    render(<MatchupMatrixStation meta={meta("matchup-matrix")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("matchup-matrix-editor")).toBeTruthy();
    const report = matchupMatrix({ opponentAttack: [90, 72, 64, 58, 46, 38], ownBlock: [52, 58, 64, 70, 76, 82] });
    expect(report.bestStartingRotation).not.toBe(report.worstStartingRotation);
    // Even a perfectly uniform input must not collapse best === avoid.
    const uniform = matchupMatrix({ opponentAttack: [50, 50, 50, 50, 50, 50], ownBlock: [50, 50, 50, 50, 50, 50] });
    expect(uniform.bestStartingRotation).not.toBe(uniform.worstStartingRotation);
    expect(uniform.matrix.flat().every((value) => value === 0)).toBe(true);
  });

  it("Pantalla Gigante de Gimnasio has working timer controls, fullscreen and no clipped bottom", () => {
    const { container } = render(<GymScreenModule locale="es" onClose={noop} />);
    const toggle = screen.getByTestId("gym-timer-toggle-btn");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("gym-fullscreen-btn")).toBeTruthy();
    // The old clipping classes are gone from the scoreboard grid.
    expect(container.querySelector(".aspect-video")).toBeNull();
    expect(container.querySelector(".max-h-\\[70vh\\]")).toBeNull();
    // +1 Min and Reset manipulate the clock.
    fireEvent.click(screen.getByText("+1 Min"));
    expect(screen.getByText("01:00")).toBeTruthy();
    fireEvent.click(screen.getByTestId("gym-reset-btn"));
    expect(screen.getByText("00:00")).toBeTruthy();
  });

  it("renders the v11.3.0 real checkout: 4 currencies, 3 rails and the 5 Pro plans", async () => {
    window.localStorage.setItem("voleyos_force_test_paywall", "1");
    window.localStorage.setItem("volleyos.uiMode", "simple");
    render(<VolleyOSHub locale="es" />);
    await waitFor(() => expect(screen.getByTestId("header-mode-toggle").textContent).toContain("Modo Simple"));
    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    const modal = screen.getByTestId("pro-paywall-modal");

    expect(screen.getByTestId("paywall-currency-selector")).toBeTruthy();
    for (const currency of ["USD", "ARS", "BRL", "EUR"]) {
      expect(screen.getByTestId(`paywall-currency-${currency}`)).toBeTruthy();
    }
    expect(screen.getByTestId("paywall-payment-method")).toBeTruthy();
    expect(screen.getByTestId("paywall-plan-grid")).toBeTruthy();
    for (const plan of ["7D", "30D", "365D", "LIFE", "CLUB"]) {
      expect(screen.getByTestId(`paywall-plan-${plan}`)).toBeTruthy();
    }

    // The Creator's real rails are visible and copyable.
    const text = modal.textContent ?? "";
    expect(text).toContain("unfrgvnn.dead");
    expect(text).toContain("ko-fi.com/unfrgvnn");
    expect(screen.getByTestId("paywall-copy-alias-btn")).toBeTruthy();

    // Ko-fi rail exposes the real checkout link.
    fireEvent.click(screen.getByTestId("paywall-method-global_kofi_paypal"));
    expect(screen.getByTestId("paywall-open-kofi-btn").getAttribute("href")).toBe("https://ko-fi.com/unfrgvnn");

    // WhatsApp rail opens the Creator chat with the pre-filled order.
    fireEvent.click(screen.getByTestId("paywall-method-whatsapp_direct"));
    const orderHref = screen.getByTestId("paywall-whatsapp-order-btn").getAttribute("href") ?? "";
    expect(orderHref.startsWith("https://wa.me/5493874661269?text=")).toBe(true);
    expect(decodeURIComponent(orderHref)).toContain("VOS-DEV-");
    expect(screen.getByTestId("paywall-copy-order-btn")).toBeTruthy();
  });

  it("switches the plan grid between USD, ARS, BRL and EUR prices", async () => {
    window.localStorage.setItem("voleyos_force_test_paywall", "1");
    window.localStorage.setItem("volleyos.uiMode", "simple");
    render(<VolleyOSHub locale="es" />);
    await waitFor(() => expect(screen.getByTestId("header-mode-toggle").textContent).toContain("Modo Simple"));
    fireEvent.click(screen.getByTestId("header-mode-toggle"));
    expect(screen.getByTestId("pro-paywall-modal")).toBeTruthy();

    const price = () => screen.getByTestId("paywall-plan-price-30D").textContent ?? "";
    fireEvent.click(screen.getByTestId("paywall-currency-ARS"));
    expect(price()).toBe("$7.500 ARS");
    fireEvent.click(screen.getByTestId("paywall-currency-USD"));
    expect(price()).toBe("$6.99 USD");
    fireEvent.click(screen.getByTestId("paywall-currency-BRL"));
    expect(price()).toBe("R$ 34,90 BRL");
    fireEvent.click(screen.getByTestId("paywall-currency-EUR"));
    expect(price()).toBe("6,50 € EUR");
    // The club pack is five devices for a single price.
    fireEvent.click(screen.getByTestId("paywall-currency-USD"));
    expect(screen.getByTestId("paywall-plan-price-CLUB").textContent).toBe("$99.00 USD");
  });

  it("generates a Club batch where each token only validates its own device", () => {
    const devices = ["VOS-DEV-CLUB01", "VOS-DEV-CLUB02", "VOS-DEV-CLUB03"];
    const batch = generateBatchClubLicenses(devices, "365D");
    expect(batch).toHaveLength(3);
    expect(new Set(batch.map((entry) => entry.token)).size).toBe(3);
    batch.forEach((entry) => {
      expect(entry.token.startsWith("VOS-PRO-CLUB-")).toBe(true);
      expect(verifyProLicenseToken(entry.token, { deviceId: entry.deviceId }).ok).toBe(true);
      for (const other of devices.filter((device) => device !== entry.deviceId)) {
        const check = verifyProLicenseToken(entry.token, { deviceId: other });
        expect(check.ok).toBe(false);
        expect(check.reason).toBe("device_mismatch");
      }
    });
    // The cap holds and a pasted newline list is parsed.
    const capped = generateBatchClubLicenses(devices.join("\n") + "\nVOS-DEV-CLUB04\nVOS-DEV-CLUB05\nVOS-DEV-CLUB06", "30D");
    expect(capped).toHaveLength(5);
  });

  it("summarises an active licence with its remaining days and a locked Simple Mode", () => {
    const locked = getActiveLicenseSummary(proDeviceId(), "es");
    expect(locked.active).toBe(false);
    expect(locked.badgeText).toContain("Modo Simple");

    const token = generateProLicenseToken("PLAYER", 30, { deviceId: proDeviceId() });
    expect(token).toBeTruthy();
    window.localStorage.setItem("voleyos_pro_license", token ?? "");
    const active = getActiveLicenseSummary(proDeviceId(), "es");
    expect(active.active).toBe(true);
    expect(active.tier).toBe("PLAYER");
    expect(active.daysRemaining).toBe(30);
    expect(active.badgeText).toContain("Pro activo");
  });

  it("guides are professional: zero slang phrases in module-guides.ts / modules.ts", () => {
    for (const relative of ["src/lib/module-guides.ts", "src/lib/modules.ts"]) {
      const file = repo("frontend", relative);
      if (!existsSync(file)) continue;
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("cañona");
      expect(text).not.toContain("canhoneira");
      expect(text).not.toContain("paguen las rodillas");
      expect(text).not.toContain("razón agudo");
    }
  });
});

describe("v11.3.2 scoreboard-first court & stadium audio", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as Window & { VoleyNativeTTS?: unknown }).VoleyNativeTTS;
  });

  afterEach(() => {
    cleanup();
    delete (window as Window & { VoleyNativeTTS?: unknown }).VoleyNativeTTS;
  });

  it("surfaces the primary court toolbar and exactly one server badge at 0-0", () => {
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("primary-court-toolbar")).toBeTruthy();
    expect(screen.getByTestId("court-buzzer-btn")).toBeTruthy();
    expect(screen.getByTestId("tts-test-btn")).toBeTruthy();
    const badges = [screen.getByTestId("serve-badge-a"), screen.getByTestId("serve-badge-b")];
    expect(badges.filter((badge) => badge.getAttribute("aria-pressed") === "true")).toHaveLength(1);
  });

  it("boots in clean court mode behind the setup drawer when the test flag is set", () => {
    window.localStorage.setItem("voleyos_test_clean_court", "1");
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    const toggle = screen.getByTestId("clean-court-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const rules = screen.getByTestId("drawer-rules-audio-btn");
    expect(rules.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(rules);
    expect(rules.getAttribute("aria-expanded")).toBe("true");
    const scout = screen.getByTestId("drawer-scout-sheet-btn");
    expect(scout.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(scout);
    expect(scout.getAttribute("aria-expanded")).toBe("true");
  });

  it("prefers window.VoleyNativeTTS for the voice test and fires the FIVB buzzer", async () => {
    const nativeSpeak = vi.fn(() => true);
    (window as Window & { VoleyNativeTTS?: unknown }).VoleyNativeTTS = { speak: nativeSpeak };
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("tts-test-btn"));
    await waitFor(() => expect(nativeSpeak).toHaveBeenCalled());
    expect(screen.getByTestId("tts-test-flash")).toBeTruthy();
    fireEvent.click(screen.getByTestId("court-buzzer-btn"));
    expect(screen.getByTestId("court-buzzer-btn")).toBeTruthy();
  });

  it("ships the demo GIF in docs and keeps the OG card in public", async () => {
    const { statSync } = await import("node:fs");
    const gif = repo("docs", "voleyos-demo.gif");
    const og = repo("frontend", "public", "og-preview.png");
    expect(existsSync(gif)).toBe(true);
    expect(existsSync(og)).toBe(true);
    expect(statSync(gif).size).toBeGreaterThan(1024);
    expect(statSync(og).size).toBeGreaterThan(1024);
  });
});
