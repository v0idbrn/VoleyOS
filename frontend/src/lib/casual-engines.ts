/**
 * Casual "Picadito & Amigos" engines: WhatsApp match lists, bench rotation
 * and recreational serve caps. Pure functions, no floats, no network — they
 * run 100% on device like every other VolleyOS engine.
 */

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";

/* ------------------------------------------------------------------ *
 * 1. WhatsApp list manager
 * ------------------------------------------------------------------ */

export type GearFlag = "ball" | "pump" | "court" | "water";

export const GEAR_FLAGS: GearFlag[] = ["ball", "pump", "court", "water"];

export const GEAR_EMOJI: Record<GearFlag, string> = {
  ball: "🏐",
  pump: "🪡",
  court: "🏟️",
  water: "💧",
};

export const GEAR_LABELS: Record<GearFlag, Record<Locale, string>> = {
  ball: {
    es: "🏐 Lleva Pelota",
    en: "🏐 Brings Ball",
    pt: "🏐 Leva Bola",
  },
  pump: {
    es: "🪡 Lleva Inflador + Pico",
    en: "🪡 Brings Pump + Needle",
    pt: "🪡 Leva Bomba + Agulha",
  },
  court: {
    es: "🏟️ Reservó el Turno",
    en: "🏟️ Booked the Slot",
    pt: "🏟️ Reservou o Horário",
  },
  water: {
    es: "💧 Lleva Agua/Hielo",
    en: "💧 Brings Water/Ice",
    pt: "💧 Leva Água/Gelo",
  },
};

export interface OrganizerPlayer {
  id: string;
  name: string;
  paid: boolean;
  gear: GearFlag[];
}

export interface OrganizerRoster {
  venue: string;
  time: string;
  capacity: number;
  confirmed: OrganizerPlayer[];
  waitlist: OrganizerPlayer[];
}

function playerId(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = playerId(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

/**
 * Smart parser for messy WhatsApp lists: "1. Tano, 2) Luci", bullets, one
 * name per line, semicolons — all accepted.
 */
export function parseWhatsAppList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((chunk) => chunk.replace(/^\s*(?:\d+(?:\s*[.)\-:]\s*|\s+)|[-•*]\s+)/, "").trim())
    .filter((name) => name.length > 0);
}

/** Splits parsed names into confirmed (up to capacity) and automatic waitlist. */
export function buildOrganizer(
  raw: string | string[],
  capacity: number,
  venue: string,
  time: string,
): OrganizerRoster {
  const names = dedupeNames(typeof raw === "string" ? parseWhatsAppList(raw) : raw);
  const cap = Number.isFinite(capacity) && capacity >= 1 ? Math.floor(capacity) : 1;
  const toPlayer = (name: string): OrganizerPlayer => ({ id: playerId(name), name, paid: false, gear: [] });
  return {
    venue: venue.trim() || "—",
    time: time.trim() || "—",
    capacity: cap,
    confirmed: names.slice(0, cap).map(toPlayer),
    waitlist: names.slice(cap).map(toPlayer),
  };
}

/** Manual one-by-one add; respects the cap by overflowing into the waitlist. */
export function addPlayer(roster: OrganizerRoster, name: string): OrganizerRoster {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return roster;
  const id = playerId(clean);
  if ([...roster.confirmed, ...roster.waitlist].some((player) => player.id === id)) return roster;
  const player: OrganizerPlayer = { id, name: clean, paid: false, gear: [] };
  return roster.confirmed.length < roster.capacity
    ? { ...roster, confirmed: [...roster.confirmed, player] }
    : { ...roster, waitlist: [...roster.waitlist, player] };
}

/**
 * "😱 Se bajó a último momento": removes a confirmed player and promotes
 * waitlist #1 into the main roster automatically.
 */
export function dropPlayer(
  roster: OrganizerRoster,
  id: string,
): { roster: OrganizerRoster; promoted: OrganizerPlayer | null } {
  const confirmed = roster.confirmed.filter((player) => player.id !== id);
  if (confirmed.length === roster.confirmed.length) return { roster, promoted: null };
  const waitlist = [...roster.waitlist];
  let promoted: OrganizerPlayer | null = null;
  if (confirmed.length < roster.capacity && waitlist.length > 0) {
    const candidate = waitlist.shift();
    if (candidate) {
      confirmed.push(candidate);
      promoted = candidate;
    }
  }
  return { roster: { ...roster, confirmed, waitlist }, promoted };
}

