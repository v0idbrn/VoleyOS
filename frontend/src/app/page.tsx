import type { Metadata } from "next";

import { VolleyOSHub } from "@/components/VolleyOSHub";

export const metadata: Metadata = {
  alternates: { canonical: "/es", languages: { es: "/es", en: "/en", pt: "/pt" } },
};

export default function HomePage() {
  return <VolleyOSHub locale="es" />;
}
