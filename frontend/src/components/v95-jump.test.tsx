import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoTelestratorStation } from "./stations";
import { ATHLETE_RECORDS_KEY, loadAthleteRecords } from "@/lib/athlete-records";
import { MODULE_BY_SLUG } from "@/lib/modules";

const meta = MODULE_BY_SLUG.get("video-telestrator");
if (!meta) throw new Error("video-telestrator module missing");

const noop = (): void => undefined;

describe("v9.5 flight-time jump lab", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const url = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    url.createObjectURL = vi.fn(() => "blob:jump");
    url.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    const url = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    delete url.createObjectURL;
    delete url.revokeObjectURL;
    vi.restoreAllMocks();
  });

  it("captures t1/t2 from the video, reports the flight and persists the record", () => {
    render(<VideoTelestratorStation meta={meta} locale="es" onSave={noop} />);
    expect(screen.queryByTestId("flight-report")).toBeNull();

    const input = screen.getByLabelText("Video local");
    const file = new File(["clip"], "jump.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [file] } });
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    if (!video) return;

    Object.defineProperty(video, "currentTime", { value: 0.18, configurable: true, writable: true });
    fireEvent.click(screen.getByTestId("mark-takeoff"));
    expect(screen.getByText("t₁ 0.18s")).toBeTruthy();

    video.currentTime = 0.62;
    fireEvent.click(screen.getByTestId("mark-landing"));

    const report = screen.getByTestId("flight-report");
    expect(report.textContent).toContain("Δt 0.44");
    expect(report.textContent).toContain("23.7 cm");
    expect(report.textContent).toContain("2.16 m/s");
    expect(report.textContent).toContain("Aún calentando");

    fireEvent.click(screen.getByTestId("save-jump"));
    const saved = loadAthleteRecords();
    expect(saved).toHaveLength(1);
    expect(saved[0]?.heightCm).toBe(23.74);
    expect(saved[0]?.flightMs).toBe(440);
    expect(window.localStorage.getItem(ATHLETE_RECORDS_KEY)).toContain("23.74");
    expect(screen.getByTestId("jump-sparkline")).toBeTruthy();
    expect(screen.getByText(/Récord guardado en tu perfil/)).toBeTruthy();
  });

  it("shows the recorded history from previous sessions on mount", () => {
    window.localStorage.setItem(
      ATHLETE_RECORDS_KEY,
      JSON.stringify([
        { date: "2026-10-01", flightMs: 400, heightCm: 40 },
        { date: "2026-10-02", flightMs: 500, heightCm: 55 },
      ]),
    );
    render(<VideoTelestratorStation meta={meta} locale="es" onSave={noop} />);
    const input = screen.getByLabelText("Video local");
    fireEvent.change(input, { target: { files: [new File(["c"], "v.mp4", { type: "video/mp4" })] } });
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    if (!video) return;
    Object.defineProperty(video, "currentTime", { value: 0.5, configurable: true, writable: true });
    fireEvent.click(screen.getByTestId("mark-takeoff"));
    video.currentTime = 1.05;
    fireEvent.click(screen.getByTestId("mark-landing"));
    fireEvent.click(screen.getByTestId("save-jump"));
    expect(screen.getByTestId("jump-sparkline")).toBeTruthy();
    expect(screen.getByText(/3 récords guardados/)).toBeTruthy();
    expect(loadAthleteRecords()).toHaveLength(3);
  });

  it("toggles the draggable Hora 11 vs 12 protractor with both zones", () => {
    render(<VideoTelestratorStation meta={meta} locale="es" onSave={noop} />);
    const toggle = screen.getByTestId("contact-clock-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByTestId("contact-clock")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const clock = screen.getByTestId("contact-clock");
    expect(clock).toBeTruthy();
    // Green 10:30–11:15 optimal power zone vs red 12:00–01:00 impingement zone.
    expect(screen.getByTestId("zone-optimal").getAttribute("stroke")).toBe("#22c55e");
    expect(screen.getByTestId("zone-impingement").getAttribute("stroke")).toBe("#ef4444");
    const dial = clock.querySelector("svg");
    expect(dial?.getAttribute("aria-label")).toContain("Hora 11 vs 12");
    expect(clock.textContent).toContain("10:30");
    expect(clock.textContent).toContain("12:00");

    fireEvent.click(toggle);
    expect(screen.queryByTestId("contact-clock")).toBeNull();
  });

  it("resets the calculator with the station example", () => {
    render(<VideoTelestratorStation meta={meta} locale="es" onSave={noop} />);
    const input = screen.getByLabelText("Video local");
    fireEvent.change(input, { target: { files: [new File(["c"], "v.mp4", { type: "video/mp4" })] } });
    const video = document.querySelector("video");
    expect(video).toBeTruthy();
    if (!video) return;
    Object.defineProperty(video, "currentTime", { value: 0.1, configurable: true, writable: true });
    fireEvent.click(screen.getByTestId("mark-takeoff"));
    video.currentTime = 0.9;
    fireEvent.click(screen.getByTestId("mark-landing"));
    expect(screen.getByTestId("flight-report")).toBeTruthy();
    fireEvent.click(screen.getByTestId("contact-clock-toggle"));

    fireEvent.click(screen.getByRole("button", { name: /Cargar ejemplo/ }));
    expect(screen.queryByTestId("flight-report")).toBeNull();
    expect(screen.queryByTestId("contact-clock")).toBeNull();
  });
});
