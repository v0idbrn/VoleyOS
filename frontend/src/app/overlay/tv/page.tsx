import type { Metadata } from "next";

import { OverlayTv } from "@/components/OverlayTv";

export const metadata: Metadata = {
  title: "Overlay TV",
  description: "Marcador transparente para OBS, sin telemetría.",
  robots: { index: false, follow: false },
};

export default function OverlayTvPage() {
  return <OverlayTv />;
}
