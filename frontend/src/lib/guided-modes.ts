import type { Locale } from "@/lib/local-engines";

export type GuidedModeId = "novice" | "advanced" | "referee" | "dt" | "tournaments";

export interface GuidedDrawer {
  id: string;
  title: Record<Locale, string>;
  slugs: string[];
  /** Difficulty badge shown next to the drawer title. */
  badge?: "basic" | "tactical" | "pro";
  /** Novice drawers start expanded. */
  openByDefault?: boolean;
}

export interface GuidedMode {
  id: GuidedModeId;
  icon: string;
  label: Record<Locale, string>;
  drawers: GuidedDrawer[];
}

export const GUIDED_MODES: GuidedMode[] = [
  {
    id: "novice",
    icon: "🌱",
    label: {
      es: "Jugador Novato",
      en: "Novice Player",
      pt: "Jogador Novato",
    },
    drawers: [
      {
        id: "novice-rotations",
        title: { es: "Aprender rotaciones sin hacer falta", en: "Learn rotations the easy way", pt: "Aprender rodízios do jeito fácil" },
        slugs: ["rotation", "lineup-slip", "setter-signals"],
        openByDefault: true,
      },
      {
        id: "novice-scoreboard",
        title: { es: "Marcador Picadito 15 pts", en: "Pickup 15-pt Scoreboard", pt: "Placar Rachinha 15 pts" },
        slugs: ["scoreboard", "house-rules", "beach"],
        openByDefault: true,
      },
      {
        id: "novice-teams",
        title: { es: "Equipos parejos", en: "Balanced teams", pt: "Times equilibrados" },
        slugs: ["pickup", "captain-draft"],
        openByDefault: true,
      },
      {
        id: "novice-wallet",
        title: { es: "La Vaquita", en: "The Money Pot", pt: "A Vaquinha" },
        slugs: ["court-split", "team-treasury"],
        openByDefault: true,
      },
      {
        id: "novice-referee",
        title: { es: "Señas del árbitro", en: "Referee signals", pt: "Sinais do árbitro" },
        slugs: ["referee-console", "var", "fan-companion"],
        openByDefault: true,
      },
      {
        id: "novice-fundamentals",
        title: { es: "Fundamentos", en: "Fundamentals", pt: "Fundamentos" },
        slugs: ["biomechanics", "tempo", "serve-radar", "volleycard", "court-slang"],
        openByDefault: true,
      },
    ],
  },
  {
    id: "advanced",
    icon: "🔥",
    label: {
      es: "Jugador Avanzado",
      en: "Advanced Player",
      pt: "Jogador Avançado",
    },
    drawers: [
      {
        id: "adv-video",
        title: { es: "Telestrador de video cuadro a cuadro", en: "Frame-by-frame video telestrator", pt: "Telestrator de vídeo quadro a quadro" },
        slugs: ["video-telestrator", "rally-clipper", "playbook-animator"],
        openByDefault: false,
      },
      {
        id: "adv-biomech",
        title: { es: "Lab de 5 fotogramas y salto vertical", en: "5-frame lab and vertical jump", pt: "Lab de 5 fotogramas e salto vertical" },
        slugs: ["biomechanics", "ball-aerodynamics", "tempo", "peripheral-reflex"],
        openByDefault: false,
      },
      {
        id: "adv-performance",
        title: { es: "Rendimiento y salud", en: "Performance and health", pt: "Desempenho e saúde" },
        slugs: ["volleycard", "acwr", "tournament-nutrition", "injury-prehab"],
        openByDefault: false,
      },
      {
        id: "adv-career",
        title: { es: "Dossier de beca y carrera", en: "Scholarship and career dossier", pt: "Dossiê de bolsa e carreira" },
        slugs: ["recruiting-dossier", "player-career", "matchup-matrix"],
        openByDefault: false,
      },
    ],
  },
  {
    id: "referee",
    icon: "🟨🟥",
    label: {
      es: "Cabina Árbitros",
      en: "Referee Cockpit",
      pt: "Cabine de Árbitros",
    },
    drawers: [
      {
        id: "ref-board",
        title: {
          es: "Marcador oficial + cambio de cancha + volumen + pantalla gigante",
          en: "Official board + court swap + volume keys + giant screen",
          pt: "Placar oficial + troca de lado + volume + tela gigante",
        },
        slugs: ["scoreboard", "gym-screen", "qr-sync"],
        openByDefault: true,
      },
      {
        id: "ref-whistle",
        title: {
          es: "Silbato, chicharra, tarjetas, reloj 30s y sorteo",
          en: "Whistle, horn, cards, 30s clock and coin toss",
          pt: "Apito, chicharra, cartões, relógio 30s e moeda",
        },
        slugs: ["referee-console", "var", "arena-dj", "mvp-awards"],
        openByDefault: false,
      },
      {
        id: "ref-rules",
        title: {
          es: "Faltas de posición 7.4, 6 cambios, líbero y tie-break",
          en: "Position faults 7.4, 6 subs, libero and tie-break",
          pt: "Faltas de posição 7.4, 6 trocas, líbero e tie-break",
        },
        slugs: ["lineup-slip", "substitution-tracker", "tiebreak-commander", "roster-pass"],
        openByDefault: false,
      },
      {
        id: "ref-sheet",
        title: {
          es: "Planilla FIVB A4 y sincronización QR",
          en: "FIVB A4 scoresheet and QR sync",
          pt: "Súmula FIVB A4 e sincronia QR",
        },
        slugs: ["fivb-escoresheet", "integrity-seal", "equipment-inspector", "elo-ranking"],
        openByDefault: false,
      },
    ],
  },
  {
    id: "dt",
    icon: "📋",
    label: {
      es: "Laboratorio DT",
      en: "Coach Lab",
      pt: "Laboratório do Técnico",
    },
    drawers: [
      {
        id: "dt-basic",
        title: { es: "Bases de la pizarra", en: "Whiteboard basics", pt: "Bases da lousa" },
        badge: "basic",
        slugs: ["rotation", "scouting", "setter-iq", "lineup-slip"],
        openByDefault: false,
      },
      {
        id: "dt-tactical",
        title: { es: "Táctica de ataque y bloqueo", en: "Attack and block tactics", pt: "Tática de ataque e bloqueio" },
        badge: "tactical",
        slugs: ["block-shadow", "seam-radar", "blockout-lab", "matchup-matrix", "system-transition", "deception-reader", "momentum-coach"],
        openByDefault: false,
      },
      {
        id: "dt-pro",
        title: { es: "Preparación pro", en: "Pro preparation", pt: "Preparação pro" },
        badge: "pro",
        slugs: ["practice-planner", "timeout-chalkboard", "acwr", "injury-prehab", "tournament-nutrition", "shot-heatmap", "playbook-animator", "serve-radar"],
        openByDefault: false,
      },
    ],
  },
  {
    id: "tournaments",
    icon: "🏆",
    label: {
      es: "Torneos & Club",
      en: "Tournaments & Club",
      pt: "Torneios & Clube",
    },
    drawers: [
      {
        id: "t-owner",
        title: { es: "Organizar el torneo", en: "Run the tournament", pt: "Organizar o torneio" },
        slugs: ["tournament", "bracket-architect", "practice-planner", "timeout-chalkboard"],
        openByDefault: false,
      },
      {
        id: "t-money",
        title: { es: "Plata y sponsors", en: "Money and sponsors", pt: "Grana e patrocinadores" },
        slugs: ["court-split", "team-treasury", "sponsor-deck", "captain-draft"],
        openByDefault: false,
      },
      {
        id: "t-scout",
        title: { es: "Captación y análisis", en: "Recruiting and analysis", pt: "Captação e análise" },
        slugs: ["recruiting-dossier", "shot-heatmap", "head-to-head", "player-career"],
        openByDefault: false,
      },
    ],
  },
];

export const GUIDED_MODE_BY_ID = new Map(GUIDED_MODES.map((mode) => [mode.id, mode]));

export const DIFFICULTY_BADGES: Record<"basic" | "tactical" | "pro", Record<Locale, string>> = {
  basic: { es: "🌱 Básico", en: "🌱 Basic", pt: "🌱 Básico" },
  tactical: { es: "⚡ Táctico", en: "⚡ Tactical", pt: "⚡ Tático" },
  pro: { es: "🔬 Pro", en: "🔬 Pro", pt: "🔬 Pro" },
};
