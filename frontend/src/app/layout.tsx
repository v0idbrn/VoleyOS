import type { Metadata, Viewport } from "next";

import "./globals.css";

import { PwaRegister } from "@/components/PwaRegister";

/** v11.3.1 — the public launch origin (Pages build) owns the share card. */
const SOCIAL_ORIGIN = "https://v0idbrn.github.io/VoleyOS";
const SOCIAL_CARD = `${SOCIAL_ORIGIN}/og-preview.png`;
const SOCIAL_TITLE =
  "VoleyOS v11.3 — Offline Volleyball Scoreboard, 5-1 Tactical Suite & .DVW Scout";
const SOCIAL_DESCRIPTION =
  "61 offline volleyball engines: 2-tap DataVolley .DVW scouting, FIVB 5-1 overlap boards, giant gym scoreboards and tournaments. ES/EN/PT, no telemetry. AGPL-3.0.";

export const metadata: Metadata = {
  metadataBase: new URL(SOCIAL_ORIGIN),
  title: {
    default: "VolleyOS Global — El sistema operativo del vóley",
    template: "%s · VolleyOS",
  },
  description:
    "61 módulos offline-first para vóley: biomecánica, rotaciones, scouting, arbitraje, tribuna, torneos, salas en vivo y streaming OBS. ES/EN/PT, sin telemetría.",
  applicationName: "VolleyOS Global",
  authors: [{ name: "VolleyOS" }],
  keywords: ["vóley", "volleyball", "scouting", "rotaciones", "torneos", "FIVB", "offline"],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "VolleyOS", statusBarStyle: "black-translucent" },
  openGraph: {
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    type: "website",
    locale: "es_ES",
    siteName: "VolleyOS Global",
    url: SOCIAL_ORIGIN,
    images: [{ url: SOCIAL_CARD, width: 1200, height: 630, alt: "VoleyOS v11.3 — offline volleyball scoreboard and 5-1 tactical suite" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: SOCIAL_DESCRIPTION,
    images: [SOCIAL_CARD],
  },
};

export const viewport: Viewport = {
  themeColor: "#070709",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
