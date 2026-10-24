import type { Locale } from "@/lib/local-engines";

import { t } from "@/lib/i18n";

interface VoleyOSLogoProps {
  locale?: Locale;
  size?: number;
}

/**
 * Inline SVG VolleyOS mark: obsidian court, crimson net line and the amber
 * volt ball. No network assets, so it renders identically offline in the APK.
 */
export function VoleyOSLogo({ locale = "es", size = 40 }: VoleyOSLogoProps) {
  const label = t(locale, "VolleyOS", "VolleyOS", "VolleyOS");
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#0E1015" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="2"
      />
      {/* court floor lines */}
      <path
        d="M12 46h40M32 24v22"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* net */}
      <path d="M12 30h40" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
      {/* volt ball */}
      <circle cx="44" cy="18" r="7" fill="#eab308" />
      <path
        d="M38 15.5c3.5 1 7 4 8.5 7.5M41 12c2 3 2.5 7 2 10.5"
        stroke="#070709"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
