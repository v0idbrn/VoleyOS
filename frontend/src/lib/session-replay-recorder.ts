/**
 * PostHog client for the opt-in session replay.
 *
 * Imported dynamically by `@/lib/session-replay` only after the user consented,
 * so the SDK never sits in the initial bundle and never runs before opt-in.
 * Docs: https://posthog.com/docs/session-replay
 */

import posthog from "posthog-js";

import type { JourneyEvent, JourneyProperties } from "@/lib/session-replay";

const MAX_PROPERTY_LENGTH = 64;

let recording = false;

/** Start a masked, anonymous recording session against the project token. */
export function startSessionReplayRecorder(token: string, host: string): void {
  if (recording) return;
  posthog.init(token, {
    api_host: host,
    defaults: "latest",
    // Capture the journey we tag explicitly, never the surrounding DOM.
    autocapture: false,
    rageclick: false,
    capture_pageview: true,
    capture_pageleave: false,
    disable_surveys: true,
    disable_cookie: true,
    persistence: "localStorage",
    person_profiles: "never",
    respect_dnt: true,
    // Player names, scores and biomechanics stay out of the replay itself.
    mask_all_text: true,
    mask_all_element_attributes: false,
    session_recording: {
      maskAllInputs: true,
      maskTextClass: "ph-mask",
      blockSelector: "[data-volleyos-private]",
    },
  });
  posthog.startSessionRecording();
  recording = true;
}

/** Stop recording and drop the PostHog identity/queue kept in this browser. */
export function stopSessionReplayRecorder(): void {
  if (!recording) return;
  posthog.stopSessionRecording();
  posthog.opt_out_capturing();
  posthog.reset();
  recording = false;
}

/** Tag the replay with a journey milestone (trimmed, length capped, no PII). */
export function tagJourneyEvent(name: JourneyEvent, properties: JourneyProperties): void {
  if (!recording) return;
  const safe: JourneyProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") {
      safe[key] = value;
      continue;
    }
    const trimmed = value.trim().slice(0, MAX_PROPERTY_LENGTH);
    if (trimmed) safe[key] = trimmed;
  }
  posthog.capture(name, safe);
}
