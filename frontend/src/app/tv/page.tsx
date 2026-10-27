import type { Metadata } from "next";

import { OverlayTv } from "@/components/OverlayTv";

export const metadata: Metadata = {
  title: "VoleyOS TV — Overlay de Transmisión",
  description: "Overlay de marcador estilo VNL/ESPN para OBS, con modo chroma, sin telemetría.",
  robots: { index: false, follow: false },
};

export default function TvPage() {
  return <OverlayTv />;
}
