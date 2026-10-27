import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BiomechanicsStation, EnginePreviewStation } from "./stations";
import { MODULE_BY_SLUG } from "@/lib/modules";

vi.mock("@/lib/sound-effects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sound-effects")>();
  return {
    ...actual,
    playApproachCadence: vi.fn(() => true),
    playSneakerSqueak: vi.fn(() => true),
  };
});

vi.mock("@/lib/court-audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/court-audio")>();
  return {
    ...actual,
    playWhistle: vi.fn(() => true),
    playArenaCue: vi.fn(() => true),
  };
});

const { playApproachCadence, playSneakerSqueak } = await import("@/lib/sound-effects");
const { playWhistle } = await import("@/lib/court-audio");

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;

const speak = vi.fn();
const cancelSpeech = vi.fn();

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  constructor(text: string) {
    this.text = text;
  }
}

describe("v9.5 athlete stations", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0);
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak, cancel: cancelSpeech },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeUtterance,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs the approach metronome with a 5s hands-free loop", () => {
    vi.useFakeTimers();
    render(<BiomechanicsStation meta={meta("biomechanics")} locale="es" onSave={noop} />);

    fireEvent.click(screen.getByTestId("cadence-2nd"));
    expect(playApproachCadence).toHaveBeenLastCalledWith("2nd");
    expect(screen.getByTestId("cadence-2nd").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("cadence-steps").textContent).toContain("0/340/460 + 700 ms");

    fireEvent.click(screen.getByTestId("cadence-loop"));
    expect(screen.getByTestId("cadence-loop").getAttribute("aria-pressed")).toBe("true");
    expect(playApproachCadence).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(playApproachCadence).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("cadence-stop"));
    expect(screen.queryByTestId("cadence-steps")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(playApproachCadence).toHaveBeenCalledTimes(2);
  });

  it("fires voice, whistle and sneaker cues in the blind court mode", async () => {
    render(<EnginePreviewStation meta={meta("peripheral-reflex")} locale="es" onSave={noop} />);

    const toggle = screen.getByTestId("blind-coach-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(screen.getByTestId("blind-coach-cue").textContent).toBe("¡Toque corto en 2!"));
    expect(speak).toHaveBeenCalledTimes(1);
    expect((speak.mock.calls[0]?.[0] as FakeUtterance).lang).toBe("es-AR");
    expect(playSneakerSqueak).toHaveBeenCalled();
    expect(playWhistle).toHaveBeenCalledWith("short");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(cancelSpeech).toHaveBeenCalled();
  });

  it("speaks the callouts in the station locale", async () => {
    render(<EnginePreviewStation meta={meta("peripheral-reflex")} locale="en" onSave={noop} />);
    fireEvent.click(screen.getByTestId("blind-coach-toggle"));
    await waitFor(() => expect(screen.getByTestId("blind-coach-cue").textContent).toBe("Short tip in 2!"));
    expect((speak.mock.calls[0]?.[0] as FakeUtterance).lang).toBe("en-US");
  });
});
