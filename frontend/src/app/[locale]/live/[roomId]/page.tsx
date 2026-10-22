import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveRoomView } from "@/components/LiveRoomView";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live room",
  robots: { index: false, follow: false },
};

export default async function LiveRoomPage({
  params,
}: {
  params: Promise<{ locale: string; roomId: string }>;
}) {
  const { locale, roomId } = await params;
  if (!isLocale(locale)) notFound();
  return <LiveRoomView roomId={roomId} locale={locale} />;
}
