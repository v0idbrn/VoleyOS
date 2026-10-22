import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LOCALE_NAMES, isLocale } from "@/lib/i18n";
import { LEGAL, LEGAL_DOCS, isLegalDoc } from "@/lib/legal";
import { LOCALES } from "@/lib/local-engines";

export const dynamicParams = false;

interface RouteParams {
  locale: string;
  doc: string;
}

export function generateStaticParams(): RouteParams[] {
  return LOCALES.flatMap((locale) => LEGAL_DOCS.map((doc) => ({ locale, doc })));
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isLegalDoc(doc)) return {};
  const page = LEGAL[doc][locale];
  return {
    title: page.title,
    description: page.intro,
    alternates: {
      canonical: `/${locale}/legal/${doc}/`,
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}/legal/${doc}/`])),
    },
    robots: doc === "trademarks" ? { index: true, follow: true } : undefined,
  };
}

export default async function LegalPage({ params }: { params: Promise<RouteParams> }) {
  const { locale, doc } = await params;
  if (!isLocale(locale) || !isLegalDoc(doc)) notFound();
  const content = LEGAL[doc][locale];

  return (
    <main lang={locale} className="mx-auto max-w-3xl px-4 py-12">
      <nav className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        <a className="hover:text-volt" href={`/${locale}`}>← VolleyOS</a>
        <span className="text-white/20">/</span>
        <span className="text-volt">Legal</span>
        <span className="ml-auto flex gap-1">
          {LOCALES.map((code) => (
            <a
              key={code}
              href={`/${code}/legal/${doc}`}
              aria-current={code === locale ? "page" : undefined}
              className={`rounded px-2 py-1 ${code === locale ? "bg-volt text-obsidian" : "hover:text-white"}`}
            >
              {LOCALE_NAMES[code]}
            </a>
          ))}
        </span>
      </nav>

      <header className="mt-8 border-b border-white/10 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">Documento legal</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{content.title}</h1>
        <p className="mt-2 text-xs text-white/40">Actualizado: {content.updated} · AGPL-3.0-or-later</p>
        <p className="mt-4 text-sm leading-relaxed text-white/70">{content.intro}</p>
      </header>

      <div className="mt-6 space-y-6">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm font-black uppercase tracking-wider text-volt">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-white/70">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-10 border-t border-white/10 pt-4 text-[11px] text-white/40">
        <p>VolleyOS Global · AGPL-3.0-or-later · cloud@volleyos.app</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {LEGAL_DOCS.map((slug) => (
            <a key={slug} href={`/${locale}/legal/${slug}`} className={`hover:text-volt ${slug === doc ? "text-white" : ""}`}>
              {LEGAL[slug][locale].title}
            </a>
          ))}
        </div>
      </footer>
    </main>
  );
}