export function togglePaid(roster: OrganizerRoster, id: string): OrganizerRoster {
  const flip = (list: OrganizerPlayer[]): OrganizerPlayer[] =>
    list.map((player) => (player.id === id ? { ...player, paid: !player.paid } : player));
  return { ...roster, confirmed: flip(roster.confirmed), waitlist: flip(roster.waitlist) };
}

export function toggleGear(roster: OrganizerRoster, id: string, flag: GearFlag): OrganizerRoster {
  const flip = (list: OrganizerPlayer[]): OrganizerPlayer[] =>
    list.map((player) => {
      if (player.id !== id) return player;
      const gear = player.gear.includes(flag)
        ? player.gear.filter((value) => value !== flag)
        : [...player.gear, flag];
      return { ...player, gear };
    });
  return { ...roster, confirmed: flip(roster.confirmed), waitlist: flip(roster.waitlist) };
}

export function missingCount(roster: OrganizerRoster): number {
  return Math.max(0, roster.capacity - roster.confirmed.length);
}

/** "12 jugadores (6 vs 6)" / "18 jugadores (3 equipos)" capacity hint. */
export function capacityLabel(capacity: number, locale: Locale): string {
  const base = t(locale, `${capacity} jugadores`, `${capacity} players`, `${capacity} jogadores`);
  const teams = Math.ceil(capacity / 6);
  if (teams <= 1) return base;
  if (teams === 2) {
    const half = capacity / 2;
    const split = Number.isInteger(half) ? `${half} vs ${half}` : `${Math.ceil(half)} vs ${Math.floor(half)}`;
    return `${base} (${split})`;
  }
  return `${base} (${t(locale, `${teams} equipos`, `${teams} teams`, `${teams} times`)})`;
}

function playerFlags(player: OrganizerPlayer): string {
  return [player.paid ? "💸" : "", ...player.gear.map((flag) => GEAR_EMOJI[flag])].join("");
}

/** Clean emoji match sheet ready to paste into the WhatsApp group. */
export function formatMatchSheet(roster: OrganizerRoster, locale: Locale): string {
  const lines: string[] = [
    "🏐 PICADITO",
    `${roster.venue} · ${roster.time}`,
    "",
    t(
      locale,
      `✅ Confirmados (${roster.confirmed.length}/${roster.capacity})`,
      `✅ Confirmed (${roster.confirmed.length}/${roster.capacity})`,
      `✅ Confirmados (${roster.confirmed.length}/${roster.capacity})`,
    ),
  ];
  if (roster.confirmed.length === 0) lines.push("—");
  roster.confirmed.forEach((player, index) => {
    lines.push(`${index + 1}. ${player.name} ${playerFlags(player)}`.trimEnd());
  });
  lines.push("");
  if (roster.waitlist.length > 0) {
    lines.push(
      t(
        locale,
        `⏳ Lista de Espera (${roster.waitlist.length})`,
        `⏳ Waitlist (${roster.waitlist.length})`,
        `⏳ Lista de Espera (${roster.waitlist.length})`,
      ),
    );
    roster.waitlist.forEach((player) => lines.push(`• ${player.name} ${playerFlags(player)}`.trimEnd()));
    lines.push("");
  }
  const paid = roster.confirmed.filter((player) => player.paid).length;
  lines.push(
    t(
      locale,
      `💸 Seña/Pagó: ${paid}/${roster.confirmed.length}`,
      `💸 Deposit/Paid: ${paid}/${roster.confirmed.length}`,
      `💸 Sinal/Pagou: ${paid}/${roster.confirmed.length}`,
    ),
  );
  const missing = missingCount(roster);
  lines.push(
    missing > 0
      ? t(locale, `👉 Faltan ${missing} para completar`, `${missing} short of a full court`, `👉 Faltam ${missing} para completar`)
      : t(locale, "👉 ¡Cancha llena!", "👉 Full court!", "👉 Quadra cheia!"),
  );
  return lines.join("\n");
}

