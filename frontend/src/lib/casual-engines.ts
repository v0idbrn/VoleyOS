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
