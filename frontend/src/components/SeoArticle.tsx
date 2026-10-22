import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";
import {
  SEO_ITEMS,
  SECTION_INTROS,
  SECTION_LABELS,
  SHARED_FAQ,
  SHARED_STEPS,
  type SeoItem,
  type SeoSection,
} from "@/lib/seo";

export function SeoArticle({ locale, section, item }: { locale: Locale; section: SeoSection; item: SeoItem }) {
  const related = SEO_ITEMS[section].filter((entry) => entry.slug !== item.slug).slice(0, 4);
  const canonical = `/${locale}/${section}/${item.slug}/`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: item.title[locale],
        description: item.description[locale],
        inLanguage: locale,
        author: { "@type": "Organization", name: "VolleyOS" },
        mainEntityOfPage: canonical,
        isAccessibleForFree: true,
      },
      {
        "@type": "FAQPage",
        mainEntity: SHARED_FAQ.map((faq) => ({
          "@type": "Question",
          name: faq.question[locale],
          acceptedAnswer: { "@type": "Answer", text: faq.answer[locale] },
        })),
      },
    ],
  };

  return (
    <main lang={locale} className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        <a className="hover:text-volt" href={`/${locale}`}>VolleyOS</a>
        <span aria-hidden>›</span>
        <a className="hover:text-volt" href={`/${locale}/${section}`}>{SECTION_LABELS[section][locale]}</a>
        <span aria-hidden>›</span>
        <span className="truncate text-white/70">{item.title[locale]}</span>
      </nav>

      <header className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-crimson">
          {t(locale, "Guía técnica", "Technical guide", "Guia técnica")}
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight md:text-4xl">
          <span aria-hidden className="mr-2">{item.icon}</span>
          {item.title[locale]}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/70">{item.description[locale]}</p>
      </header>

      <section className="mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-volt">
          {t(locale, "Datos clave", "Key facts", "Dados-chave")}
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {item.facts[locale].map((fact) => (
            <li key={fact} className="rounded-xl border border-white/10 bg-panel/70 p-3 text-sm leading-relaxed text-white/75">
              {fact}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-volt">
          {t(locale, "Cómo usarlo", "How to use it", "Como usar")}
        </h2>
        <ol className="mt-3 space-y-2">
          {SHARED_STEPS[locale].map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-white/75">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-crimson text-[11px] font-black text-white">{index + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <a
          className="mt-4 inline-block rounded-xl bg-crimson px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-imperial"
          href={`/${locale}${item.station ? `#station-${item.station}` : ""}`}
        >
          {item.station
            ? t(locale, "Abrir estación", "Open station", "Abrir estação")
            : t(locale, "Abrir Command Center", "Open Command Center", "Abrir Command Center")}
        </a>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-volt">
          {t(locale, "Preguntas frecuentes", "Frequently asked", "Perguntas frequentes")}
        </h2>
        <div className="mt-3 space-y-2">
          {SHARED_FAQ.map((faq) => (
            <details key={faq.question[locale]} className="rounded-xl border border-white/10 bg-obsidian/60 p-3">
              <summary className="cursor-pointer text-sm font-bold text-white">{faq.question[locale]}</summary>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{faq.answer[locale]}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-volt">
          {t(locale, "Seguí leyendo", "Keep reading", "Continue lendo")}
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {related.map((entry) => (
            <a
              key={entry.slug}
              href={`/${locale}/${section}/${entry.slug}`}
              className="rounded-xl border border-white/10 bg-panel/60 p-3 transition hover:border-volt/60"
            >
              <p className="text-sm font-bold text-white">{entry.icon} {entry.title[locale]}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-white/50">{entry.description[locale]}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-white/10 pt-4 text-[11px] text-white/40">
        <p>{SECTION_INTROS[section][locale]}</p>
        <p className="mt-2">
          <a className="hover:text-volt" href={`/${locale}/${section}`}>
            ← {SECTION_LABELS[section][locale]}
          </a>
          <span className="mx-2 text-white/20">·</span>
          <a className="hover:text-volt" href={`/${locale}/legal/disclaimer`}>
            {t(locale, "Aviso legal", "Disclaimer", "Aviso legal")}
          </a>
        </p>
      </footer>
    </main>
  );
}