/** Urgent "we are short" poster; empty string when the court is complete. */
export function formatMissingBanner(roster: OrganizerRoster, locale: Locale): string {
  const missing = missingCount(roster);
  if (missing <= 0) return "";
  const venue = roster.venue.toUpperCase();
  return t(
    locale,
    `🚨 ¡NOS ${missing === 1 ? "FALTA 1" : `FALTAN ${missing}`} PARA HOY A LAS ${roster.time} EN ${venue}! ¿Quién se suma?`,
    `🚨 WE'RE ${missing} SHORT FOR TODAY AT ${roster.time} AT ${venue}! Who's in?`,
    `🚨 ${missing === 1 ? "FALTA 1" : `FALTAM ${missing}`} PARA HOJE ÀS ${roster.time} EM ${venue}! Quem entra?`,
  );
}

/* ------------------------------------------------------------------ *
 * 2. Bench rotator for 7-10 player teams
 * ------------------------------------------------------------------ */

export type BenchEntry = "serve" | "back";
export type CourtZones = [string, string, string, string, string, string];

export interface BenchSwap {
  entering: string;
  exiting: string;
  entry: BenchEntry;
  zone: 1 | 6;
}

export interface BenchTeamState {
  /** Index 0 = Position I (serve) … index 5 = Position VI (back). */
  court: CourtZones;
  /** FIFO queue of players waiting to come in. */
  bench: string[];
  entry: BenchEntry;
  /** Rotations each player has completed on court (fair play-time). */
  rotations: Record<string, number>;
  lastSwap: BenchSwap | null;
}

/**
 * Loads a 7-10 player squad: first six start on court, the rest queue on the
 * bench. Throws coded `bench_size` when out of range.
 */
export function newBenchTeam(names: string[], entry: BenchEntry): BenchTeamState {
  const clean = dedupeNames(names);
  if (clean.length < 7 || clean.length > 10) throw new Error("bench_size");
  const rotations: Record<string, number> = {};
  for (const name of clean) rotations[name] = 0;
  return {
    court: [clean[0] as string, clean[1] as string, clean[2] as string, clean[3] as string, clean[4] as string, clean[5] as string],
    bench: clean.slice(6),
    entry,
    rotations,
    lastSwap: null,
  };
}

/**
 * One side-out (or manual "🔄 Rotar con el Banco"): the six court zones
 * rotate one position clockwise AND the next bench player swaps in at the
 * chosen entry spot, sending the displaced player to the back of the queue.
 * Every on-court player earns +1 rotation so nobody sits out twice.
 */
export function rotateWithBench(state: BenchTeamState): BenchTeamState {
  const rotated: CourtZones = [state.court[1], state.court[2], state.court[3], state.court[4], state.court[5], state.court[0]];
  const rotations = { ...state.rotations };
  // The six who just played the stint earn their rotation BEFORE the swap,
  // so the player heading to the bench is credited for the time on court.
  for (const name of rotated) rotations[name] = (rotations[name] ?? 0) + 1;
  const queue = [...state.bench];
  const entering = queue.shift();
  if (entering === undefined) return { ...state, court: rotated, bench: queue, rotations, lastSwap: null };
  const court = [...rotated] as CourtZones;
  let exiting: string;
  if (state.entry === "serve") {
    exiting = court[0];
    court[0] = entering;
  } else {
    exiting = court[5];
    court[5] = entering;
  }
  return {
    ...state,
    court,
    bench: [...queue, exiting],
    rotations,
    lastSwap: { entering, exiting, entry: state.entry, zone: state.entry === "serve" ? 1 : 6 },
  };
}

/** Fair play-time table, most court rotations first. */
export function benchFairness(state: BenchTeamState): Array<{ name: string; rotations: number }> {
  return [...state.court, ...state.bench]
    .map((name) => ({ name, rotations: state.rotations[name] ?? 0 }))
    .sort((a, b) => b.rotations - a.rotations || a.name.localeCompare(b.name));
}

