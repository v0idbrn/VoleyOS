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
    profiles: ["players"],
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
    profiles: ["coaches"],
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
    profiles: ["court"],
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
    profiles: ["players"],
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
    profiles: ["fans"],
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
    profiles: ["court"],
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
    profiles: ["court"],
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
    profiles: ["players"],
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
    profiles: ["coaches"],
    name: { es: "Monitor ACWR", en: "ACWR Monitor", pt: "Monitor ACWR" },
    tagline: {
      es: "Carga aguda:crónica en Decimal con semáforo tendinoso.",
      en: "Decimal acute:chronic load with a tendon traffic light.",
      pt: "Carga aguda:crônica em Decimal com semáforo tendíneo.",
    },
  },
  {
    slug: "block-shadow",
    number: 13,
    icon: "🧱",
    profiles: ["coaches"],
    name: { es: "Sombra de Bloqueo y Cobertura", en: "Block Shadow & Cover", pt: "Sombra de Bloqueio e Cobertura" },
    tagline: {
      es: "Cono de sombra en Decimal, defensores fuera del bloqueo y cancha cubierta.",
      en: "Decimal shadow cone, defenders outside the block and court coverage.",
      pt: "Cone de sombra em Decimal, defensores fora do bloqueio e cobertura da quadra.",
    },
  },
  {
    slug: "seam-radar",
    number: 14,
    icon: "📡",
    profiles: ["court"],
    name: { es: "Radar de Costuras de Recepción", en: "Reception Seam Radar", pt: "Radar de Costuras de Recepção" },
    tagline: {
      es: "Dueño de la costura, prioridad y drill para cerrar el hueco entre receptores.",
      en: "Seam owner, priority and drill to close the gap between receivers.",
      pt: "Dono da costura, prioridade e drill para fechar o vão entre receptores.",
    },
  },
  {
    slug: "setter-iq",
    number: 15,
    icon: "🎯",
    profiles: ["coaches"],
    name: { es: "Auditor de Imprevisibilidad del Armador", en: "Setter IQ Auditor", pt: "Auditor de Imprevisibilidade do Levantador" },
    tagline: {
      es: "Distribución R1-R6, índice 0-100 y sesgos por calidad de pase.",
      en: "R1-R6 distribution, 0-100 index and pass-quality bias.",
      pt: "Distribuição R1-R6, índice 0-100 e vieses por qualidade de passe.",
    },
  },
  {
    slug: "lineup-slip",
    number: 16,
    icon: "📋",
    profiles: ["referees"],
    name: { es: "Boleta FIVB I-VI", en: "FIVB Lineup Slip I-VI", pt: "Boleta FIVB I-VI" },
    tagline: {
      es: "Pares a 3 posiciones y ventana exacta del líbero por rotación.",
      en: "Pairs three positions apart and the exact libero window per rotation.",
      pt: "Pares a 3 posições e janela exata do líbero por rotação.",
    },
  },
  {
    slug: "integrity-seal",
    number: 17,
    icon: "🛡️",
    profiles: ["referees"],
    name: { es: "Sello Criptográfico Anti-Trampa", en: "Integrity Seal", pt: "Selo Criptográfico Anti-Fraude" },
    tagline: {
      es: "HMAC-SHA256 sobre JSON canónico, hash público y verificación de actas.",
      en: "HMAC-SHA256 over canonical JSON, public hash and match-sheet verification.",
      pt: "HMAC-SHA256 sobre JSON canônico, hash público e verificação de súmulas.",
    },
  },
  {
    slug: "capsule-io",
    number: 18,
    icon: "📦",
    profiles: ["fans"],
    name: { es: "Cápsula Universal .volleyos", en: ".volleyos Capsule", pt: "Cápsula Universal .volleyos" },
    tagline: {
      es: "Exporta e importa pizarras, planteles y torneos con checksum SHA-256.",
      en: "Export and import boards, rosters and tournaments with a SHA-256 checksum.",
      pt: "Exporta e importa quadros, elencos e torneios com checksum SHA-256.",
    },
  },
  {
    slug: "referee-console",
    number: 19,
    icon: "🟨",
    profiles: ["referees"],
    name: { es: "Consola de Árbitro y Silbato", en: "Referee Whistle Console", pt: "Console de Árbitro e Apito" },
    tagline: {
      es: "Tarjetas FIVB 21, escalado automático, 8 s de saque y 30 s de tiempo.",
      en: "FIVB 21 cards, automatic escalation, 8 s serve and 30 s timeouts.",
      pt: "Cartões FIVB 21, escalonamento automático, 8 s de saque e 30 s de tempo.",
    },
  },
  {
    slug: "substitution-tracker",
    number: 20,
    icon: "🔁",
    profiles: ["court"],
    name: { es: "Control de Cambios y Reingresos", en: "Substitution & Re-entry Tracker", pt: "Controle de Substituições e Retornos" },
    tagline: {
      es: "Seis cambios por set, pares atados por posición y lesión excepcional.",
      en: "Six subs per set, position-bound pairs and exceptional injury.",
      pt: "Seis substituições por set, pares presos por posição e lesão excepcional.",
    },
  },
  {
    slug: "court-split",
    number: 21,
    icon: "💸",
    profiles: ["tournaments"],
    name: { es: "Vaquita de Cancha al Centavo", en: "Court Split to the Cent", pt: "Rateio de Quadra ao Centavo" },
    tagline: {
      es: "Costos, señas, descuentos y texto de WhatsApp sin redondear de más.",
      en: "Costs, deposits, discounts and WhatsApp text with no rounding leaks.",
      pt: "Custos, sinais, descontos e texto de WhatsApp sem arredondar errado.",
    },
  },
  {
    slug: "fan-companion",
    number: 22,
    icon: "📣",
    profiles: ["fans"],
    name: { es: "Compañero de Tribuna", en: "Fan Companion", pt: "Companheiro de Torcida" },
    tagline: {
      es: "Ocho gestos arbitrales explicados y trivia con rangos de tribuna.",
      en: "Eight referee gestures explained and trivia with fan ranks.",
      pt: "Oito gestos de arbitragem explicados e trivia com ranks de torcida.",
    },
  },
  {
    slug: "setter-signals",
    number: 23,
    icon: "✋",
    profiles: ["players"],
    name: { es: "Señas del Armador", en: "Setter Signal Sheet", pt: "Sinais do Levantador" },
    tagline: {
      es: "Siete gestos, seis jugadas, colisiones detectadas y hoja lista.",
      en: "Seven gestures, six plays, collision checks and a ready sheet.",
      pt: "Sete gestos, seis jogadas, colisões detectadas e folha pronta.",
    },
  },
  {
    slug: "mvp-awards",
    number: 24,
    icon: "🏆",
    profiles: ["fans"],
    name: { es: "Premios MVP de Cancha", en: "Court MVP Awards", pt: "Prêmios MVP de Quadra" },
    tagline: {
      es: "MVP, Muro, Candado, Francotirador, Albañil y Sangre Fría sellados.",
      en: "MVP, Wall, Lock, Sniper, Builder and Ice sealed share card.",
      pt: "MVP, Muro, Cadeado, Franco-Atirador, Pedreiro e Sangue Frio selados.",
    },
  },
  {
    slug: "timeout-chalkboard",
    number: 25,
    icon: "🖍️",
    profiles: ["tournaments"],
    name: { es: "Pizarra de Tiempo Muerto", en: "Timeout Chalkboard", pt: "Lousa de Tempo" },
    tagline: {
      es: "Dos consignas, 30 segundos FIVB y trazos validados en 9x18 m.",
      en: "Two cues, 30 FIVB seconds and strokes validated on 9x18 m.",
      pt: "Duas orientações, 30 segundos FIVB e traços validados em 9x18 m.",
    },
  },
  {
    slug: "momentum-coach",
    number: 26,
    icon: "📈",
    profiles: ["tournaments"],
    name: { es: "Coach de Momentum", en: "Momentum Coach", pt: "Coach de Momentum" },
    tagline: {
      es: "Break points, racha rival y rotación de mayor presión.",
      en: "Break points, opponent runs and the rotation under pressure.",
      pt: "Break points, sequência rival e rotação sob pressão.",
    },
  },
  {
    slug: "captain-draft",
    number: 27,
    icon: "🐍",
    profiles: ["tournaments"],
    name: { es: "Draft Serpiente", en: "Snake Captain Draft", pt: "Draft Serpente" },
    tagline: {
      es: "Orden A-B-B-A, equipos parejos y auditoría por departamento.",
      en: "A-B-B-A order, balanced teams and a department audit.",
      pt: "Ordem A-B-B-A, times equilibrados e auditoria por departamento.",
    },
  },
  {
    slug: "roster-pass",
    number: 28,
    icon: "🪪",
    profiles: ["referees"],
    name: { es: "Pase de Plantel", en: "Roster Pass", pt: "Passe de Elenco" },
    tagline: {
      es: "14 jugadores, dos liberos y pase VOS-ROSTER sellado.",
      en: "14 players, two liberos and a sealed VOS-ROSTER pass.",
      pt: "14 jogadores, dois líberos e passe VOS-ROSTER selado.",
    },
  },
  {
    slug: "equipment-inspector",
    number: 29,
    icon: "📏",
    profiles: ["referees"],
    name: { es: "Inspector de Red y Balón", en: "Equipment Inspector", pt: "Inspetor de Rede e Bola" },
    tagline: {
      es: "Alturas oficiales, tolerancia de 2 cm y presión en tres unidades.",
      en: "Official heights, 2 cm tolerance and pressure in three units.",
      pt: "Alturas oficiais, tolerância de 2 cm e pressão em três unidades.",
    },
  },
  {
    slug: "match-poster",
    number: 30,
    icon: "🖼️",
    profiles: ["fans"],
    name: { es: "Poster SVG de Partido", en: "SVG Match Poster", pt: "Pôster SVG da Partida" },
    tagline: {
      es: "Story 9:16 y feed 1:1 con sets, MVP, sello y código de sala.",
      en: "9:16 story and 1:1 feed with sets, MVP, seal and room code.",
      pt: "Story 9:16 e feed 1:1 com sets, MVP, selo e código de sala.",
    },
  },
];

export const MODULE_BY_SLUG = new Map(MODULES.map((module) => [module.slug, module]));

export const PROFILE_LABELS: Record<Profile | "all", Record<Locale, string>> = {
  all: { es: "Todos", en: "All", pt: "Todos" },
  players: { es: "Jugador", en: "Player", pt: "Jogador" },
  coaches: { es: "DT & Táctica", en: "Coach & Tactics", pt: "Técnico e Tática" },
  court: { es: "Cancha", en: "Court", pt: "Quadra" },
  tournaments: { es: "Torneo & Picadito", en: "Tournament & Pickup", pt: "Torneio e Picadito" },
  referees: { es: "Árbitro & Mesa", en: "Referee & Table", pt: "Árbitro e Mesa" },
  fans: { es: "Tribuna & Redes", en: "Fans & Social", pt: "Torcida e Redes" },
};
