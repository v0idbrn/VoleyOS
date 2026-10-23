"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { COPY, LOCALE_NAMES, t } from "@/lib/i18n";
import { buildTarget, paywallEnabled, type Locale, type Profile } from "@/lib/local-engines";
import { MODULES, PROFILE_LABELS } from "@/lib/modules";
import { addVaultEntry } from "@/lib/vault";
import { announceScoreTTS, requestCourtWakeLock, triggerCourtHaptics } from "@/lib/court-ux";
import { playArenaCue, type ArenaCue } from "@/lib/court-audio";
import { EphemeralVaultBar } from "@/components/EphemeralVaultBar";
import { STATIONS } from "@/components/stations";

const FILTERS: Array<Profile | "all"> = ["all", "players", "coaches", "court", "referees", "fans", "tournaments"];
const LOCALES: Locale[] = ["es", "en", "pt"];
const ROLE_KEY = "volleyos.role";
const CONTRAST_KEY = "volleyos.contrast";
const PIN_KEY = "volleyos.pins";
const ARENA_CUES: ArenaCue[] = ["MONSTER_BLOCK", "SUPER_SPIKE", "ACE_SIREN", "VIDEO_CHALLENGE_SUSPENSE", "SET_POINT_HEARTBEAT"];

function isProfile(value: string | null): value is Profile {
  return value !== null && (FILTERS as string[]).includes(value);
}

interface Plan {
  name: string;
  price: string;
  tagline: Record<Locale, string>;
  features: Record<Locale, string[]>;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Pase Express",
    price: "$7",
    tagline: { es: "Un torneo, cero fricción", en: "One tournament, zero friction", pt: "Um torneio, zero atrito" },
    features: {
      es: ["1 torneo completo", "Export Excel con auditoría", "1 overlay OBS", "Sin suscripción"],
      en: ["1 full tournament", "Audited Excel export", "1 OBS overlay", "No subscription"],
      pt: ["1 torneio completo", "Export Excel com auditoria", "1 overlay OBS", "Sem assinatura"],
    },
  },
  {
    name: "DT & Club Pro",
    price: "$19",
    tagline: { es: "El plan del cuerpo técnico", en: "The staff plan", pt: "O plano da comissão técnica" },
    features: {
      es: ["Torneos ilimitados", "VAR + Volleycards", "3 overlays simultáneos", "Scouting avanzado", "Soporte prioritario"],
      en: ["Unlimited tournaments", "VAR + Volleycards", "3 simultaneous overlays", "Advanced scouting", "Priority support"],
      pt: ["Torneios ilimitados", "VAR + Volleycards", "3 overlays simultâneos", "Scout avançado", "Suporte prioritário"],
    },
    highlight: true,
  },
  {
    name: "Torneo Cloud",
    price: "$29",
    tagline: { es: "Para organizadores y ligas", en: "For organisers and leagues", pt: "Para organizadores e ligas" },
    features: {
      es: ["Multi-sede y multi-cancha", "API + webhooks HMAC", "Marca propia en overlay", "Exportes masivos"],
      en: ["Multi-venue, multi-court", "API + HMAC webhooks", "White-label overlay", "Bulk exports"],
      pt: ["Multi-sede e multi-quadra", "API + webhooks HMAC", "Marca própria no overlay", "Exports em massa"],
    },
  },
];