export function benchSwapMessage(swap: BenchSwap, locale: Locale): string {
  const spot =
    swap.entry === "serve"
      ? t(locale, "al Saque", "to Serve", "ao Saque")
      : t(locale, "al Fondo", "to the Back", "ao Fundo");
  return t(
    locale,
    `➡️ ENTRA DEL BANCO: ${swap.entering} (${spot}) · 🪑 SALE A DESCANSAR: ${swap.exiting}`,
    `➡️ BENCH IN: ${swap.entering} (${spot}) · 🪑 RESTING OUT: ${swap.exiting}`,
    `➡️ ENTRA DO BANCO: ${swap.entering} (${spot}) · 🪑 SAI PRA DESCANSAR: ${swap.exiting}`,
  );
}

/* ------------------------------------------------------------------ *
 * 3. Recreational consecutive-serve cap
 * ------------------------------------------------------------------ */

export type ServeCapLimit = 0 | 3 | 5;

/** Consecutive points scored by the team currently on serve. */
export function nextServeStreak(current: number, scoredByServingTeam: boolean): number {
  return scoredByServingTeam ? current + 1 : 0;
}

export function serveCapHit(streak: number, cap: ServeCapLimit): boolean {
  return cap > 0 && streak >= cap;
}

/** Friendly banner when one server runs the game: streak resets, serve stays. */
export function serveCapMessage(cap: ServeCapLimit, locale: Locale): string {
  return t(
    locale,
    `🤝 ¡${cap} Saques seguidos! Rotación amistosa de sacador (tu equipo conserva el saque)`,
    `🤝 ${cap} serves in a row! Friendly server rotation (your team keeps the serve)`,
    `🤝 ${cap} saques seguidos! Rotação amistosa de sacador (seu time mantém o saque)`,
  );
}

/* ------------------------------------------------------------------ *
 * 4. El Juez del Picadito (dispute arbiter)
 * ------------------------------------------------------------------ */

export type JudgeDispute = "foot" | "lift" | "finger" | "double" | "net";

export const JUDGE_DISPUTES: Record<JudgeDispute, {
  icon: string;
  call: Record<Locale, string>;
  question: Record<Locale, string>;
  rule: Record<Locale, string>;
}> = {
  foot: {
    icon: "🦶",
    call: { es: "ROQUETA (pie sobre la línea)", en: "FOOT FAULT (foot on the line)", pt: "ROQUETA (pé na linha)" },
    question: {
      es: "¿El sacador pisó la línea antes de golpear?",
      en: "Did the server step on the line before contact?",
      pt: "O sacador pisou a linha antes de bater?",
    },
    rule: {
      es: "Regla: el pie no cruza la línea hasta que la pelota está en juego.",
      en: "Rule: the foot may not cross the line until the ball is in play.",
      pt: "Regra: o pé não cruza a linha antes de a bola entrar em jogo.",
    },
  },
  lift: {
    icon: "✋",
    call: { es: "MANO DURA (levante)", en: "LIFT (held ball)", pt: "MANO DURA (sustentação)" },
    question: {
      es: "¿La pelota se quedó un instante en los brazos?",
      en: "Did the ball rest in the arms for a moment?",
      pt: "A bola ficou um instante nos braços?",
    },
    rule: {
      es: "Regla: la recepción no puede retener ni lanzar la pelota.",
      en: "Rule: the reception may not catch or throw the ball.",
      pt: "Regra: a recepção não pode segurar nem lançar a bola.",
    },
  },
  finger: {
    icon: "👆",
    call: { es: "DEDO (impulso con dedos)", en: "FINGER SET on first contact", pt: "DEDO (toque com impulso)" },
    question: {
      es: "¿Hubo impulso con los dedos en la primera recepción?",
      en: "Was there a finger set on the first contact?",
      pt: "Houve toque com dedos no primeiro recebimento?",
    },
    rule: {
      es: "Regla: en la 1ª recepción los dedos no pueden empujar; solo contactar.",
      en: "Rule: on first contact fingers may only contact, never push.",
      pt: "Regra: no 1º recebimento os dedos só contactam, nunca empurram.",
    },
  },
  double: {
    icon: "🔄",
    call: { es: "DOBLE TOQUE", en: "DOUBLE CONTACT", pt: "DOIS TOQUES" },
    question: {
      es: "¿El mismo jugador tocó dos veces seguidas?",
      en: "Did the same player contact it twice in a row?",
      pt: "O mesmo jogador tocou duas vezes seguidas?",
    },
    rule: {
      es: "Regla: nadie toca dos veces seguidas (salvo bloqueo o 1ª recepción).",
      en: "Rule: no player may contact twice consecutively (except block or first contact).",
      pt: "Regra: ninguém toca duas vezes seguidas (exceto bloqueio ou 1º recebimento).",
    },
  },
  net: {
    icon: "🕸️",
    call: { es: "RED", en: "NET TOUCH", pt: "REDE" },
    question: {
      es: "¿Tocó la red durante el remate o el bloqueo?",
      en: "Did they touch the net during the attack or block?",
      pt: "Tocou a rede no ataque ou no bloqueio?",
    },
    rule: {
      es: "Regla: tocar la red en el rally es falta; el punto es del rival.",
      en: "Rule: touching the net during the rally is a fault; the point goes to the opponent.",
      pt: "Regra: tocar a rede no rally é falta; o ponto vai para o adversário.",
    },
  },
};

