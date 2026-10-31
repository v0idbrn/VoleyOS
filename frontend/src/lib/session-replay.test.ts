import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: sdk }));

interface RecorderConfig {
  mask_all_text?: boolean;
  person_profiles?: string;
  respect_dnt?: boolean;
  autocapture?: boolean;
  session_recording?: { maskAllInputs?: boolean; blockSelector?: string };
}

function lastInitConfig(): RecorderConfig {
  const call = sdk.init.mock.calls.at(-1);
  return (call?.[1] ?? {}) as unknown as RecorderConfig;
}

describe("PostHog session replay", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    sdk.init.mockClear();
    sdk.capture.mockClear();
    vi.stubEnv("NEXT_PUBLIC_BUILD_TARGET", "cloud");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
    sdk.stopSessionRecording.mockClear();
    sdk.opt_out_capturing.mockClear();
    sdk.reset.mockClear();
  });

  it("is off until a project token ships and the user opts in", async () => {
    const replay = await import("@/lib/session-replay");
    expect(replay.readSessionReplayConsent()).toBe("unset");
    expect(replay.sessionReplayConfigured()).toBe(false);
    expect(replay.sessionReplayAllowed()).toBe(false);
    await replay.startSessionReplay();
    expect(sdk.init).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_projecttoken");
    expect(replay.sessionReplayConfigured()).toBe(true);
    expect(replay.sessionReplayAllowed()).toBe(false);
  });

  it("rejects personal API keys and the fdroid build", async () => {
    const replay = await import("@/lib/session-replay");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phx_personal");
    expect(replay.sessionReplayConfigured()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_projecttoken");
    vi.stubEnv("NEXT_PUBLIC_BUILD_TARGET", "fdroid");
    expect(replay.sessionReplayConfigured()).toBe(false);
    expect(replay.sessionReplayAllowed()).toBe(false);
  });

  it("persists consent and announces it without a token", async () => {
    const replay = await import("@/lib/session-replay");
    const listener = vi.fn();
    window.addEventListener(replay.REPLAY_CONSENT_EVENT, listener);

    replay.setSessionReplayConsent("granted");

    expect(window.localStorage.getItem(replay.REPLAY_CONSENT_KEY)).toBe("granted");
    expect(replay.readSessionReplayConsent()).toBe("granted");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(sdk.init).not.toHaveBeenCalled();
    window.removeEventListener(replay.REPLAY_CONSENT_EVENT, listener);
  });

  it("records masked replays and tags journeys once consented", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_projecttoken");
    window.localStorage.setItem("volleyos.sessionReplayConsent", "granted");
    const replay = await import("@/lib/session-replay");

    await replay.startSessionReplay();

    expect(sdk.init).toHaveBeenCalledTimes(1);
    const config = lastInitConfig();
    expect(config.mask_all_text).toBe(true);
    expect(config.person_profiles).toBe("never");
    expect(config.autocapture).toBe(false);
    expect(config.respect_dnt).toBe(true);
    expect(config.session_recording?.maskAllInputs).toBe(true);
    expect(config.session_recording?.blockSelector).toBe("[data-volleyos-private]");
    expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);

    replay.captureJourneyEvent("module_opened", { module: "scoreboard" });
    expect(sdk.capture).toHaveBeenCalledWith("module_opened", { module: "scoreboard" });

    replay.setSessionReplayConsent("denied");
    expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(sdk.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(sdk.reset).toHaveBeenCalledTimes(1);
    sdk.capture.mockClear();
    replay.captureJourneyEvent("onboarding_completed", { role: "coach" });
    expect(sdk.capture).not.toHaveBeenCalled();
  });
});
