import { describe, expect, it, vi } from "vitest";

import "@/lib/sound-effects";

type StubWindow = Window & { AudioContext?: unknown };

describe("v9.4 audio auto-resume", () => {
  it("revives the shared AudioContext on pointerdown and keydown", () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    class StubAudioContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume = resume;
    }
    (window as StubWindow).AudioContext = StubAudioContext;
    try {
      window.dispatchEvent(new Event("pointerdown"));
      expect(resume).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event("keydown"));
      expect(resume.mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      delete (window as StubWindow).AudioContext;
    }
  });

  it("installAudioAutoResume is idempotent", async () => {
    const { installAudioAutoResume } = await import("@/lib/sound-effects");
    // Already installed at module load: a second call must be a no-op.
    expect(installAudioAutoResume()).toBe(false);
  });
});