export interface JudgeVerdict {
  winner: "A" | "B";
  text: string;
}

/**
 * The captains agree on the observable (`fact`); the accused team is the one
 * alleged to have committed the fault. Confirmed -> point to the other team,
 * denied -> the point stays where it was.
 */
export function judgeVerdict(
  dispute: JudgeDispute,
  fact: boolean,
  accused: "A" | "B",
  locale: Locale,
): JudgeVerdict {
  const spec = JUDGE_DISPUTES[dispute];
  const winner: "A" | "B" = fact ? (accused === "A" ? "B" : "A") : accused;
  const head = fact
    ? `${spec.icon} ${t(locale, "✅ Falta confirmada", "✅ Foul confirmed", "✅ Falta confirmada")}`
    : `${spec.icon} ${t(locale, "❌ Sin falta", "❌ No foul", "❌ Sem falta")}`;
  const tail = fact
    ? t(locale, `Punto para el equipo ${winner}.`, `Point to team ${winner}.`, `Ponto para o time ${winner}.`)
    : t(
        locale,
        `La acusación no va: el punto se queda con el equipo ${accused}.`,
        `The accusation drops: the point stays with team ${accused}.`,
        `A acusação cai: o ponto fica com o time ${accused}.`,
      );
  return { winner, text: `${head} — ${spec.call[locale]}. ${tail}` };
}

/* ------------------------------------------------------------------ *
 * 5. Traductor de Señas y Gritos (court cries)
 * ------------------------------------------------------------------ */

export type CryCategory = "attack" | "defense" | "receive" | "captain";

export interface CourtCry {
  id: string;
  cat: CryCategory;
  es: string;
  en: string;
  pt: string;
  when: Record<Locale, string>;
}

