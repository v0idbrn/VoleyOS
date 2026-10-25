"use client";

/**
 * Route-level client error boundary: any render/effect exception shows a
 * recoverable trilingual card instead of Next's dead "Application error"
 * screen. The reset callback re-renders the route from its last good state.
 */

import { useEffect } from "react";

import type { Locale } from "@/lib/local-engines";

function currentLocale(): Locale {
  if (typeof window === "undefined") return "es";
  const path = window.location.pathname.split("/")[1];
  return path === "en" || path === "pt" ? path : "es";
}

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = currentLocale();
  useEffect(() => {
    // Keep the original stack in logcat / DevTools for diagnosis.
    console.error("[volleyos] route error:", error);
  }, [error]);

  const copy =
    locale === "en"
      ? {
          title: "Something broke on this screen",
          body: "The rest of the app still works. Reload this screen, or go back home.",
          retry: "Reload screen",
          home: "Go home",
        }
      : locale === "pt"
        ? {
            title: "Algo quebrou nesta tela",
            body: "O resto do app continua funcionando. Recarregue a tela ou volte ao início.",
            retry: "Recarregar tela",
            home: "Início",
          }
        : {
            title: "Algo se rompió en esta pantalla",
            body: "El resto de la app sigue funcionando. Recargá la pantalla o volvé al inicio.",
            retry: "Recargar pantalla",
            home: "Inicio",
          };

  return (
    <div className="grid min-h-[60vh] place-items-center p-6" role="alert">
      <div className="vos-section-card w-full max-w-sm rounded-2xl border border-white/10 p-6 text-center">
        <p className="text-3xl" aria-hidden>
          🏐
        </p>
        <h1 className="mt-2 text-lg font-black text-white">{copy.title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-white/60">{copy.body}</p>
        {error.digest ? <p className="mt-2 font-mono text-[10px] text-white/35">ref: {error.digest}</p> : null}
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="tap w-full rounded-lg bg-crimson px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white"
          >
            🔄 {copy.retry}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="tap w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white"
          >
            🏠 {copy.home}
          </button>
        </div>
      </div>
    </div>
  );
}
