import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SeoArticle } from "@/components/SeoArticle";
import { isLocale } from "@/lib/i18n";
import { LOCALES } from "@/lib/local-engines";
import { SEO_ITEMS, SEO_SECTIONS, getSeoItem, isSeoSection } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ locale: string; section: string; slug: string }> {
  return LOCALES.flatMap((locale) =>
    SEO_SECTIONS.flatMap((section) => SEO_ITEMS[section].map((item) => ({ locale, section, slug: item.slug }))),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; section: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, section, slug } = await params;
  if (!isLocale(locale) || !isSeoSection(section)) return {};
  const item = getSeoItem(section, slug);
  if (!item) return {};
  return {
    title: item.title[locale],
    description: item.description[locale],
    alternates: {
      canonical: `/${locale}/${section}/${slug}/`,
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}/${section}/${slug}/`])),
    },
    openGraph: { title: item.title[locale], description: item.description[locale], type: "article", locale },
  };
}

export default async function SeoDetailPage({
  params,
}: {
  params: Promise<{ locale: string; section: string; slug: string }>;
}) {
  const { locale, section, slug } = await params;
  if (!isLocale(locale) || !isSeoSection(section)) notFound();
  const item = getSeoItem(section, slug);
  if (!item) notFound();
  return <SeoArticle locale={locale} section={section} item={item} />;
}