export const COURT_CRIES: CourtCry[] = [
  {
    id: "mia",
    cat: "attack",
    es: "¡Mía!",
    en: "Mine!",
    pt: "Minha!",
    when: {
      es: "La pelota cae en medio y nadie la había llamado.",
      en: "The ball drops between players and nobody called it.",
      pt: "A bola cai no meio e ninguém chamou.",
    },
  },
  {
    id: "tuya",
    cat: "attack",
    es: "¡Tuya!",
    en: "Yours!",
    pt: "Sua!",
    when: {
      es: "Cedés el balón antes de chocar con tu compañera.",
      en: "You hand the ball over before you collide.",
      pt: "Você cede a bola antes da colisão.",
    },
  },
  {
    id: "fuera",
    cat: "defense",
    es: "¡Fuera!",
    en: "Out!",
    pt: "Fora!",
    when: {
      es: "El remate sale por la línea lateral.",
      en: "The attack flies past the sideline.",
      pt: "O ataque sai pela linha lateral.",
    },
  },
  {
    id: "dejala",
    cat: "defense",
    es: "¡Déjala!",
    en: "Leave it!",
    pt: "Deixa!",
    when: {
      es: "Vuela fuera: si la tocás, es tuya.",
      en: "It is going out: touching it makes it yours.",
      pt: "Está saindo: se tocar, é sua.",
    },
  },
  {
    id: "rodizio",
    cat: "captain",
    es: "¡Rotación!",
    en: "Rotate!",
    pt: "Rodízio!",
    when: {
      es: "Punto ganado: todos una posición en sentido horario.",
      en: "Point won: everyone shifts one spot clockwise.",
      pt: "Ponto ganado: todo mundo muda um lugar.",
    },
  },
  {
    id: "cambio",
    cat: "captain",
    es: "¡Cambio!",
    en: "Switch!",
    pt: "Troca!",
    when: {
      es: "Rotación confusa: reordenáis los puestos al vuelo.",
      en: "Confused rotation: fix positions on the fly.",
      pt: "Rodízio confuso: reordene as posições.",
    },
  },
  {
    id: "tiempo",
    cat: "captain",
    es: "¡Tiempo!",
    en: "Time out!",
    pt: "Tempo!",
    when: {
      es: "Pausa corta para rearmar el plan del set.",
      en: "Short pause to reset the set plan.",
      pt: "Pausa curta para rearmar o plano do set.",
    },
  },
  {
    id: "sacavos",
    cat: "captain",
    es: "¡Sacá vos!",
    en: "You serve!",
    pt: "Você saca!",
    when: {
      es: "Rotación incómoda: cedés el saque al mejor del equipo.",
      en: "Awkward rotation: give the serve to your best server.",
      pt: "Rotação desconfortável: passe o saque ao melhor.",
    },
  },
  {
    id: "volea",
    cat: "attack",
    es: "¡Volea!",
    en: "Volley!",
    pt: "Voleio!",
    when: {
      es: "Remate directo desde la red, sin recepción.",
      en: "Direct hit at the net, no reception involved.",
      pt: "Ataque direto na rede, sem recepção.",
    },
  },
  {
    id: "linea",
    cat: "defense",
    es: "¡En la línea!",
    en: "On the line!",
    pt: "Na linha!",
    when: {
      es: "Avisás que cae justo en el borde de la línea.",
      en: "Calling it as it lands right on the edge.",
      pt: "Chamando quando cai exatamente na borda.",
    },
  },
  {
    id: "red",
    cat: "defense",
    es: "¡Red!",
    en: "Net!",
    pt: "Rede!",
    when: {
      es: "Roce de red del rival: señalá al árbitro al instante.",
      en: "Opponent net touch: show the referee right away.",
      pt: "Toque de rede do adversário: sinalize na hora.",
    },
  },
  {
    id: "libero",
    cat: "receive",
    es: "¡Líbero!",
    en: "Libero!",
    pt: "Líbero!",
    when: {
      es: "Cedés la recepción a la especialista de la rotación.",
      en: "Hand the reception to the rotation specialist.",
      pt: "Entregue a recepção à especialista da rotação.",
    },
  },
];

/** Lowercase + strip accents so "mia" finds "¡Mía!" in any language. */
function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Accent-insensitive lookup across ES/EN/PT shouts; empty query lists all. */
export function translateCry(query: string): CourtCry[] {
  const needle = fold(query.trim());
  if (!needle) return COURT_CRIES;
  return COURT_CRIES.filter((cry) =>
    fold(`${cry.es} ${cry.en} ${cry.pt} ${cry.when.es} ${cry.when.en} ${cry.when.pt}`).includes(needle),
  );
}

/* ------------------------------------------------------------------ *
 * 6. Entrada en Calor Express de 4 Minutos
 * ------------------------------------------------------------------ */

export interface WarmupPhase {
  start: number;
  end: number;
  icon: string;
  es: string;
  en: string;
  pt: string;
}

export const WARMUP_TOTAL_SECONDS = 240;

