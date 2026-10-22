import { describe, expect, it, vi } from "vitest";

import { announceScoreTTS, requestCourtWakeLock, triggerCourtHaptics } from "./court-ux";

describe("court-ux", () => {
  it("returns null when the Wake Lock API is missing", async () => {
    await expect(requestCourtWakeLock()).resolves.toBeNull();
  });

  it("returns false when vibration is missing", () => {
    expect(triggerCourtHaptics()).toBe(false);
  });

  it("does not speak when disabled", () => {
    expect(announceScoreTTS("21-19", false)).toBe(false);
  });

  it("speaks when enabled and the API exists", () => {
    const speak = vi.fn();
    class Utterance {
      lang = "";
      rate = 1;
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("window", { speechSynthesis: { cancel: vi.fn(), speak } });
    expect(announceScoreTTS("21-19", true)).toBe(true);
    expect(speak).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
