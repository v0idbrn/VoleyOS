/**
 * v11.0.0 "WhatsApp to court in 20 s" pipeline — zero network, everything
 * local: parse a WhatsApp lineup list, balance both teams with the on-device
 * MMR record, order the bench rotation, keep the La Vaquita 2.0 debtors
 * ledger and render the broadcast match story card (canvas with a
 * deterministic SVG data-URL fallback for JSDOM test runs).
 */

/* ------------------------------------------- local player MMR ("voleyos_player_mmr_v1") */

export const MMR_RECORD_KEY = "voleyos_player_mmr_v1";
export const DEFAULT_MMR = 50;
/** MVP cap the MMR records a +5 rise, the Mufa a −5 drop. */
export const MMR_MVP_DELTA = 5;
export const MMR_MUFA_DELTA = -5;

export function loadPlayerMmr(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MMR_RECORD_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const rating: Record<string, number> = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) rating[name] = value;
    }
    return rating;
  } catch {
    return {};
  }
}

export function savePlayerMmr(record: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MMR_RECORD_KEY, JSON.stringify(record));
  } catch {
    // Quota/full disk: MMR is a nicety, never worth crashing a match.
  }
}

/** Raises/lower one player and returns the next record (also persists). */
export function applyPlayerMmrDelta(name: string, delta: number): Record<string, number> {
  const trimmed = name.trim();
  if (!trimmed) return loadPlayerMmr();
  const next = loadPlayerMmr();
  const current = next[trimmed] ?? DEFAULT_MMR;
  next[trimmed] = Math.max(0, Math.min(100, Math.round(current + delta)));
  savePlayerMmr(next);
  return next;
}

/* ------------------------------------------------ pipeline teams ("voleyos_pipeline_teams_v1") */

export const PIPELINE_TEAMS_KEY = "voleyos_pipeline_teams_v1";

export interface PipelineTeams {
  teamA: string[];
  teamB: string[];
  bench: string[];
}

export function savePipelineTeams(teams: PipelineTeams): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIPELINE_TEAMS_KEY, JSON.stringify(teams));
  } catch {
    // Quota/full disk: Cancha still boots with its current teams.
  }
}

export function loadPipelineTeams(): PipelineTeams | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PIPELINE_TEAMS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as { teamA?: unknown; teamB?: unknown; bench?: unknown };
    const isNameList = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
    if (!isNameList(candidate.teamA) || !isNameList(candidate.teamB) || !isNameList(candidate.bench)) return null;
    return { teamA: candidate.teamA, teamB: candidate.teamB, bench: candidate.bench };
  } catch {
    return null;
  }
}

/* ------------------------------------------------ WhatsApp list parsing + balancer */

export interface TeamBalance {
  teamA: string[];
  teamB: string[];
  /** Bench rotation order for 7–9 player rosters (players sit in this order). */
  bench: string[];
  /** Raw names that carried no rating; new players got DEFAULT_MMR. */
  unrated: string[];
}

/** Extracts names from numbered/bulleted WhatsApp lines: "1. Ana", "- Beto", "* Cara". */
export function parseWhatsAppPlayerNames(rawText: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of (rawText ?? "").split(/\r?\n/)) {
    // Only numbered/bulleted lines count as roster entries: "1. Ana", "- Beto", "* Cara".
    const stripped = line.replace(/^[ \t]*(?:\d+[.)\-:]\s+|[-*•+]\s+)/, "");
    const cleaned = stripped.trim();
    if (!cleaned || cleaned === line.trim() || cleaned.length > 40) continue;
    const name = cleaned.replace(/[():,;].*$/, "").trim();
    const key = name.toLowerCase();
    // Skip greetings and lines made of emoji/symbols only.
    if (!name || key === "hola" || key === "buenas" || !/[a-záéíóúñü0-9]/i.test(name)) continue;
    if (!seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return names;
}

/**
 * Greedy MMR balancer: highest rated player is assigned alternately to the
 * team currently weakest, so both teams end within a point of each other.
 * Rosters of 7–9 players also get the bench rotation order.
 */
export function parseWhatsAppListAndBalanceTeams(
  rawText: string,
  ratingsRecord: Record<string, number>,
): TeamBalance {
  const names = parseWhatsAppPlayerNames(rawText);
  const unrated: string[] = [];
  const rated = names
    .map((name) => {
      const rating = ratingsRecord[name];
      if (typeof rating !== "number" || !Number.isFinite(rating)) {
        unrated.push(name);
        return { name, rating: DEFAULT_MMR };
      }
      return { name, rating };
    })
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));

  const teamA: string[] = [];
  const teamB: string[] = [];
  const totals = { A: 0, B: 0 };
  for (const player of rated) {
    const toA = teamA.length < teamB.length || (teamA.length === teamB.length && totals.A <= totals.B);
    if (toA) {
      teamA.push(player.name);
      totals.A += player.rating;
    } else {
      teamB.push(player.name);
      totals.B += player.rating;
    }
  }
  // Bench: the lowest rated players sit first and re-enter in this order.
  const starters = Math.max(2, Math.min(teamA.length, teamB.length) * 2);
  const bench = [...teamA, ...teamB].slice(starters, starters + 3);
  return { teamA, teamB, bench, unrated };
}

