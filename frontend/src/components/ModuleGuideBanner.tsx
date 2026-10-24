"use client";

import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import { MODULE_BY_SLUG } from "@/lib/modules";
import type { Locale } from "@/lib/local-engines";
import { triggerCourtHaptics } from "@/lib/court-ux";

export function ModuleGuideBanner({ slug, locale, defaultOpen = false }: { slug: string; locale: Locale; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = MODULE_BY_SLUG.get(slug);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const name = meta?.name?.[locale] ?? slug;
  const tagline = meta?.tagline?.[locale] ?? "";
  const why = t(
    locale,
    "¿Para qué sirve y cómo se usa?",
    "What is this and how do I use it?",
    "Para que serve e como usar?",
  );
  const close = t(locale, "Cerrar guía", "Close guide", "Fechar guia");

  return (
    <button
      type="button"
      onClick={() => {
        setOpen((value) => !value);
        triggerCourtHaptics(15);
      }}
      className={`tap w-full rounded-xl border border-white/10 ${open ? "bg-emerald/10 border-emerald/40" : "bg-panel border-white/10"} px-3 py-2 text-left`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-white">
          <span aria-hidden>💡</span>
          {why}
        </span>
        <span className={`text-[10px] font-bold ${open ? "text-emerald" : "text-white/40"}`}>
          {open ? close : "▾"}
        </span>
      </div>
      {open && (
        <div className="mt-2 text-[11px] leading-relaxed text-white/60">
          {t(
            locale,
            `Usa "${name}" para analizar jugadas, anotar puntos y gestionar tu cancha en un solo toque. ${tagline}. Sin internet, sin cuenta y sin telemetría.`,
            `Use "${name}" to analyze plays, score points and manage your court in one tap. ${tagline}. Offline, no account, no telemetry.`,
            `Use "${name}" para analisar jogadas, anotar pontos e gerenciar sua quadra em um toque. ${tagline}. Sem internet, sem conta e sem telemetria.`,
          )}
        </div>
      )}
    </button>
  );
}
