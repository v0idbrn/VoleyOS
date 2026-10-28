import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VolleyOSHub } from "@/components/VolleyOSHub";
import { COPY, isLocale } from "@/lib/i18n";
import { LOCALES } from "@/lib/local-engines";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ locale: string }> {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: COPY[locale].heroTitle,
    description: COPY[locale].heroSubtitle,
    alternates: { canonical: `/${locale}/`, languages: { es: "/es/", en: "/en/", pt: "/pt/" } },
  };
}

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <VolleyOSHub locale={locale} />
  );
}
