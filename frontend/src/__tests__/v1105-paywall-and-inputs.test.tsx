import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GymScreenModule } from "@/components/GymScreenModule";
import { AcwrStation, MatchupMatrixStation } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
import { matchupMatrix } from "@/lib/local-engines";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { proDeviceId } from "@/lib/pro-entitlement";
import { generateProLicenseToken } from "@/lib/security-hardening";

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
    fireEvent.click(screen.getByText("↺ Reset"));
    expect(screen.getByText("00:00")).toBeTruthy();
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