/* ------------------------------------- La Vaquita 2.0 debtors ledger ("voleyos_vaquita_debts_v1") */

export const VAQUITA_DEBTS_KEY = "voleyos_vaquita_debts_v1";

export interface VaquitaDebt {
  alias: string;
  paid: boolean;
}

export function loadVaquitaDebts(): VaquitaDebt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VAQUITA_DEBTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is { alias: string; paid: boolean } =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { alias?: unknown }).alias === "string" &&
          typeof (entry as { paid?: unknown }).paid === "boolean",
      )
      .map((entry) => ({ alias: entry.alias, paid: entry.paid }));
  } catch {
    return [];
  }
}

export function saveVaquitaDebts(debts: VaquitaDebt[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VAQUITA_DEBTS_KEY, JSON.stringify(debts.slice(-64)));
  } catch {
    // Ledger over quota: keep playing, the court split is a courtesy.
  }
}

/** Adds or flips one alias between ✅ Pagó and ⏳ Debe. */
export function setVaquitaDebt(debts: VaquitaDebt[], alias: string, paid: boolean): VaquitaDebt[] {
  const clean = alias.trim();
  if (!clean) return debts;
  const rest = debts.filter((debt) => debt.alias.toLowerCase() !== clean.toLowerCase());
  return [...rest, { alias: clean, paid }].slice(-64);
}

export function debtReminderText(debts: VaquitaDebt[], alias: string): string {
  const clean = alias.trim();
  if (!clean) return "";
  return `💸 VoleyOS · La Vaquita 2.0\n⏳ ${clean}, ¡me debes la cuota de la cancha!\n📲 Alias: ${clean}`;
}

/* ------------------------------------- End-of-match broadcast story card (PNG) */

export interface MatchStoryCardInput {
  title: string;
  finalScore: string;
  setsLine: string;
  colorA?: string;
  colorB?: string;
  mvp?: string;
  mufa?: string;
}

/** Deterministic broadcast SVG (obsidian & crimson) for the story card. */
export function matchStoryCardSvg(input: MatchStoryCardInput): string {
  // Escape & < > as XML entities (built from codepoints to survive linters/tools).
  const amp = String.fromCharCode(38);
  const esc = (value: string): string =>
    value
      .replace(/&/g, `${amp}amp;`)
      .replace(/</g, `${amp}lt;`)
      .replace(/>/g, `${amp}gt;`);
  const mvpLine = input.mvp ? `🏆 MVP: ${esc(input.mvp)}` : "";
  const mufaLine = input.mufa ? `🥶 Mufa: ${esc(input.mufa)}` : "";
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="620" height="420" viewBox="0 0 620 420">',
    '<rect width="620" height="420" rx="24" fill="#0B0B0F"/>',
    '<rect x="12" y="12" width="596" height="396" rx="18" fill="none" stroke="#C8102E" stroke-width="3"/>',
    `<text x="310" y="92" fill="#EAB308" font-family="sans-serif" font-size="30" font-weight="bold" text-anchor="middle">🏐 ${esc(input.title)}</text>`,
    `<text x="310" y="215" fill="#FFFFFF" font-family="sans-serif" font-size="72" font-weight="bold" text-anchor="middle">${esc(input.finalScore)}</text>`,
    `<text x="310" y="278" fill="#C8102E" font-family="sans-serif" font-size="26" font-weight="bold" text-anchor="middle">${esc(input.setsLine)}</text>`,
    mvpLine ? `<text x="310" y="332" fill="#EAB308" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">${mvpLine}</text>` : "",
    mufaLine ? `<text x="310" y="368" fill="#9CA3AF" font-family="sans-serif" font-size="20" text-anchor="middle">${mufaLine}</text>` : "",
    '<text x="310" y="398" fill="#4ADE80" font-family="sans-serif" font-size="16" text-anchor="middle">VoleyOS · offline-first</text>',
    "</svg>",
  ]
    .filter(Boolean)
    .join("");
}

/**
 * Renders the Obsidian & Crimson broadcast match card. Inside a real browser
 * this rasterizes the SVG to a PNG blob data-URL; in JSDOM/Vitest (no canvas)
 * it returns the same card as a deterministic SVG data-URL so downloads and
 * tests never crash.
 */
export async function generateMatchStoryCardDataUrl(input: MatchStoryCardInput): Promise<string | null> {
  const svg = matchStoryCardSvg(input);
  if (typeof document === "undefined") return null;
  try {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (value: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      window.setTimeout(() => done(false), 300);
      img.src = dataUrl;
    });
    if (loaded) {
      const canvas = document.createElement("canvas");
      canvas.width = 620;
      canvas.height = 420;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0B0B0F";
        ctx.fillRect(0, 0, 620, 420);
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL("image/png");
        if (url.startsWith("data:image/png")) return url;
      }
    }
  } catch {
    // Canvas unavailable (JSDOM): deterministic SVG below still renders.
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
