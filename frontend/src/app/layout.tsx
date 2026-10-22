import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://volleyos.app"),
  title: {
    default: "VolleyOS Global — El sistema operativo del vóley",
    template: "%s · VolleyOS",
  },
  description:
    "12 módulos offline-first para vóley: biomecánica, rotaciones, scouting, torneos, VAR, playa y streaming OBS. ES/EN/PT, sin telemetría.",
  applicationName: "VolleyOS Global",
  authors: [{ name: "VolleyOS" }],
  keywords: ["vóley", "volleyball", "scouting", "rotaciones", "torneos", "FIVB", "offline"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "VolleyOS Global",
    description: "12 módulos de vóley en una app offline-first. Sin telemetría.",
    type: "website",
    locale: "es_ES",
    siteName: "VolleyOS Global",
  },
  twitter: { card: "summary", title: "VolleyOS Global", description: "12 módulos de vóley, offline-first." },
};

export const viewport: Viewport = {
  themeColor: "#070709",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
