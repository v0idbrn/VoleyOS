"use client";

import { useState } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";
import { getModuleGuide } from "@/lib/module-guides";

interface ModuleGuideBannerProps {
  slug: string;
  locale: Locale;
  defaultOpen?: boolean;
}

/**
 * Collapsible 🎯 why / 👣 3 steps / 📖 glossary card rendered at the top of
 * every module and main tab, in ES/EN/PT.
 */
export function ModuleGuideBanner({ slug, locale, defaultOpen = false }: ModuleGuideBannerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const guide = getModuleGuide(slug, locale);

  return (
    <section className="vos-item-card mb-3" data-testid="module-guide">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-wider text-volt">
          🧭 {t(locale, "Cómo usar este módulo", "How to use this module", "Como usar este módulo")}
        </span>
        <span aria-hidden className="text-white/50">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-white/75">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-crimson">
              🎯 {t(locale, "¿Para qué sirve?", "Why it matters on court", "Para que serve na quadra?")}
            </p>
            <p className="mt-1">{guide.why}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-crimson">
              👣 {t(locale, "Cómo se usa en 3 pasos", "How to use it in 3 steps", "Como usar em 3 passos")}
            </p>
            <ol className="mt-1 space-y-1">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span aria-hidden>{["1️⃣", "2️⃣", "3️⃣"][index]}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-crimson">
              📖 {t(locale, "Glosario rápido", "Quick glossary", "Glossário rápido")}
            </p>
            <dl className="mt-1 space-y-1">
              {guide.glossary.map(([term, definition]) => (
                <div key={term} className="flex gap-2">
                  <dt className="font-bold text-white">{term}:</dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  );
}
