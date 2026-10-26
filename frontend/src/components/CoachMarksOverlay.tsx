"use client";

import { useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";
import { triggerCourtHaptics } from "@/lib/court-ux";

interface CoachStep {
  selectors: string[];
  title: string;
  body: string;
}

function buildSteps(locale: Locale): CoachStep[] {
  return [
    {
      selectors: ['[data-testid="guided-modes"]', '[data-testid="profile-filters"]'],
      title: t(locale, "Elegí tu modo y tu nivel", "Pick your mode and level", "Escolha seu modo e nível"),
      body: t(
        locale,
        "Los modos guiados (Novato, Avanzado, Árbitro) filtran las 61 herramientas a las que sirve tu rol, y los filtros por perfil hacen el resto.",
        "Guided modes (Novice, Advanced, Referee) narrow the 61 tools down to your role, and the profile filters do the rest.",
        "Os modos guiados (Novato, Avançado, Árbitro) reduzem as 61 ferramentas ao seu papel, e os filtros de perfil cuidam do resto.",
      ),
    },
    {
      selectors: ['[data-testid="picadito-entry"]'],
      title: t(locale, "Marcador y Picadito en 1 toque", "Scoreboard and Pickup in one tap", "Marcador e Rachinha em 1 toque"),
      body: t(
        locale,
        "⏯️ Cancha anota con botones o volumen y cierra el set solo. 🍻 Picadito & Amigos arma la lista, el banco, el juez y la vaquita.",
        "⏱️ Court scores with buttons or volume keys and closes the set for you. 🍻 Pickup & Friends wires the roster, bench, judge and pot.",
        "⏱️ Cancha anota por botões ou volume e fecha o set sozinho. 🍻 Picadito & Amigos monta a lista, o banco, o juiz e a vaquinha.",
      ),
    },
    {
      selectors: ['[data-testid="module-guide"]'],
      title: t(locale, "Paso a paso dentro de cada módulo", "Step by step inside every module", "Passo a passo dentro de cada módulo"),
      body: t(
        locale,
        "Cada módulo trae su tarjeta 🧭 con para qué sirve, 3 pasos y glosario. La pestaña ⚙️ Ajustes muestra la cobertura real de guías.",
        "Every module ships its 🧭 card with why it matters, 3 steps and a glossary. The ⚙️ Settings tab shows the real guide coverage.",
        "Cada módulo traz o cartão 🧭 com para que serve, 3 passos e glossário. A aba ⚙️ Ajustes mostra a cobertura real das guias.",
      ),
    },
  ];
}

const FALLBACK_SPOT = { top: "32%", left: "12%", width: "76%", height: "26%" };

/**
 * Spotlight wizard that turns the static module guides into a 3-step visual
 * tour: mode selector → scoreboard/pickup shortcuts → per-module guide card.
 */
export function CoachMarksOverlay({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const steps = buildSteps(locale);
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Record<"top" | "left" | "width" | "height", string> | null>(null);
  const step = steps[index] as CoachStep;

  useEffect(() => {
    const measure = (): void => {
      let found: Element | null = null;
      for (const selector of step.selectors) {
        found = document.querySelector(selector);
        if (found) break;
      }
      if (!found) {
        setSpot(null);
        return;
      }
      const rect = found.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSpot(null);
        return;
      }
      setSpot({
        top: `${Math.max(rect.top - 8, 4)}px`,
        left: `${Math.max(rect.left - 8, 4)}px`,
        width: `${rect.width + 16}px`,
        height: `${rect.height + 16}px`,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step]);

  const shown = spot ?? FALLBACK_SPOT;
  const last = index === steps.length - 1;

  const advance = (): void => {
    triggerCourtHaptics(20);
    if (last) onClose();
    else setIndex((current) => current + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Guía interactiva", "Interactive guide", "Guia interativa")}
      data-testid="coach-marks"
      className="fixed inset-0 z-[60]"
      onClick={onClose}
    >
      <div
        data-testid="coach-spotlight"
        className="absolute rounded-2xl ring-2 ring-volt transition-all duration-300"
        style={{ ...shown, boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)" }}
      />
      <div
        className="absolute w-[min(92vw,360px)] rounded-2xl border border-volt/40 bg-panel p-4 shadow-2xl"
        style={
          spot
            ? { top: `calc(${shown.top} + ${shown.height} + 12px)`, left: "50%", transform: "translateX(-50%)" }
            : { top: "58%", left: "50%", transform: "translateX(-50%)" }
        }
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-volt">
          🎯 {t(locale, "Guía Interactiva", "Interactive Guide", "Guia Interativa")} · {index + 1}/{steps.length}
        </p>
        <h2 className="mt-1 text-[15px] font-black text-white">{step.title}</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">{step.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            data-testid="coach-next"
            onClick={advance}
            className="tap flex-1 rounded-xl bg-volt px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-obsidian"
          >
            {last
              ? t(locale, "Entendido, ¡a jugar!", "Got it, let's play!", "Entendi, vamos jogar!")
              : t(locale, "Siguiente", "Next", "Próximo")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-xl border border-white/15 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/60"
          >
            {t(locale, "Saltar", "Skip", "Pular")}
          </button>
        </div>
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {steps.map((item, position) => (
            <span
              key={item.title}
              className={`h-1.5 rounded-full transition-all ${position === index ? "w-5 bg-volt" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
