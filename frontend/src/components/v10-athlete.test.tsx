import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnginePreviewStation, ServeRadarStation, VideoTelestratorStation } from "./stations";
import { MODULE_BY_SLUG } from "@/lib/modules";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;

describe("v10.0.0 live ball radar (km/h)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("measures a gate pass end-to-end and tiers the best shot", () => {
    render(<ServeRadarStation meta={meta("serve-radar")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("radar-gate-9m")).toBeInTheDocument();
    expect(screen.queryByTestId("radar-tier")).toBeNull();

    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    fireEvent.click(screen.getByTestId("radar-arm"));
    now.mockReturnValue(1500);
    fireEvent.click(screen.getByTestId("radar-arm"));

    // 9 m in 500 ms = 64.8 km/h → base tier.
    const tier = screen.getByTestId("radar-tier").textContent ?? "";
    expect(tier).toContain("64.8");
    expect(tier).toContain("BASE");
    // The last-shot metric and the tier badge both show the speed.
    expect(screen.getAllByText("64.8").length).toBeGreaterThanOrEqual(2);
  });

  it("ignores fat-finger taps under 30 ms and undoes a shot", () => {
    render(<ServeRadarStation meta={meta("serve-radar")} locale="es" onSave={noop} />);
    const now = vi.spyOn(performance, "now").mockReturnValue(500);
    fireEvent.click(screen.getByTestId("radar-arm"));
    now.mockReturnValue(510);
    fireEvent.click(screen.getByTestId("radar-arm"));
    expect(screen.queryByTestId("radar-tier")).toBeNull();

    now.mockReturnValue(1000);
    fireEvent.click(screen.getByTestId("radar-arm"));
    now.mockReturnValue(1500);
    fireEvent.click(screen.getByTestId("radar-arm"));
    expect(screen.getByTestId("radar-tier")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("radar-undo"));
    expect(screen.queryByTestId("radar-tier")).toBeNull();
  });
});

describe("v10.0.0 reaction-time drill", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    vi.spyOn(Math, "random").mockReturnValue(0); // hide-delay = 800ms
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("voids a false start tapped before the stimulus", () => {
    render(<EnginePreviewStation meta={meta("peripheral-reflex")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("reaction-pad"));
    expect(screen.getByTestId("reaction-pad").textContent).toContain("Esperá el estímulo");
    fireEvent.click(screen.getByTestId("reaction-pad")); // jumped the gun
    expect(screen.getByTestId("reaction-status").textContent).toContain("falsa salida");
    expect(screen.queryByTestId("reaction-summary")).toBeNull();
  });

  it("records a valid reaction and reports mean/best through scoreReflex", () => {
    render(<EnginePreviewStation meta={meta("peripheral-reflex")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("reaction-pad"));
    act(() => {
      vi.advanceTimersByTime(800); // stimulus on
    });
    expect(screen.getByTestId("reaction-pad").textContent).toContain("¡TOCÁ!");
    act(() => {
      vi.advanceTimersByTime(250); // athlete reacts
    });
    fireEvent.click(screen.getByTestId("reaction-pad"));
    expect(screen.getByTestId("reaction-status").textContent).toContain("250 ms");
    const summary = screen.getByTestId("reaction-summary").textContent ?? "";
    expect(summary).toContain("250");
    expect(summary).toContain("Promedio");
    expect(summary).toContain("1 ×");
  });

  it("resets the drill back to a clean pad", () => {
    render(<EnginePreviewStation meta={meta("peripheral-reflex")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("reaction-pad"));
    fireEvent.click(screen.getByTestId("reaction-pad"));
    fireEvent.click(screen.getByTestId("reaction-reset"));
    expect(screen.getByTestId("reaction-pad").textContent).toContain("Tocá para arrancar");
    expect(screen.queryByTestId("reaction-summary")).toBeNull();
  });
});

describe("v10.0.0 split-screen VideoTelestrator 2.0", () => {
  const hadCreate = typeof (URL as unknown as Record<string, unknown>).createObjectURL === "function";
  const hadRevoke = typeof (URL as unknown as Record<string, unknown>).revokeObjectURL === "function";
  const origSetCapture = Element.prototype.setPointerCapture;
  const origReleaseCapture = Element.prototype.releasePointerCapture;
  let playSpy: ReturnType<typeof vi.spyOn>;
  let pauseSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    (URL as unknown as Record<string, unknown>).createObjectURL = () => "blob:vos-test";
    (URL as unknown as Record<string, unknown>).revokeObjectURL = () => undefined;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;
    playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (hadCreate) (URL as unknown as Record<string, unknown>).createObjectURL = () => "blob:vos-test";
    else Reflect.deleteProperty(URL, "createObjectURL");
    if (hadRevoke) (URL as unknown as Record<string, unknown>).revokeObjectURL = () => undefined;
    else Reflect.deleteProperty(URL, "revokeObjectURL");
    Element.prototype.setPointerCapture = origSetCapture;
    Element.prototype.releasePointerCapture = origReleaseCapture;
  });

  function loadVideoB(): void {
    const file = new File(["x"], "b.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByTestId("video-b-input"), { target: { files: [file] } });
  }

  function loadVideoA(): void {
    const file = new File(["x"], "a.mp4", { type: "video/mp4" });
    fireEvent.change(screen.getByLabelText("Video local"), { target: { files: [file] } });
  }

  it("opens the second pane, loads video B and syncs playback", () => {
    render(<VideoTelestratorStation meta={meta("video-telestrator")} locale="es" onSave={noop} />);
    expect(screen.queryByTestId("pane-b")).toBeNull();
    expect(screen.queryByTestId("video-b-input")).toBeNull();

    fireEvent.click(screen.getByTestId("split-toggle"));
    expect(screen.getByTestId("pane-b")).toBeInTheDocument();
    expect(screen.getByTestId("video-b-input")).toBeInTheDocument();
    expect(screen.getByText(/Cargá el video B/)).toBeInTheDocument();

    loadVideoA();
    loadVideoB();
    const sync = screen.getByTestId("split-sync");
    fireEvent.click(sync);
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(pauseSpy).not.toHaveBeenCalled();
  });

  it("keeps per-pane strokes independent and clears them together", () => {
    render(<VideoTelestratorStation meta={meta("video-telestrator")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("split-toggle"));
    expect(screen.getByText("0 trazos")).toBeInTheDocument();

    const canvas = screen.getByTestId("pane-b-canvas");
    fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(screen.getByText("1 trazos")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Borrar trazos/ }));
    expect(screen.getByText("0 trazos")).toBeInTheDocument();
  });

  it("closes pane B when the split is toggled off", async () => {
    render(<VideoTelestratorStation meta={meta("video-telestrator")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("split-toggle"));
    loadVideoB();
    expect(screen.getByTestId("pane-b")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("split-toggle"));
    await waitFor(() => {
      expect(screen.queryByTestId("pane-b")).toBeNull();
      expect(screen.queryByTestId("video-b-input")).toBeNull();
    });
  });
});