export const WARMUP_PHASES: WarmupPhase[] = [
  {
    start: 0,
    end: 30,
    icon: "🫀",
    es: "Pulso y movilidad: cuello, hombros, muñecas, tobillos",
    en: "Pulse and mobility: neck, shoulders, wrists, ankles",
    pt: "Pulso e mobilidade: pescoço, ombros, punhos, tornozelos",
  },
  {
    start: 30,
    end: 90,
    icon: "🏃",
    es: "Activación: desplazamientos laterales y pasos C",
    en: "Activation: side shuffles and C-steps",
    pt: "Ativação: deslizes laterais e passos C",
  },
  {
    start: 90,
    end: 180,
    icon: "🦘",
    es: "Rebote: enfoques, saltos de ataque y de bloqueo",
    en: "Bounce: approaches, attack and block jumps",
    pt: "Rebote: aproximações, saltos de ataque e de bloqueio",
  },
  {
    start: 180,
    end: 240,
    icon: "🏐",
    es: "Colocación y remate suave al vacío",
    en: "Setting and soft swings into the air",
    pt: "Colocação e golpe suave no ar",
  },
];

export function warmupPhaseAt(elapsed: number): WarmupPhase {
  const seconds = Math.max(0, Math.min(WARMUP_TOTAL_SECONDS, Math.floor(elapsed)));
  return WARMUP_PHASES.find((phase) => seconds < phase.end) ?? WARMUP_PHASES[WARMUP_PHASES.length - 1]!;
}

