"use client";

import { useState } from "react";

import { KOFI_URL, MP_ALIAS } from "@/lib/payment-config";
import { SUPPORT_NARRATIVE, markSupportAsked, supportCooldownDays } from "@/lib/support";
import type { Locale } from "@/lib/local-engines";
import { t } from "@/lib/i18n";

interface SupportSheetProps {
  locale: Locale;
  moment: "match" | "export";
  onClose: () => void;
}

/**
 * Layer 1 of the donation funnel: a non-intrusive bottom sheet shown once at
 * an emotional moment (match closed / official sheet exported). Closing it
 * records a persistent 7-day "do not ask again" cooldown.
 */
export function SupportSheet({ locale, moment, onClose }: SupportSheetProps) {
  const [copied, setCopied] = useState(false);

  const close = (): void => {
    markSupportAsked();
    onClose();
  };

  const copyAlias = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(MP_ALIAS);
    } catch {
      /* clipboard blocked: the alias stays visible for manual copy */
    }
    setCopied(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Apoyá VolleyOS", "Support VolleyOS", "Apoie o VolleyOS")}
      data-testid="support-sheet"
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 sm:place-items-center"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-volt/30 bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-volt">
            🏐 {t(locale, "Bancá la cancha", "Back the court", "Apoie a quadra")}
          </p>
          <button
            type="button"
            aria-label={t(locale, "Cerrar", "Close", "Fechar")}
            onClick={close}
            className="tap text-white/50"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-[15px] font-black text-white">
          {moment === "match"
            ? t(locale, "🎉 ¡Partido cerrado!", "🎉 Match closed!", "🎉 Partida encerrada!")
            : t(locale, "📄 Documento exportado", "📄 Document exported", "📄 Documento exportado")}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/70">
          {t(
            locale,
            "¿Te sirvió VolleyOS? Es gratis y se sostiene solo con aportes voluntarios.",
            "Did VolleyOS help you out? It is free and runs on voluntary support only.",
            "O VolleyOS te ajudou? É grátis e se sustenta apenas com apoio voluntário.",
          )}
        </p>

        <p className="mt-3 rounded-xl border border-emerald/30 bg-emerald/10 px-3 py-2 text-[10px] leading-relaxed font-semibold text-emerald">
          {SUPPORT_NARRATIVE[locale]}
        </p>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            data-testid="support-alias"
            onClick={() => void copyAlias()}
            className="tap w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white"
          >
            {copied
              ? t(locale, "✓ Alias copiado", "✓ Alias copied", "✓ Alias copiado")
              : t(locale, `💵 Aporte por Alias MP: ${MP_ALIAS}`, `💵 Support via MP Alias: ${MP_ALIAS}`, `💵 Aporte por Alias MP: ${MP_ALIAS}`)}
          </button>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="support-kofi"
            className="tap w-full rounded-lg bg-crimson px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-white hover:bg-imperial"
          >
            ☕ {t(locale, "Apoyar con Ko-fi (tarjeta / PayPal)", "Support on Ko-fi (card / PayPal)", "Apoiar no Ko-fi (cartão / PayPal)")}
          </a>
        </div>

        <p className="mt-3 text-[9px] leading-relaxed text-white/40">
          {t(
            locale,
            "No vamos a volver a preguntar por 7 días.",
            "We will not ask again for 7 days.",
            "Não vamos perguntar de novo por 7 dias.",
          )}{" "}
          {supportCooldownDays() > 0
            ? t(locale, `Faltan ${supportCooldownDays()} días.`, `${supportCooldownDays()} days left.`, `Faltam ${supportCooldownDays()} dias.`)
            : null}
        </p>
      </div>
    </div>
  );
}
