"use client";

import { Component, type ReactNode } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";

interface ModuleErrorBoundaryProps {
  locale: Locale;
  children: ReactNode;
  /** Changing the reset key (e.g. switching modules) clears a stale error. */
  resetKey?: string;
}

interface ModuleErrorBoundaryState {
  error: Error | null;
}

/**
 * v9.4 — a crash inside one tool must never take down the whole shell.
 * Catches render errors and offers a 1-tap restart: the match state lives in
 * localStorage, so nothing of the game is lost.
 */
export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previous: ModuleErrorBoundaryProps): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { locale } = this.props;
    return (
      <div
        role="alert"
        data-testid="module-error-boundary"
        className="rounded-2xl border border-crimson/50 bg-crimson/10 p-4 text-center"
      >
        <p aria-hidden className="text-3xl">🛠️</p>
        <p className="mt-1 text-[12px] font-black">
          {t(locale, "Esta herramienta tuvo un tropiezo.", "This tool hit a bump.", "Esta ferramenta teve um tropeço.")}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-white/60">
          {t(
            locale,
            "Tu partido sigue intacto: el marcador y tus datos siguen guardados.",
            "Your match stays intact: the scoreboard and your data are still saved.",
            "Sua partida segue intacta: o placar e seus dados continuam salvos.",
          )}
        </p>
        <button
          type="button"
          data-testid="module-restart"
          onClick={() => this.setState({ error: null })}
          className="tap mt-3 w-full rounded-lg bg-volt px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-obsidian"
        >
          🔄{" "}
          {t(
            locale,
            "Reiniciar esta herramienta (Tu partido sigue intacto)",
            "Restart this tool (Your match stays intact)",
            "Reiniciar esta ferramenta (Sua partida segue intacta)",
          )}
        </button>
      </div>
    );
  }
}
