import { getDeviceInstallId } from "./creator-unlock";
import { verifyProLicenseToken } from "./security-hardening";

/**
 * v11.0.5 — the single source of truth for 🧠 Modo Pro entitlement.
 * A user is entitled only via the private Creator APK bridge, a valid
 * device-bound VOS-PRO license, or automated tests (unless the paywall
 * itself is under test via `voleyos_force_test_paywall`).
 */
export const PRO_LICENSE_KEY = "voleyos_pro_license";
export const PRO_PAYWALL_TEST_KEY = "voleyos_force_test_paywall";

/** Display/verification device id in the `VOS-DEV-…` format shown to the user. */
export function proDeviceId(): string {
  return `VOS-DEV-${getDeviceInstallId()}`;
}

type CreatorBridge = { isCreatorUnlocked?: () => boolean };

function creatorBridge(): CreatorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { VosleyOSBridge?: CreatorBridge; VoleyOSBridge?: CreatorBridge };
  return w.VosleyOSBridge ?? w.VoleyOSBridge;
}

export function isUserProEntitled(): boolean {
  if (typeof window === "undefined") return true;
  if (creatorBridge()?.isCreatorUnlocked?.() === true) return true;
  const token = window.localStorage.getItem(PRO_LICENSE_KEY);
  if (token) {
    try {
      if (verifyProLicenseToken(token, { deviceId: proDeviceId() }).ok) return true;
    } catch {
      /* malformed token: treat as unentitled */
    }
  }
  const isTest =
    typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
  if (isTest && window.localStorage.getItem(PRO_PAYWALL_TEST_KEY) !== "1") return true;
  return false;
}
