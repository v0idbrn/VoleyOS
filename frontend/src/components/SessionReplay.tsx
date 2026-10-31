"use client";

import { useEffect } from "react";

import {
  REPLAY_CONSENT_EVENT,
  readSessionReplayConsent,
  startSessionReplay,
  stopSessionReplay,
} from "@/lib/session-replay";

/**
 * Mounts the PostHog recorder only while the user has opted in.
 * Renders nothing: turning replays off keeps the shell byte-identical.
 */
export function SessionReplay() {
  useEffect(() => {
    const sync = (): void => {
      if (readSessionReplayConsent() === "granted") void startSessionReplay();
      else stopSessionReplay();
    };
    sync();
    window.addEventListener(REPLAY_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REPLAY_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
      stopSessionReplay();
    };
  }, []);

  return null;
}
