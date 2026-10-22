import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LOCALE_NAMES, isLocale, t } from "@/lib/i18n";
import { LOCALES } from "@/lib/local-engines";
import {
  SEO_ITEMS,
  SEO_SECTIONS,
  SECTION_INTROS,
  SECTION_LABELS,
  isSeoSection,
  type SeoSection,
} from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ locale: string; section: string }> {
  return LOCALES.flatMap((locale) => SEO_SECTIONS.map((section) => ({ locale, section })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isSeoSection(section)) return {};
  const title = SECTION_LABELS[section][locale];
  return {
    title,
    description: SECTION_INTROS[section][locale],
    alternates: {
      canonical: `/${locale}/${section}`,
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}/${section}`])),
    },
  };
}

export default async function SectionPage({ params }: { params: Promise<{ locale: string; section: string }> }) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isSeoSection(section)) notFound();
  const items = SEO_ITEMS[section];

  return (
    <main lang={locale} className="mx-auto max-w-5xl px-4 py-10">
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        <a className="hover:text-volt" href={`/${locale}`}>← VolleyOS</a>
        <span className="ml-auto flex gap-1">
          {LOCALES.map((code) => (
            <a
              key={code}
              href={`/${code}/${section}`}
              aria-current={code === locale ? "page" : undefined}
              className={`rounded px-2 py-1 ${code === locale ? "bg-volt text-obsidian" : "hover:text-white"}`}
            >
              {LOCALE_NAMES[code]}
            </a>
          ))}
        </span>
      </nav>

      <header className="mt-6 max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">
          {t(locale, "Base de conocimiento", "Knowledge base", "Base de conhecimento")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{SECTION_LABELS[section][locale]}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">{SECTION_INTROS[section][locale]}</p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.slug}
            href={`/${locale}/${section}/${item.slug}`}
            className="group rounded-2xl border border-white/10 bg-panel/70 p-4 transition hover:border-volt/60"
          >
            <p className="text-2xl" aria-hidden>{item.icon}</p>
            <h2 className="mt-2 text-sm font-black text-white group-hover:text-volt">{item.title[locale]}</h2>
            <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-white/55">{item.description[locale]}</p>
            {item.facts[locale][0] ? <p className="mt-2 text-[10px] text-white/35">{item.facts[locale][0]}</p> : null}
          </a>
        ))}
      </div>

      <section className="mt-10 border-t border-white/10 pt-5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          {t(locale, "Otras secciones", "Other sections", "Outras seções")}
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {SEO_SECTIONS.filter((value) => value !== section).map((value) => (
            <a key={value} href={`/${locale}/${value}`} className="rounded-lg border border-white/10 px-2 py-1 text-white/60 hover:border-volt hover:text-volt">
              {SECTION_LABELS[value as SeoSection][locale]}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
