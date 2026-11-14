/**
 * v11.3.4 — Offline saved teams vault + active court rosters.
 *
 * Everything lives in localStorage so the vault survives a reload, works on a
 * plane, and never leaves the phone. Every write dispatches `voleyos-teams-sync`
 * so the Scoreboard, the Giant Gym Screen, the tactical boards and the pickup
 * balancer all re-read the same snapshot.
 */

export const SAVED_TEAMS_KEY = "voleyos_saved_teams_v1";
export const ACTIVE_ROSTERS_KEY = "voleyos_active_rosters_v1";
export const TEAMS_SYNC_EVENT = "voleyos-teams-sync";

export const SAVED_TEAMS_LIMIT = 30;

export type TeamMode = "6p" | "7p";

export interface SavedTeamPreset {
  id: string;
  name: string;
  color: string;
  mode: TeamMode;
  players: string[];
  updatedAt: number;
}

export interface ActiveCourtRosters {
  teamA: string;
  teamB: string;
  colorA: string;
  colorB: string;
  rosterA: string[];
  rosterB: string[];
  modeA: TeamMode;
  modeB: TeamMode;
}

export const DEFAULT_TEAM_COLOR_A = "#e11d48";
export const DEFAULT_TEAM_COLOR_B = "#3b82f6";

const hasWindow = (): boolean => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/** Trims labels, drops blanks, caps the roster and pads with J1..Jn. */
export function fillRoster(labels: unknown, size: 6 | 7): string[] {
  const source = Array.isArray(labels) ? labels : [];
  const cleaned = source
    .map((label) => (typeof label === "string" ? label.trim() : String(label ?? "").trim()))
    .filter((label) => label.length > 0)
    .slice(0, size);
  const roster = [...cleaned];
  for (let index = roster.length; index < size; index += 1) {
    roster.push(`J${index + 1}`);
  }
  return roster;
}

const rosterSize = (mode: TeamMode): 6 | 7 => (mode === "7p" ? 7 : 6);

function normalizeMode(mode: unknown): TeamMode {
  return mode === "7p" ? "7p" : "6p";
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "equipo";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep the session usable */
  }
}

function dispatchSync(): void {
  if (!hasWindow() || typeof window.dispatchEvent !== "function") return;
  try {
    window.dispatchEvent(new CustomEvent(TEAMS_SYNC_EVENT));
  } catch {
    /* older webviews */
  }
}

function sanitizePreset(value: unknown): SavedTeamPreset | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<SavedTeamPreset> & Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length === 0) return null;
  const mode = normalizeMode(raw.mode);
  return {
    id: typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : slugify(name),
    name,
    color: typeof raw.color === "string" && raw.color.trim().length > 0 ? raw.color.trim() : DEFAULT_TEAM_COLOR_A,
    mode,
    players: fillRoster(raw.players, rosterSize(mode)),
    updatedAt: typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  };
}

/** Reads the vault, newest first. Never throws. */
export function loadSavedTeams(): SavedTeamPreset[] {
  const stored = readJson<unknown>(SAVED_TEAMS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .map(sanitizePreset)
    .filter((preset): preset is SavedTeamPreset => preset !== null)
    .slice(0, SAVED_TEAMS_LIMIT);
}

/**
 * Upserts a preset by id (or by case-insensitive name), fills missing roster
 * slots, caps the vault at 30 teams and returns the fresh list.
 */
export function saveTeamPreset(input: {
  id?: string;
  name: string;
  color?: string;
  mode: TeamMode;
  players: string[];
}): SavedTeamPreset[] {
  const name = (input.name ?? "").trim();
  if (name.length === 0) return loadSavedTeams();
  const mode = normalizeMode(input.mode);
  const existing = loadSavedTeams();
  const wantedId = (input.id ?? "").trim();
  const lower = name.toLowerCase();
  const previous = existing.find(
    (preset) => (wantedId.length > 0 && preset.id === wantedId) || preset.name.toLowerCase() === lower,
  );
  // Matching by name (case-insensitive) keeps the stored spelling; an explicit
  // id is a real rename.
  const displayName = previous && wantedId.length === 0 ? previous.name : name;
  const preset: SavedTeamPreset = {
    id: previous?.id ?? (wantedId.length > 0 ? wantedId : slugify(name)),
    name: displayName,
    color: (input.color ?? previous?.color ?? DEFAULT_TEAM_COLOR_A).trim() || DEFAULT_TEAM_COLOR_A,
    mode,
    players: fillRoster(input.players, rosterSize(mode)),
    updatedAt: Date.now(),
  };
  const next = [preset, ...existing.filter((item) => item.id !== preset.id)].slice(0, SAVED_TEAMS_LIMIT);
  writeJson(SAVED_TEAMS_KEY, next);
  dispatchSync();
  return next;
}

/** Deletes one preset by id and returns the remaining vault. */
export function deleteTeamPreset(id: string): SavedTeamPreset[] {
  const target = (id ?? "").trim();
  const next = loadSavedTeams().filter((preset) => preset.id !== target);
  writeJson(SAVED_TEAMS_KEY, next);
  dispatchSync();
  return next;
}

export function defaultActiveCourtRosters(): ActiveCourtRosters {
  return {
    teamA: "Local",
    teamB: "Visita",
    colorA: DEFAULT_TEAM_COLOR_A,
    colorB: DEFAULT_TEAM_COLOR_B,
    rosterA: fillRoster([], 6),
    rosterB: fillRoster([], 6),
    modeA: "6p",
    modeB: "6p",
  };
}

/** Current court snapshot shared by every board. */
export function getActiveCourtRosters(): ActiveCourtRosters {
  const stored = readJson<Partial<ActiveCourtRosters> | null>(ACTIVE_ROSTERS_KEY, null);
  const base = defaultActiveCourtRosters();
  if (!stored || typeof stored !== "object") return base;
  const modeA = normalizeMode(stored.modeA);
  const modeB = normalizeMode(stored.modeB);
  return {
    teamA: typeof stored.teamA === "string" && stored.teamA.trim().length > 0 ? stored.teamA.trim() : base.teamA,
    teamB: typeof stored.teamB === "string" && stored.teamB.trim().length > 0 ? stored.teamB.trim() : base.teamB,
    colorA: typeof stored.colorA === "string" && stored.colorA.trim().length > 0 ? stored.colorA.trim() : base.colorA,
    colorB: typeof stored.colorB === "string" && stored.colorB.trim().length > 0 ? stored.colorB.trim() : base.colorB,
    rosterA: fillRoster(stored.rosterA, rosterSize(modeA)),
    rosterB: fillRoster(stored.rosterB, rosterSize(modeB)),
    modeA,
    modeB,
  };
}

/** Merges a patch into the active snapshot and notifies every listener. */
export function setActiveCourtRosters(patch: Partial<ActiveCourtRosters>): void {
  const next: ActiveCourtRosters = { ...getActiveCourtRosters(), ...patch };
  const modeA = normalizeMode(next.modeA);
  const modeB = normalizeMode(next.modeB);
  const snapshot: ActiveCourtRosters = {
    ...next,
    modeA,
    modeB,
    teamA: next.teamA.trim() || "Local",
    teamB: next.teamB.trim() || "Visita",
    rosterA: fillRoster(next.rosterA, rosterSize(modeA)),
    rosterB: fillRoster(next.rosterB, rosterSize(modeB)),
  };
  writeJson(ACTIVE_ROSTERS_KEY, snapshot);
  dispatchSync();
}