export function warmupClock(elapsed: number): string {
  const seconds = Math.max(0, Math.min(WARMUP_TOTAL_SECONDS, Math.floor(elapsed)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ *
 * 7. La Vaquita 2.0 Compensada (settlement, integer cents only)
 * ------------------------------------------------------------------ */

/** Strict amount parser: "1000", "1000.50" and "1000,50" -> integer cents. */
export function parseCents(raw: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(raw.trim());
  if (!match) return null;
  const units = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  const cents = units * 100 + Number(frac || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Money formatting with zero float arithmetic: "$1,234.56". */
export function formatCents(cents: number): string {
  const abs = Math.abs(Math.trunc(cents));
  const sign = cents < 0 ? "-" : "";
  const units = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${units.toLocaleString("en-US")}.${frac}`;
}

export interface VaquitaLine {
  id: string;
  name: string;
  entryCents: number;
  creditCents: number;
  /** entry minus gear compensation; positive = owes, negative = refund. */
  netCents: number;
  owesCents: number;
  getsBackCents: number;
  alreadyPaidCents: number;
  status: "pays" | "settled" | "refund";
}

export interface VaquitaReport {
  lines: VaquitaLine[];
  potCents: number;
  incomingCents: number;
  payoutCents: number;
  shortfallCents: number;
  summary: string;
}

/**
 * La Vaquita 2.0: everyone owes the entry fee, gear carriers are compensated
 * from the pot (credit offsets the fee first, anything left is paid back),
 * and players who already handed cash are marked settled. Integer cents only
 * — non-integer input throws the coded `vaquita_amount` error.
 */
export function settleVaquita(
  players: OrganizerPlayer[],
  feeCents: number,
  potCents: number,
  credits: Partial<Record<GearFlag, number>>,
  locale: Locale,
): VaquitaReport {
  const creditValues = GEAR_FLAGS.map((flag) => credits[flag] ?? 0);
  const amounts = [feeCents, potCents, ...creditValues];
  if (amounts.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("vaquita_amount");

  const lines: VaquitaLine[] = players.map((player) => {
    const credit = GEAR_FLAGS.reduce(
      (sum, flag) => sum + (player.gear.includes(flag) ? credits[flag] ?? 0 : 0),
      0,
    );
    const net = feeCents - credit;
    const getsBack = Math.max(0, -net);
    const stillOwes = player.paid ? 0 : Math.max(0, net);
    const alreadyPaid = player.paid ? Math.max(0, net) : 0;
    const status: VaquitaLine["status"] = getsBack > 0 ? "refund" : stillOwes > 0 ? "pays" : "settled";
    return {
      id: player.id,
      name: player.name,
      entryCents: feeCents,
      creditCents: credit,
      netCents: net,
      owesCents: stillOwes,
      getsBackCents: getsBack,
      alreadyPaidCents: alreadyPaid,
      status,
    };
  });

  const incomingCents = lines.reduce((sum, line) => sum + line.owesCents, 0);
  const payoutCents = lines.reduce((sum, line) => sum + line.getsBackCents, 0);
  const shortfallCents = Math.max(0, payoutCents - (potCents + incomingCents));
  const summary =
    shortfallCents > 0
      ? t(
          locale,
          `⚠️ Faltan ${formatCents(shortfallCents)} en la caja para pagar los premios.`,
          `⚠️ ${formatCents(shortfallCents)} short in the pot to pay the prizes.`,
          `⚠️ Faltam ${formatCents(shortfallCents)} no caixa para pagar os prêmios.`,
        )
      : t(
          locale,
          `💳 Entran ${formatCents(incomingCents)} · 💰 La caja devuelve ${formatCents(payoutCents)} · ✅ todo cubierto`,
          `💳 ${formatCents(incomingCents)} coming in · 💰 the pot pays back ${formatCents(payoutCents)} · ✅ all covered`,
          `💳 Entram ${formatCents(incomingCents)} · 💰 a caixa devolve ${formatCents(payoutCents)} · ✅ tudo coberto`,
        );
  return { lines, potCents, incomingCents, payoutCents, shortfallCents, summary };
}

/* ------------------------------------------------------------------ *
 * 8. Premios del Picadito (shareable prize poster)
 * ------------------------------------------------------------------ */

export interface PrizePosterInput {
  locale: Locale;
  champion: string;
  potCents: number;
  runnerUp?: string;
  mvp?: string;
  date: string;
  venue?: string;
  /** Golden 👑 Patrocinador badge stamped by a redeemed VOS-CHIP. */
  supporter?: boolean;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Static SVG prize poster: every user string is XML-escaped. */
export function buildPrizePoster(input: PrizePosterInput): string {
  const esc = escapeXml;
  const title = t(input.locale, "🏆 PREMIOS DEL PICADITO", "🏆 PICKUP PRIZES", "🏆 PRÊMIOS DA RACHINHA");
  const champLabel = t(input.locale, "CAMPEÓN", "CHAMPION", "CAMPEÃO");
  const prizeLabel = t(input.locale, "PREMIO", "PRIZE", "PRÊMIO");
  const runnerLabel = t(input.locale, "SUBCAMPEÓN", "RUNNER-UP", "VICE-CAMPEÃO");
  const mvpLabel = t(input.locale, "MVP DEL DÍA", "MVP OF THE DAY", "MVP DO DIA");

  const blocks: string[] = [];
  let y = 150;
  const label = (text: string): void => {
    blocks.push(
      `<text x="360" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" letter-spacing="4" fill="#8A8A99">${esc(text)}</text>`,
    );
    y += 30;
  };
  const value = (text: string, size: number, fill: string): void => {
    blocks.push(
      `<text x="360" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${size}" fill="${fill}">${esc(text)}</text>`,
    );
    y += size + 34;
  };

  label(champLabel);
  value(input.champion, 46, "#EAB308");
  label(prizeLabel);
  value(formatCents(input.potCents), 34, "#FFFFFF");
  if (input.runnerUp) {
    label(runnerLabel);
    value(input.runnerUp, 24, "#C9C9D4");
  }
  if (input.mvp) {
    label(mvpLabel);
    value(input.mvp, 24, "#FF3B5C");
  }

  const footer = [input.date, input.venue, "VolleyOS"].filter((part) => part && part.trim().length > 0).join(" · ");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" width="720" height="540" role="img">`,
    `<rect width="720" height="540" fill="#0B0B0F"/>`,
    `<rect width="720" height="6" fill="#FF3B5C"/>`,
    `<text x="360" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="30" fill="#FF3B5C">${esc(title)}</text>`,
    `<line x1="180" y1="96" x2="540" y2="96" stroke="#2A2A33" stroke-width="2"/>`,
    ...blocks,
    ...(input.supporter
      ? [
          `<text x="360" y="484" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="14" letter-spacing="3" fill="#FACC15">👑 PATROCINADOR OFICIAL</text>`,
        ]
      : []),
    `<text x="360" y="514" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#6B6B78">${esc(footer)}</text>`,
    `</svg>`,
  ].join("");
}