export function VolleyOSHub({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const [profile, setProfile] = useState<Profile | "all">("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [contrast, setContrast] = useState(false);
  const [voice, setVoice] = useState(false);
  const [awake, setAwake] = useState(false);
  const [view, setView] = useState<"bento" | "list">("bento");
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [cue, setCue] = useState<ArenaCue>("MONSTER_BLOCK");
  const searchRef = useRef<HTMLInputElement>(null);
  const target = buildTarget();

  const visible = useMemo(() => {
    const needle = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return MODULES.filter((module) => {
      if (profile !== "all" && !module.profiles.includes(profile)) return false;
      if (!needle) return true;
      return `${module.name[locale]} ${module.tagline[locale]} ${module.slug}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(needle);
    });
  }, [locale, profile, query]);

  const ordered = useMemo(() => [...visible].sort((left, right) => Number(pinned.includes(right.slug)) - Number(pinned.includes(left.slug))), [visible, pinned]);

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_KEY);
    if (isProfile(storedRole)) setProfile(storedRole);
    setContrast(window.localStorage.getItem(CONTRAST_KEY) === "1");
    try {
      const storedPins = JSON.parse(window.localStorage.getItem(PIN_KEY) ?? "[]") as unknown;
      if (Array.isArray(storedPins)) setPinned(storedPins.filter((value): value is string => typeof value === "string"));
    } catch { setPinned([]); }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
    window.localStorage.setItem(CONTRAST_KEY, contrast ? "1" : "0");
  }, [contrast]);

  const togglePin = (slug: string): void => {
    const next = pinned.includes(slug) ? pinned.filter((value) => value !== slug) : [...pinned, slug];
    setPinned(next);
    window.localStorage.setItem(PIN_KEY, JSON.stringify(next));
    triggerCourtHaptics(30);
  };

  const chooseProfile = (value: Profile | "all"): void => {
    setProfile(value);
    window.localStorage.setItem(ROLE_KEY, value);
    triggerCourtHaptics(25);
  };

  const toggleWakeLock = async (): Promise<void> => {
    if (awake) {
      setAwake(false);
      setToast(t(locale, "Wake Lock liberado.", "Wake Lock released.", "Wake Lock liberado."));
      return;
    }
    const sentinel = await requestCourtWakeLock();
    setAwake(sentinel !== null);
    setToast(
      sentinel
        ? t(locale, "Pantalla despierta durante el partido.", "Screen kept awake during the match.", "Tela acordada durante a partida.")
        : t(locale, "Wake Lock no disponible en este navegador.", "Wake Lock unavailable in this browser.", "Wake Lock indisponivel neste navegador."),
    );
  };

  const toggleVoice = (): void => {
    const next = !voice;
    setVoice(next);
    setToast(
      next
        ? t(locale, "Narrador de voz activado.", "Voice announcer enabled.", "Narrador de voz ativado.")
        : t(locale, "Narrador de voz apagado.", "Voice announcer off.", "Narrador de voz desligado."),
    );
    announceScoreTTS(t(locale, "Narrador listo.", "Announcer ready.", "Narrador pronto."), next, locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSave = (slug: string, rows: number): void => {
    addVaultEntry(slug, rows);
    const meta = MODULES.find((module) => module.slug === slug);
    const text = `${meta?.name[locale] ?? slug}: ${rows} ${t(locale, "filas guardadas en la bóveda", "rows saved to the vault", "linhas salvas no cofre")}`;
    setToast(text);
    triggerCourtHaptics([60, 40, 80]);
    announceScoreTTS(text, voice, locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES");
  };

  return (
    <main id="main" lang={locale} className="pb-32">
      <a
        href="#stations"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-crimson focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {t(locale, "Saltar a las estaciones", "Skip to stations", "Pular para as esta??es")}
      </a>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-obsidian/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <a href="#main" className="flex items-center gap-2 font-black tracking-tight">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-crimson text-base">🏐</span>
            <span className="text-sm">
              Volley<span className="text-crimson">OS</span>
            </span>
          </a>
          <nav className="ml-4 hidden items-center gap-4 text-xs font-semibold uppercase tracking-wider text-white/60 md:flex">
            <a className="hover:text-volt" href="#stations">{copy.modules}</a>
            <a className="hover:text-volt" href="#pricing">{copy.pricing}</a>
            <a className="hover:text-volt" href="https://github.com/v0idbrn/VoleyOS" target="_blank" rel="noreferrer">GitHub ↗</a>
          </nav>
          <button
            type="button"
            aria-pressed={contrast}
            onClick={() => setContrast((value) => !value)}
            className={`ml-auto rounded border px-2 py-1 text-[10px] font-bold ${contrast ? "border-volt bg-volt text-obsidian" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {t(locale, "Alto contraste", "High contrast", "Alto contraste")}
          </button>
          <div className="flex items-center gap-1" aria-label="Idioma">
            {LOCALES.map((code) => (
              <a
                key={code}
                href={`/${code}`}
                aria-current={code === locale ? "page" : undefined}
                className={`rounded px-2 py-1 text-[10px] font-bold ${code === locale ? "bg-volt text-obsidian" : "text-white/50 hover:text-white"}`}
              >
                {LOCALE_NAMES[code]}
              </a>
            ))}
          </div>
          <span className={`ml-2 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${target === "fdroid" ? "border-emerald text-emerald" : "border-crimson text-crimson"}`}>
            {target === "fdroid" ? "FOSS" : "PRO"}
          </span>
        </div>
      </header>

      <div className="border-b border-white/10 bg-panel/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2 py-1 text-emerald">48/48 engines local</span>
          <button
            type="button"
            aria-pressed={awake}
            onClick={() => { void toggleWakeLock(); }}
            className={`rounded-full border px-2 py-1 ${awake ? "border-volt bg-volt text-obsidian" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {t(locale, "Pantalla despierta", "Wake lock", "Tela acordada")}
          </button>
          <button
            type="button"
            aria-pressed={voice}
            onClick={toggleVoice}
            className={`rounded-full border px-2 py-1 ${voice ? "border-volt bg-volt text-obsidian" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {t(locale, "Narrador", "Voice", "Narrador")}
          </button>
          <button
            type="button"
            aria-pressed={contrast}
            onClick={() => setContrast((value) => !value)}
            className={`rounded-full border px-2 py-1 ${contrast ? "border-volt bg-volt text-obsidian" : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {t(locale, "Contraste", "Contrast", "Contraste")}
          </button>
          <span className="ml-auto text-white/35">ES | EN | PT</span>
        </div>
      </div>

      <section className="hero-grid border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.4fr_1fr] md:py-20">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-crimson">{copy.heroKicker}</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">{copy.heroTitle}</h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">{copy.heroSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rounded-xl bg-crimson px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-crimson/20 transition hover:bg-imperial" href="#stations">
                {copy.cta}
              </a>
              <a className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white/80 transition hover:border-volt hover:text-volt" href="#pricing">
                {copy.pricing}
              </a>
            </div>
            <p className="mt-4 text-[11px] text-emerald">✓ {copy.offline} · ✓ 0 telemetría · ✓ AGPL-3.0</p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              { value: "36", label: t(locale, "módulos", "modules", "módulos") },
              { value: "3", label: t(locale, "idiomas", "languages", "idiomas") },
              { value: "0", label: t(locale, "telemetría", "telemetry", "telemetria") },
              { value: "1", label: t(locale, "clic por reporte", "click per report", "clique por relatório") },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-panel/70 p-4">
                <p className="text-3xl font-black text-volt">{stat.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stations" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">{copy.modules}</h2>
            <p className="mt-1 text-xs text-white/50">
              {t(locale, "Todo corre en tu dispositivo. Probá cada estación con datos realistas.", "Everything runs on your device. Try each station with realistic data.", "Tudo roda no seu dispositivo. Teste cada estação com dados realistas.")}
            </p>
          </div>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(locale, "Buscar módulo (Ctrl+K)", "Search modules (Ctrl+K)", "Buscar módulo (Ctrl+K)")}
            aria-label={t(locale, "Buscar módulo", "Search modules", "Buscar módulo")}
            className="w-full rounded-lg border border-white/15 bg-obsidian px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-volt sm:w-56"
          />
          <button
            type="button"
            onClick={() => setView((value) => (value === "bento" ? "list" : "bento"))}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-bold text-white/60 hover:text-white"
          >
            {view === "bento" ? t(locale, "Vista lista", "List view", "Vista lista") : t(locale, "Vista bento", "Bento view", "Vista bento")}
          </button>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label={copy.modules}>
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={profile === filter}
                onClick={() => chooseProfile(filter)}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                  profile === filter ? "border-volt bg-volt/15 text-volt" : "border-white/10 text-white/55 hover:text-white"
                }`}
              >
                {PROFILE_LABELS[filter][locale]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-panel/50 px-3 py-2" aria-label={t(locale, "Arena DJ", "Arena DJ", "Arena DJ")}>
          <span className="text-[10px] font-black uppercase tracking-wider text-crimson">Arena DJ</span>
          {ARENA_CUES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={cue === value}
              onClick={() => { setCue(value); playArenaCue(value); triggerCourtHaptics(20); }}
              className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${cue === value ? "border-volt bg-volt text-obsidian" : "border-white/15 text-white/60 hover:text-white"}`}
            >
              {value.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        {pinned.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] text-white/50">
            <span className="font-bold uppercase tracking-wider">{t(locale, "Fijados", "Pinned", "Fixados")}:</span>
            {pinned.map((slug) => (
              <button key={slug} type="button" onClick={() => togglePin(slug)} className="rounded-full border border-volt/40 bg-volt/10 px-2 py-0.5 text-volt">
                {MODULES.find((module) => module.slug === slug)?.name[locale] ?? slug} x
              </button>
            ))}
          </div>
        ) : null}

        <div className={view === "bento" ? "mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "mt-6 grid gap-3"}>
          {ordered.map((meta) => {
            const Station = STATIONS[meta.slug];
            if (!Station) return null;
            return (
              <div key={meta.slug} className="relative">
                <button
                  type="button"
                  aria-pressed={pinned.includes(meta.slug)}
                  aria-label={`${t(locale, "Fijar", "Pin", "Fixar")} ${meta.name[locale]}`}
                  onClick={() => togglePin(meta.slug)}
                  className={`absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full border text-xs ${pinned.includes(meta.slug) ? "border-volt bg-volt text-obsidian" : "border-white/20 bg-obsidian/80 text-white/50 hover:text-volt"}`}
                >
                  {pinned.includes(meta.slug) ? "*" : "+"}
                </button>
                <Station meta={meta} locale={locale} onSave={handleSave} />
              </div>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="border-y border-white/10 bg-panel/40">
        <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">{copy.pricing}</h2>
          <p className="mt-1 text-xs text-white/50">
            {paywallEnabled()
              ? t(locale, "Pago único por evento vía Stripe. La app libre nunca se bloquea.", "One-time payment per event via Stripe. The free app is never locked.", "Pagamento único por evento via Stripe. O app livre nunca é bloqueado.")
              : t(locale, "Build F-Droid: todos los módulos libres, sin cuentas ni pagos.", "F-Droid build: every module free, no accounts, no payments.", "Build F-Droid: todos os módulos livres, sem contas nem pagamentos.")}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`flex flex-col rounded-2xl border p-5 ${plan.highlight ? "border-crimson bg-crimson/10 shadow-xl shadow-crimson/10" : "border-white/10 bg-obsidian/60"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wider">{plan.name}</h3>
                  <p className="text-2xl font-black text-volt">{plan.price}<span className="text-[10px] text-white/40"> USD</span></p>
                </div>
                <p className="mt-1 text-[11px] text-white/50">{plan.tagline[locale]}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-[11px] text-white/70">
                  {plan.features[locale].map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
                {paywallEnabled() ? (
                  <button
                    type="button"
                    onClick={() => setCheckout(plan)}
                    className={`mt-4 rounded-lg px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider ${plan.highlight ? "bg-crimson text-white" : "border border-white/20 text-white/80 hover:border-volt hover:text-volt"}`}
                  >
                    {copy.cloudPro}
                  </button>
                ) : (
                  <a
                    href="https://github.com/v0idbrn/VoleyOS/releases"
                    className={`mt-4 rounded-lg px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider ${plan.highlight ? "bg-crimson text-white" : "border border-white/20 text-white/80 hover:border-volt hover:text-volt"}`}
                  >
                    {t(locale, "Descargar libre", "Download free", "Baixar livre")}
                  </a>
                )}
              </article>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-white/35">
            {t(locale, "Precios de referencia. El backend valida el pago con firma HMAC-SHA256 antes de liberar cualquier descarga.", "Reference prices. The backend verifies HMAC-SHA256 signatures before releasing any download.", "Preços de referência. O backend valida o pagamento com assinatura HMAC-SHA256 antes de liberar qualquer download.")}
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-[11px] text-white/40">
        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1">
          <span className="font-bold uppercase tracking-wider text-white/60">{t(locale, "Gu?as", "Guides", "Guias")}</span>
          <a className="hover:text-volt" href={`/${locale}/modules`}>{t(locale, "M?dulos", "Modules", "M?dulos")}</a>
          <a className="hover:text-volt" href={`/${locale}/positions`}>{t(locale, "Posiciones", "Positions", "Posi??es")}</a>
          <a className="hover:text-volt" href={`/${locale}/rotations`}>{t(locale, "Rotaciones", "Rotations", "Rota??es")}</a>
          <a className="hover:text-volt" href={`/${locale}/alternatives`}>{t(locale, "Alternativas", "Alternatives", "Alternativas")}</a>
          <a className="hover:text-volt" href={`/${locale}/tools`}>{t(locale, "Herramientas", "Tools", "Ferramentas")}</a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} VolleyOS Global · AGPL-3.0-or-later · {t(locale, "hecho para canchas reales", "built for real courts", "feito para quadras reais")}</p>
          <p className="flex gap-3">
            <a className="hover:text-volt" href={`/${locale}/legal/privacy`}>{t(locale, "Privacidad", "Privacy", "Privacidade")}</a>
            <a className="hover:text-volt" href={`/${locale}/legal/terms`}>{t(locale, "Términos", "Terms", "Termos")}</a>
            <a className="hover:text-volt" href={`/${locale}/legal/disclaimer`}>{t(locale, "Aviso", "Disclaimer", "Aviso")}</a>
            <a className="hover:text-volt" href={`/${locale}/legal/trademarks`}>{t(locale, "Marcas", "Trademarks", "Marcas")}</a>
          </p>
        </div>
      </footer>

      <EphemeralVaultBar locale={locale} />
      {checkout ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(locale, "Confirmar plan", "Confirm plan", "Confirmar plano")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setCheckout(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-panel p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">{copy.cloudPro}</p>
            <h3 className="mt-1 text-xl font-black">{checkout.name}</h3>
            <p className="mt-1 text-2xl font-black text-volt">{checkout.price} <span className="text-[10px] text-white/40">USD</span></p>
            <p className="mt-2 text-[11px] text-white/60">{checkout.tagline[locale]}</p>
            <ul className="mt-3 space-y-1 text-[11px] text-white/70">
              {checkout.features[locale].map((feature) => <li key={feature}>· {feature}</li>)}
            </ul>
            <a
              href={`mailto:cloud@volleyos.app?subject=${encodeURIComponent(`VolleyOS ${checkout.name}`)}`}
              className="mt-4 block rounded-lg bg-crimson px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-white"
            >
              {t(locale, "Reservar por email", "Book by email", "Reservar por email")}
            </a>
            <button type="button" className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:border-volt hover:text-volt" onClick={() => setCheckout(null)}>
              {t(locale, "Cerrar", "Close", "Fechar")}
            </button>
            <p className="mt-2 text-[9px] text-white/35">
              {t(locale, "Sin telemetría. La confirmación se firma con HMAC-SHA256 en el backend.", "No telemetry. Confirmation is HMAC-SHA256 signed by the backend.", "Sem telemetria. A confirmação é assinada com HMAC-SHA256 no backend.")}
            </p>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div role="status" className="fixed bottom-28 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-emerald/40 bg-emerald/15 px-3 py-2 text-center text-[11px] font-semibold text-emerald backdrop-blur">
          {toast}
        </div>
      ) : null}
      <nav
        aria-label={t(locale, "Perfiles", "Profiles", "Perfis")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-obsidian/95 px-2 py-2 backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto">
          {(FILTERS.filter((value): value is Profile => value !== "all")).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={profile === value}
              onClick={() => chooseProfile(value)}
              className={`min-w-[74px] flex-1 rounded-xl border px-2 py-2 text-[10px] font-black uppercase tracking-wide transition ${
                profile === value ? "border-volt bg-volt text-obsidian" : "border-white/10 text-white/55 hover:text-white"
              }`}
            >
              {PROFILE_LABELS[value][locale]}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
