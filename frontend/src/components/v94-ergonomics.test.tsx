import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreboardStation } from "./stations";
import { MODULE_BY_SLUG } from "@/lib/modules";

function scoreMeta() {
  const value = MODULE_BY_SLUG.get("scoreboard");
  if (!value) throw new Error("missing scoreboard module");
  return value;
}

const noop = (): void => undefined;

interface ErgoBridge {
  triggerHapticPattern?: (patternType: string) => void;
  setKeepScreenAwake?: (keep: boolean) => void;
  setHardwareScoreMode?: (enabled: boolean) => void;
}

type BridgedWindow = Window & { VoleyOSBridge?: ErgoBridge };

function renderScoreboard() {
  return render(<ScoreboardStation meta={scoreMeta()} locale="es" onSave={noop} />);
}

describe("v9.4 physical-court ergonomics", () => {
  let bridge: ErgoBridge;

  beforeEach(() => {
    window.localStorage.clear();
    bridge = {
      triggerHapticPattern: vi.fn(),
      setKeepScreenAwake: vi.fn(),
      setHardwareScoreMode: vi.fn(),
    };
    (window as BridgedWindow).VoleyOSBridge = bridge;
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete (window as BridgedWindow).VoleyOSBridge;
  });

  it("Pocket Lock shields touch scoring behind a 2s hold", () => {
    vi.useFakeTimers();
    renderScoreboard();

    fireEvent.click(screen.getByTestId("pocket-lock-toggle"));
    expect(screen.getByTestId("pocket-shield")).toBeTruthy();
    expect(window.localStorage.getItem("volleyos.pocketLock")).toBe("1");

    // A short tap must NOT unlock the shield.
    fireEvent.pointerDown(screen.getByTestId("pocket-unlock"));
    fireEvent.pointerUp(screen.getByTestId("pocket-unlock"));
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByTestId("pocket-shield")).toBeTruthy();

    // A full 2s hold unlocks.
    fireEvent.pointerDown(screen.getByTestId("pocket-unlock"));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId("pocket-shield")).toBeNull();
    expect(window.localStorage.getItem("volleyos.pocketLock")).toBe("0");
  });

  it("Outdoor Sun Mode flips the card to daylight styling and persists", () => {
    renderScoreboard();
    expect(screen.getByTestId("score-card").className).not.toContain("vos-sun");

    fireEvent.click(screen.getByTestId("sun-mode-toggle"));
    expect(screen.getByTestId("score-card").className).toContain("vos-sun");
    expect(window.localStorage.getItem("volleyos.sunMode")).toBe("1");

    fireEvent.click(screen.getByTestId("sun-mode-toggle"));
    expect(screen.getByTestId("score-card").className).not.toContain("vos-sun");
    expect(window.localStorage.getItem("volleyos.sunMode")).toBe("0");
  });

  it("fires differentiated native haptics per side and keeps the screen awake during a live match", async () => {
    renderScoreboard();

    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    await waitFor(() => expect(bridge.triggerHapticPattern).toHaveBeenCalledWith("home_point"));

    fireEvent.click(screen.getByRole("button", { name: "+ Cóndores [L]" }));
    expect(bridge.triggerHapticPattern).toHaveBeenCalledWith("away_point");

    // The match now has points: FLAG_KEEP_SCREEN_ON must be armed.
    expect(bridge.setKeepScreenAwake).toHaveBeenLastCalledWith(true);
  });

  it("falls back to navigator.vibrate when the native bridge is absent", async () => {
    delete (window as BridgedWindow).VoleyOSBridge;
    renderScoreboard();
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    await waitFor(() => expect(navigator.vibrate).toHaveBeenCalled());
  });

  it("dims the chrome after 30s idle and revives on the next touch (OLED saver)", () => {
    vi.useFakeTimers();
    renderScoreboard();
    expect(screen.getByTestId("score-card").className).not.toContain("vos-oled-dim");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId("score-card").className).toContain("vos-oled-dim");

    fireEvent.pointerDown(window);
    expect(screen.getByTestId("score-card").className).not.toContain("vos-oled-dim");
  });
});
