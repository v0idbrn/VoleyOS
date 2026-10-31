/**
 * PostHog Session Replay — opt-in, masked, cloud build only.
 *
 * VolleyOS promises zero telemetry in its free build, so nothing loads or ships
 * until the user turns replays on in Settings and a project token is present in
 * the build. Every input, text node and vault block is masked before it leaves
 * the device. Revoking consent stops the recorder and forgets the session
 * identity.
 *
 * Docs: https://posthog.com/docs/session-replay
 */

import { buildTarget } from "@/lib/local-engines";

export const REPLAY_CONSENT_KEY = "volleyos.sessionReplayConsent";
export const REPLAY_CONSENT_EVENT = "volleyos:sessionReplayConsent";

const DEFAULT_HOST = "https://us.i.posthog.com";
const TOKEN_PATTERN = /^phc_[A-Za-z0-9]+$/;

export type ReplayConsent = "granted" | "denied" | "unset";

/** Journey milestones we attach to a replay; no free text, no player data. */
export type JourneyEvent = "module_opened" | "onboarding_completed";
export type JourneyProperties = Record<string, string | number | boolean>;

type Recorder = typeof import("@/lib/session-replay-recorder");

interface PrivacySignals {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}

let recorder: Recorder | null = null;
let starting: Promise<void> | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function projectToken(): string {
  const token = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
  return TOKEN_PATTERN.test(token) ? token : "";
}

function apiHost(): string {
  const configured = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "").trim();
  if (!configured.startsWith("https://")) return DEFAULT_HOST;
  return configured.replace(/\/+$/, "");
}

/** True only when this build ships a PostHog project token and is the cloud target. */
export function sessionReplayConfigured(): boolean {
  return buildTarget() === "cloud" && projectToken().length > 0;
}

export function readSessionReplayConsent(): ReplayConsent {
  const raw = storage()?.getItem(REPLAY_CONSENT_KEY);
  return raw === "granted" || raw === "denied" ? raw : "unset";
}

/** Do Not Track / Global Privacy Control win over a stored consent value. */
function privacySignalSet(): boolean {
  if (typeof navigator === "undefined") return false;
  const signals = navigator as Navigator & PrivacySignals;
  return signals.doNotTrack === "1" || signals.globalPrivacyControl === true;
}

/** The single gate every capture path checks. */
export function sessionReplayAllowed(): boolean {
  return sessionReplayConfigured() && readSessionReplayConsent() === "granted" && !privacySignalSet();
}

/**
 * Load the recorder on demand and start recording. No-op unless consent was
 * granted; safe to call repeatedly (the client is a singleton).
 */
export async function startSessionReplay(): Promise<void> {
  if (recorder || starting || !sessionReplayAllowed()) return;

  starting = (async () => {
    try {
      // Loaded on demand: nothing from PostHog hits the network before consent.
      const loaded = await import("@/lib/session-replay-recorder");
      // Consent can be withdrawn or the browser can change signal mid-load.
      if (!sessionReplayAllowed()) return;
      loaded.startSessionReplayRecorder(projectToken(), apiHost());
      recorder = loaded;
    } catch {
      // Offline, blocked by an extension or a bad token: stay silent and untracked.
      recorder = null;
    } finally {
      starting = null;
    }
  })();

  await starting;
}

/** Stop recording and drop the PostHog identity/queue kept in this browser. */
export function stopSessionReplay(): void {
  const active = recorder;
  if (!active) return;
  active.stopSessionReplayRecorder();
  recorder = null;
}

/** Persist the user's choice, notify listeners and apply it immediately. */
export function setSessionReplayConsent(consent: Exclude<ReplayConsent, "unset">): void {
  storage()?.setItem(REPLAY_CONSENT_KEY, consent);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REPLAY_CONSENT_EVENT, { detail: { consent } }));
  }
  if (consent === "granted") void startSessionReplay();
  else stopSessionReplay();
}

/**
 * Tag the replay with a journey milestone. No-op while no recorder is running;
 * the recorder trims and length-caps properties before they are sent.
 */
export function captureJourneyEvent(name: JourneyEvent, properties: JourneyProperties = {}): void {
  recorder?.tagJourneyEvent(name, properties);
}
