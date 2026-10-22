import type { Locale } from "@/lib/local-engines";

export const LOCALE_NAMES: Record<Locale, string> = { es: "ES", en: "EN", pt: "PT" };

export function isLocale(value: string): value is Locale {
  return value === "es" || value === "en" || value === "pt";
}

interface Copy {
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  modules: string;
  pricing: string;
  vault: string;
  offline: string;
  loadExample: string;
  reset: string;
  supportFoss: string;
  cloudPro: string;
}

export const COPY: Record<Locale, Copy> = {
  es: {
    heroKicker: "18 módulos · 3 idiomas · 0 telemetría",
    heroTitle: "El sistema operativo del vóley mundial",
    heroSubtitle:
      "Biomecánica, táctica, arbitraje, torneos y streaming en una sola app. Offline-first para gimnasios sin señal y Cloud Pro para clubes que transmiten.",
    cta: "Abrir el Command Center",
    modules: "Estaciones",
    pricing: "Planes Cloud Pro",
    vault: "Bóveda efímera",
    offline: "Funciona sin internet",
    loadExample: "⚡ Cargar Ejemplo Realista en 1 Clic",
    reset: "Reiniciar",
    supportFoss: "Apoyar la versión libre",
    cloudPro: "Cloud Pro",
  },
  en: {
    heroKicker: "18 modules · 3 languages · 0 telemetry",
    heroTitle: "The operating system of world volleyball",
    heroSubtitle:
      "Biomechanics, tactics, refereeing, tournaments and streaming in one app. Offline-first for gyms with no signal, Cloud Pro for streaming clubs.",
    cta: "Open the Command Center",
    modules: "Stations",
    pricing: "Cloud Pro plans",
    vault: "Ephemeral vault",
    offline: "Works offline",
    loadExample: "⚡ Load a Realistic Example in 1 Click",
    reset: "Reset",
    supportFoss: "Support the free build",
    cloudPro: "Cloud Pro",
  },
  pt: {
    heroKicker: "18 módulos · 3 idiomas · 0 telemetria",
    heroTitle: "O sistema operacional do vôlei mundial",
    heroSubtitle:
      "Biomecânica, tática, arbitragem, torneios e streaming em um só app. Offline-first para ginásios sem sinal e Cloud Pro para clubes que transmitem.",
    cta: "Abrir o Command Center",
    modules: "Estações",
    pricing: "Planos Cloud Pro",
    vault: "Cofre efêmero",
    offline: "Funciona sem internet",
    loadExample: "⚡ Carregar Exemplo Realista em 1 Clique",
    reset: "Reiniciar",
    supportFoss: "Apoiar a versão livre",
    cloudPro: "Cloud Pro",
  },
};

export function t(locale: Locale, es: string, en: string, pt: string): string {
  if (locale === "es") return es;
  if (locale === "en") return en;
  return pt;
}
