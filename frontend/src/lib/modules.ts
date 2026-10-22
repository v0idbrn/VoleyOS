import type { Locale, Profile } from "@/lib/local-engines";

export interface ModuleMeta {
  slug: string;
  number: number;
  icon: string;
  profiles: Profile[];
  name: Record<Locale, string>;
  tagline: Record<Locale, string>;
}

export const MODULES: ModuleMeta[] = [
  {
    slug: "biomechanics",
    number: 1,
    icon: "🦵",
    profiles: ["players", "coaches"],
    name: { es: "Laboratorio 5 Fotogramas", en: "5 Frames Lab", pt: "Laboratório 5 Fotogramas" },
    tagline: {
      es: "Remate y salto vertical medidos con física, no con intuición.",
      en: "Attack and vertical jump measured with physics, not vibes.",
      pt: "Ataque e salto vertical medidos com física, não com achismo.",
    },
  },
  {
    slug: "rotation",
    number: 2,
    icon: "🧭",
    profiles: ["coaches", "court"],
    name: { es: "Pizarra 5-1 + Solapamiento", en: "5-1 Board & Overlap", pt: "Quadro 5-1 e Sobreposição" },
    tagline: {
      es: "R1-R6 validadas contra la regla FIVB al golpe de saque.",
      en: "R1-R6 validated against the FIVB overlap rule at serve contact.",
      pt: "R1-R6 validadas contra a regra FIVB no contato do saque.",
    },
  },
  {
    slug: "scouting",
    number: 3,
    icon: "📊",
    profiles: ["coaches"],
    name: { es: "Scouting en 3 Clics", en: "3-Click Scouting", pt: "Scout em 3 Cliques" },
    tagline: {
      es: "Voz o texto, K1 por rotación y mapa de calor 3x3.",
      en: "Voice or text, side-out by rotation and a 3x3 heatmap.",
      pt: "Voz ou texto, side-out por rotação e mapa de calor 3x3.",
    },
  },
  {
    slug: "scoreboard",
    number: 4,
    icon: "🏐",
    profiles: ["court", "tournaments"],
    name: { es: "Contador Indoor 6v6", en: "Indoor 6v6 Scoreboard", pt: "Placar Indoor 6x6" },
    tagline: {
      es: "Rotación horaria automática, líbero, tiempos y cambios.",
      en: "Automatic clockwise rotation, libero, timeouts and subs.",
      pt: "Rotação horária automática, líbero, tempos e substituições.",
    },
  },
  {
    slug: "tournament",
    number: 5,
    icon: "🏆",
    profiles: ["tournaments"],
    name: { es: "Torneos Relámpago", en: "Lightning Tournaments", pt: "Torneios Relâmpago" },
    tagline: {
      es: "Puntos 3-2-1-0, coeficientes FIVB y llaves automáticas.",
      en: "3-2-1-0 points, FIVB ratios and automatic brackets.",
      pt: "Pontos 3-2-1-0, coeficientes FIVB e chaves automáticas.",
    },
  },
  {
    slug: "pickup",
    number: 6,
    icon: "⚖️",
    profiles: ["players", "coaches"],
    name: { es: "Picaditos Parejos", en: "Pickup Balancer", pt: "Times Equilibrados" },
    tagline: {
      es: "Equipos nivelados con armador y Rey de la Cancha.",
      en: "Balanced teams with a setter and King of the Court.",
      pt: "Times nivelados com levantador e Rei da Quadra.",
    },
  },
  {
    slug: "overlay",
    number: 7,
    icon: "📺",
    profiles: ["tournaments", "coaches"],
    name: { es: "Overlay TV para OBS", en: "OBS TV Overlay", pt: "Overlay TV para OBS" },
    tagline: {
      es: "Marcador VNL transparente para streaming desde el celular.",
      en: "Transparent VNL scoreboard for mobile streaming.",
      pt: "Placar VNL transparente para streaming pelo celular.",
    },
  },
  {
    slug: "var",
    number: 8,
    icon: "⚖️",
    profiles: ["court", "players"],
    name: { es: "VAR de Bolsillo", en: "Pocket VAR", pt: "VAR de Bolso" },
    tagline: {
      es: "Regla FIVB exacta en 5 segundos y sorteo criptográfico.",
      en: "Exact FIVB rule in 5 seconds and crypto coin toss.",
      pt: "Regra FIVB exata em 5 segundos e sorteio criptográfico.",
    },
  },
  {
    slug: "beach",
    number: 9,
    icon: "🏝️",
    profiles: ["court", "tournaments"],
    name: { es: "Beach 2v2", en: "Beach 2v2", pt: "Beach 2v2" },
    tagline: {
      es: "Cambio de lado cada 7 puntos y cada 5 en el tercero.",
      en: "Side switch every 7 points, every 5 in the decider.",
      pt: "Troca de lado a cada 7 pontos, a cada 5 no terceiro set.",
    },
  },
  {
    slug: "volleycard",
    number: 10,
    icon: "🃏",
    profiles: ["players"],
    name: { es: "VolleyCard + Radar", en: "VolleyCard + Radar", pt: "VolleyCard + Radar" },
    tagline: {
      es: "Alcance real de ataque/bloqueo y carta para compartir.",
      en: "Real spike/block reach and a shareable card.",
      pt: "Alcance real de ataque/bloqueio e carta para compartilhar.",
    },
  },
  {
    slug: "tempo",
    number: 11,
    icon: "⏱️",
    profiles: ["players", "coaches"],
    name: { es: "Tempo de Ataque", en: "Attack Tempo", pt: "Tempo de Ataque" },
    tagline: {
      es: "Ventanas en milisegundos para 1°, 2°, pipe y 3° tiempo.",
      en: "Millisecond windows for 1st, 2nd, pipe and 3rd tempo.",
      pt: "Janelas em milissegundos para 1º, 2º, pipe e 3º tempo.",
    },
  },
  {
    slug: "acwr",
    number: 12,
    icon: "🚦",
    profiles: ["coaches", "players"],
    name: { es: "Monitor ACWR", en: "ACWR Monitor", pt: "Monitor ACWR" },
    tagline: {
      es: "Carga aguda:crónica en Decimal con semáforo tendinoso.",
      en: "Decimal acute:chronic load with a tendon traffic light.",
      pt: "Carga aguda:crônica em Decimal com semáforo tendíneo.",
    },
  },
];

export const MODULE_BY_SLUG = new Map(MODULES.map((module) => [module.slug, module]));

export const PROFILE_LABELS: Record<Profile | "all", Record<Locale, string>> = {
  all: { es: "Todos", en: "All", pt: "Todos" },
  players: { es: "Jugadores", en: "Players", pt: "Jogadores" },
  coaches: { es: "Entrenadores", en: "Coaches", pt: "Treinadores" },
  court: { es: "Cancha & Árbitros", en: "Court & Referees", pt: "Quadra e Árbitros" },
  tournaments: { es: "Torneos & TV", en: "Tournaments & TV", pt: "Torneios e TV" },
};
