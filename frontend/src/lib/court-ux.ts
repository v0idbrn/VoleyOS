export interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

function wakeLockApi(): WakeLockLike | null {
  if (typeof navigator === "undefined") return null;
  const candidate = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
  return candidate ?? null;
}

export async function requestCourtWakeLock(): Promise<WakeLockSentinelLike | null> {
  const api = wakeLockApi();
  if (!api) return null;
  try {
    return await api.request("screen");
  } catch {
    return null;
  }
}

export function triggerCourtHaptics(pattern: number | number[] = 25): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export function announceScoreTTS(text: string, enabled: boolean, locale = "es-ES"): boolean {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
