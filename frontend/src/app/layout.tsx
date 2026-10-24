import type { Metadata, Viewport } from "next";

import "./globals.css";

import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  metadataBase: new URL("https://volleyos.app"),
  title: {
    default: "VolleyOS Global — El sistema operativo del vóley",
    template: "%s · VolleyOS",
  },
  description:
    "60 módulos offline-first para vóley: biomecánica, rotaciones, scouting, arbitraje, tribuna, torneos, salas en vivo y streaming OBS. ES/EN/PT, sin telemetría.",
  applicationName: "VolleyOS Global",
  authors: [{ name: "VolleyOS" }],
  keywords: ["vóley", "volleyball", "scouting", "rotaciones", "torneos", "FIVB", "offline"],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "VolleyOS", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "VolleyOS Global",
    description: "60 módulos de vóley en una app offline-first. Sin telemetría.",
    type: "website",
    locale: "es_ES",
    siteName: "VolleyOS Global",
  },
  twitter: { card: "summary", title: "VolleyOS Global", description: "60 módulos de vóley, offline-first." },
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
