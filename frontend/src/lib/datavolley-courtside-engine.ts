/**
 * v10.3.0 — Courtside / DataVolley `.DVW` Pro Suite.
 *
 * Three jobs:
 *  1. translateScoutCodeLive — plain-language read-back of DataVolley /
 *     VolleyStation shorthand *before* the scout presses Enter.
 *  2. lintScoutLogSequence — flags impossible volleyball sequences while the
 *     rally log is being typed.
 *  3. exportMatchToDvw / parseDvwFile — lossless `.dvw` reader & writer.
 *
 * Strict TypeScript, zero `any`.
 */
import type { Locale, ScoreboardState } from "@/lib/local-engines";

export type ScoutLocale = Locale;

/** DataVolley skill letters used by the shorthand. */
export type ScoutSkill = "S" | "R" | "E" | "A" | "B" | "D" | "F" | "N";

const word = (locale: ScoutLocale, es: string, en: string, pt: string): string =>
  locale === "en" ? en : locale === "pt" ? pt : es;

const SKILLS: Record<ScoutSkill, { es: string; en: string; pt: string }> = {
  S: { es: "Saque", en: "Serve", pt: "Saque" },
  R: { es: "Recepción", en: "Reception", pt: "Recepção" },
  E: { es: "Colocación", en: "Set", pt: "Levantamento" },
  A: { es: "Ataque", en: "Attack", pt: "Ataque" },
  B: { es: "Bloqueo", en: "Block", pt: "Bloqueio" },
  D: { es: "Defensa", en: "Dig", pt: "Defesa" },
  F: { es: "Pelota libre", en: "Free ball", pt: "Bola livre" },
  N: { es: "Sin dato", en: "No skill", pt: "Sem dado" },
};

/** Optional sub-type letter that follows the skill letter. */
const SUBTYPE_ALPHA: Record<string, string> = {
  A: "THMPOQCLV",
  S: "FMQTPR",
  E: "THQPLM",
  R: "FPMT",
  B: "THM",
  D: "FLP",
};

const SUBTYPES: Record<string, Record<string, { es: string; en: string; pt: string }>> = {
  A: {
    T: { es: "Toque", en: "Tip", pt: "Toque" },
    H: { es: "Golpe", en: "Hit", pt: "Golpe" },
    M: { es: "Medio", en: "Quick", pt: "Meio" },
    P: { es: "Pipe", en: "Pipe", pt: "Pipe" },
    Q: { es: "Colocada", en: "Quick set", pt: "Colocada" },
    O: { es: "Rebote", en: "Off the block", pt: "Rebote" },
    C: { es: "Cortado", en: "Cut shot", pt: "Cortado" },
    L: { es: "Línea", en: "Line shot", pt: "Linha" },
    V: { es: "Derecha", en: "Right hand", pt: "Direita" },
  },
  S: {
    F: { es: "Flotante", en: "Float", pt: "Flutuante" },
    M: { es: "Tenis", en: "Topspin", pt: "Tenis" },
    Q: { es: "Cortado", en: "Short", pt: "Curto" },
    T: { es: "Toque", en: "Tip", pt: "Toque" },
    P: { es: "Potencia", en: "Power", pt: "Potência" },
    R: { es: "Rota", en: "Spin", pt: "Rotação" },
  },
};

const EVALUATIONS: Record<string, { es: string; en: string; pt: string }> = {
  "+": { es: "Perfecto (+)", en: "Perfect (+)", pt: "Perfeito (+)" },
  "/": { es: "Positivo (/)", en: "Positive (/)", pt: "Positivo (/)" },
  "=": { es: "Incompleto (=)", en: "Incomplete (=)", pt: "Incompleto (=)" },
  "-": { es: "Negativo (-)", en: "Negative (-)", pt: "Negativo (-)" },
  "#": { es: "Punto (#)", en: "Point (#)", pt: "Ponto (#)" },
  "!": { es: "Seguro (!)", en: "Sure (!)", pt: "Seguro (!)" },
  "~": { es: "Aproximado (~)", en: "Approximate (~)", pt: "Aproximado (~)" },
  "?": { es: "Dudoso (?)", en: "Unsure (?)", pt: "Duvidoso (?)" },
  "*": { es: "Fuerte (*)", en: "Strong (*)", pt: "Forte (*)" },
  "&": { es: "Empujado (&)", en: "Stuff (&)", pt: "Empurrado (&)" },
  "%": { es: "Tocado (%)", en: "Tipped (%)", pt: "Tocado (%)" },
};

const EVAL_CHARS = new Set(Object.keys(EVALUATIONS));
const SKILL_CHARS = new Set(Object.keys(SKILLS));

export type ScoutTokenKind =
  | "team"
  | "player"
  | "skill"
  | "subtype"
  | "evaluation"
  | "zone"
  | "blockers"
  | "extra";

export interface ScoutToken {
  kind: ScoutTokenKind;
  raw: string;
  label: string;
}

export interface ParsedScoutCode {
  code: string;
  team: "home" | "away";
  player: number;
  skill: ScoutSkill;
  subtype: string;
  evaluation: string;
  originZone: number | null;
  targetZone: number | null;
  blockers: number | null;
  extra: string;
}

export interface ScoutTranslation {
  valid: boolean;
  summary: string;
  tokens: ScoutToken[];
}

const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9";

/** Parses one DataVolley / VolleyStation shorthand code (null when unusable). */
export function parseScoutCode(rawCode: string): ParsedScoutCode | null {
  const code = rawCode.trim();
  if (!code) return null;
  let index = 0;
  let team: "home" | "away" = "home";
  const head = code[0] ?? "";
  if (head === "*" || head.toUpperCase() === "H") index = 1;
  else if (head.toUpperCase() === "A" || head.toUpperCase() === "V") {
    team = "away";
    index = 1;
  }

  const digitsStart = index;
  while (index < code.length && isDigit(code[index] ?? "")) index += 1;
  const playerRaw = code.slice(digitsStart, index);
  if (!playerRaw) return null;
  if (index >= code.length) return null;

  const skillRaw = (code[index] ?? "").toUpperCase();
  if (!SKILL_CHARS.has(skillRaw)) return null;
  const skill = skillRaw as ScoutSkill;
  index += 1;

  const subtypeAlpha = SUBTYPE_ALPHA[skill] ?? "";
  let subtype = "";
  while (index < code.length) {
    const ch = (code[index] ?? "").toUpperCase();
    if (!subtypeAlpha.includes(ch) || EVAL_CHARS.has(code[index] ?? "")) break;
    subtype += ch;
    index += 1;
  }

  let evaluation = "";
  const evalCandidate = code[index] ?? "";
  if (EVAL_CHARS.has(evalCandidate)) {
    evaluation = evalCandidate;
    index += 1;
  }

  const rest = code.slice(index);
  let originZone: number | null = null;
  let targetZone: number | null = null;
  let blockers: number | null = null;
  let extra = "";

  const zoneMatch = /^(\d)(\d)/.exec(rest);
  let remainder = rest;
  if (zoneMatch) {
    originZone = Number(zoneMatch[1]);
    targetZone = Number(zoneMatch[2]);
    remainder = rest.slice(2);
  }
  const blockMatch = /^B(\d{1,2})/i.exec(remainder);
  if (blockMatch) {
    blockers = Number(blockMatch[1]);
    remainder = remainder.slice(blockMatch[0].length);
  }
  extra = remainder;

  return {
    code,
    team,
    player: Number(playerRaw),
    skill,
    subtype,
    evaluation,
    originZone,
    targetZone,
    blockers,
    extra,
  };
}

/** Human label for a parsed code, in the requested locale. */
function describeParsed(parsed: ParsedScoutCode, locale: ScoutLocale): string {
  const skillInfo = SKILLS[parsed.skill];
  const skillLabel = skillInfo ? word(locale, skillInfo.es, skillInfo.en, skillInfo.pt) : parsed.skill;
  const subtypeInfo = SUBTYPES[parsed.skill]?.[parsed.subtype];
  const subtypeLabel = subtypeInfo ? word(locale, subtypeInfo.es, subtypeInfo.en, subtypeInfo.pt) : parsed.subtype;
  const teamLabel = word(
    locale,
    parsed.team === "home" ? "Local" : "Visita",
    parsed.team === "home" ? "Home" : "Away",
    parsed.team === "home" ? "Casa" : "Visitante",
  );

  const parts: string[] = [`#${parsed.player} ${teamLabel}`];
  parts.push(subtypeLabel ? `${skillLabel} (${subtypeLabel})` : skillLabel);
  if (parsed.originZone !== null && parsed.targetZone !== null) {
    parts.push(`${word(locale, "Zona", "Zone", "Zona")} ${parsed.originZone}→${parsed.targetZone}`);
  }
  if (parsed.blockers !== null) {
    parts.push(
      `${parsed.blockers} ${word(locale, "Bloqueos", "Blocks", parsed.blockers === 1 ? "Bloqueio" : "Bloqueios")}`,
    );
  }
  const evalInfo = EVALUATIONS[parsed.evaluation];
  if (evalInfo) parts.push(word(locale, evalInfo.es, evalInfo.en, evalInfo.pt));
  if (parsed.extra) parts.push(parsed.extra);
  return parts.join(" · ");
}

function buildTokens(parsed: ParsedScoutCode, locale: ScoutLocale): ScoutToken[] {
  const tokens: ScoutToken[] = [];
  const teamLabel = word(
    locale,
    parsed.team === "home" ? "Local" : "Visita",
    parsed.team === "home" ? "Home" : "Away",
    parsed.team === "home" ? "Casa" : "Visitante",
  );
  tokens.push({ kind: "team", raw: parsed.team, label: teamLabel });
  tokens.push({ kind: "player", raw: String(parsed.player), label: `#${parsed.player}` });
  const skillInfo = SKILLS[parsed.skill];
  tokens.push({
    kind: "skill",
    raw: parsed.skill,
    label: skillInfo ? word(locale, skillInfo.es, skillInfo.en, skillInfo.pt) : parsed.skill,
  });
  if (parsed.subtype) {
    const subtypeInfo = SUBTYPES[parsed.skill]?.[parsed.subtype];
    tokens.push({
      kind: "subtype",
      raw: parsed.subtype,
      label: subtypeInfo
        ? word(locale, subtypeInfo.es, subtypeInfo.en, subtypeInfo.pt)
        : parsed.subtype,
    });
  }
  if (parsed.originZone !== null && parsed.targetZone !== null) {
    tokens.push({
      kind: "zone",
      raw: `${parsed.originZone}${parsed.targetZone}`,
      label: `${word(locale, "Zona", "Zone", "Zona")} ${parsed.originZone}→${parsed.targetZone}`,
    });
  }
  if (parsed.blockers !== null) {
    tokens.push({
      kind: "blockers",
      raw: `B${parsed.blockers}`,
      label: `${parsed.blockers} ${word(locale, "Bloqueos", "Blocks", parsed.blockers === 1 ? "Bloqueio" : "Bloqueios")}`,
    });
  }
  const evalInfo = EVALUATIONS[parsed.evaluation];
  if (evalInfo) {
    tokens.push({
      kind: "evaluation",
      raw: parsed.evaluation,
      label: word(locale, evalInfo.es, evalInfo.en, evalInfo.pt),
    });
  }
  if (parsed.extra) tokens.push({ kind: "extra", raw: parsed.extra, label: parsed.extra });
  return tokens;
}

/** Live read-back shown above the Courtside console before Enter is pressed. */
export function translateScoutCodeLive(code: string, locale: ScoutLocale): ScoutTranslation {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      valid: false,
      summary: word(
        locale,
        "Escribí un código de observación…",
        "Type a scout code…",
        "Digite um código de observação…",
      ),
      tokens: [],
    };
  }
  const parsed = parseScoutCode(trimmed);
  if (!parsed) {
    return {
      valid: false,
      summary: word(
        locale,
        `Código no reconocido: ${trimmed}`,
        `Unrecognised code: ${trimmed}`,
        `Código não reconhecido: ${trimmed}`,
      ),
      tokens: [],
    };
  }
  return { valid: true, summary: describeParsed(parsed, locale), tokens: buildTokens(parsed, locale) };
}

// --------------------------------------------------------------- rally linter

export type ScoutLintType =
  | "DOUBLE_RECEPTION"
  | "MISSING_BLOCK_AFTER_STUFF"
  | "BACKROW_FRONTZONE_VIOLATION"
  | "ROTATION_SLIP";

export interface ScoutLogEntry {
  code: string;
  rally: number;
  player: number;
  skill: string;
  evaluation: string;
  team: "home" | "away";
  /** Rotation position P1..P6 (1..6). */
  rotation: number | null;
  originZone: number | null;
  targetZone: number | null;
}

export interface ScoutLintIssue {
  type: ScoutLintType;
  index: number;
  rally: number;
  message: string;
}

/** Builds a linter entry from a raw code (null when the code is malformed). */
export function createScoutLogEntry(code: string, rally: number, rotation: number | null = null): ScoutLogEntry | null {
  const parsed = parseScoutCode(code);
  if (!parsed) return null;
  return {
    code: parsed.code,
    rally,
    player: parsed.player,
    skill: parsed.skill,
    evaluation: parsed.evaluation,
    team: parsed.team,
    rotation,
    originZone: parsed.originZone,
    targetZone: parsed.targetZone,
  };
}

/** Back-row rotation positions (P1, P6, P5) in DataVolley numbering. */
const BACK_ROW_POSITIONS = new Set([1, 6, 5]);
/** Zones 2, 3 and 4 belong to the front zone. */
const FRONT_ZONES = new Set([2, 3, 4]);

export function lintScoutLogSequence(entries: ScoutLogEntry[], locale: ScoutLocale): ScoutLintIssue[] {
  const issues: ScoutLintIssue[] = [];

  // Group by rally while keeping the original indices.
  const rallies = new Map<number, number[]>();
  entries.forEach((entry, index) => {
    const bucket = rallies.get(entry.rally);
    if (bucket) bucket.push(index);
    else rallies.set(entry.rally, [index]);
  });

  rallies.forEach((indices) => {
    // 1. Two receptions in the same rally without a serve between them.
    let receptionSeen = false;
    for (const index of indices) {
      const entry = entries[index];
      if (!entry) continue;
      if (entry.skill === "S") {
        receptionSeen = false;
        continue;
      }
      if (entry.skill === "R") {
        if (receptionSeen) {
          issues.push({
            type: "DOUBLE_RECEPTION",
            index,
            rally: entry.rally,
            message: word(
              locale,
              `Doble recepción en el rally ${entry.rally}: dos R seguidas sin saque.`,
              `Double reception in rally ${entry.rally}: two R codes with no serve between them.`,
              `Dupla recepção no rally ${entry.rally}: dois códigos R sem saque entre eles.`,
            ),
          });
        }
        receptionSeen = true;
      }
    }

    // 2. Attack evaluated as blocked/stuffed with no opponent block logged.
    for (const index of indices) {
      const entry = entries[index];
      if (!entry) continue;
      if (entry.skill !== "A" || (entry.evaluation !== "/" && entry.evaluation !== "=")) continue;
      const hasOpponentBlock = indices.some((otherIndex) => {
        const other = entries[otherIndex];
        return Boolean(other && otherIndex > index && other.skill === "B" && other.team !== entry.team);
      });
      if (!hasOpponentBlock) {
        issues.push({
          type: "MISSING_BLOCK_AFTER_STUFF",
          index,
          rally: entry.rally,
          message: word(
            locale,
            `Ataque marcado como bloqueado (rally ${entry.rally}) sin bloqueo rival anotado.`,
            `Attack marked blocked (rally ${entry.rally}) with no opponent block logged.`,
            `Ataque marcado como bloqueado (rally ${entry.rally}) sem bloqueio adversário.`,
          ),
        });
      }
    }

    // 3. Back-row player attacking from a front zone.
    for (const index of indices) {
      const entry = entries[index];
      if (!entry) continue;
      if (entry.skill !== "A" || entry.rotation === null || entry.originZone === null) continue;
      if (!BACK_ROW_POSITIONS.has(entry.rotation) || !FRONT_ZONES.has(entry.originZone)) continue;
      issues.push({
        type: "BACKROW_FRONTZONE_VIOLATION",
        index,
        rally: entry.rally,
        message: word(
          locale,
          `Colocación inválida (rally ${entry.rally}): P${entry.rotation} ataca desde zona ${entry.originZone}.`,
          `Illegal attack (rally ${entry.rally}): P${entry.rotation} hits from zone ${entry.originZone}.`,
          `Ataque ilegal (rally ${entry.rally}): P${entry.rotation} ataca da zona ${entry.originZone}.`,
        ),
      });
    }
  });

  // 4. Same team serving twice in a row with a different player.
  let lastServe: { team: "home" | "away"; player: number; index: number } | null = null;
  entries.forEach((entry, index) => {
    if (entry.skill !== "S") return;
    if (lastServe && lastServe.team === entry.team && lastServe.player !== entry.player) {
      issues.push({
        type: "ROTATION_SLIP",
        index,
        rally: entry.rally,
        message: word(
          locale,
          `Rotación desfasada: saque #${lastServe.player} seguido de #${entry.player} del mismo equipo.`,
          `Rotation slip: serve by #${lastServe.player} followed by #${entry.player} on the same team.`,
          `Rotação desalinhada: saque de #${lastServe.player} seguido de #${entry.player} no mesmo time.`,
        ),
      });
    }
    lastServe = { team: entry.team, player: entry.player, index };
  });

  return issues.sort((a, b) => a.index - b.index);
}

// -------------------------------------------------------------- .dvw files

export interface DvwPlayer {
  number: number;
  name: string;
}

export interface DvwSetRecord {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  /** Scout codes with video timestamps, one entry per rally. */
  scout: string[];
}

export interface DvwFile {
  version: string;
  homeTeam: string;
  awayTeam: string;
  sets: DvwSetRecord[];
  playersHome: DvwPlayer[];
  playersAway: DvwPlayer[];
}

const DVW_VERSION = "4.0.0";
const LINE_END = "\n";

/** Serialises a DvwFile into canonical `.dvw` text (stable for round-trips). */
export function serializeDvwFile(file: DvwFile): string {
  const lines: string[] = [];
  lines.push("[3DATAVOLLEYSCORESHEET]");
  lines.push(`Version=${file.version}`);
  lines.push(`Software=VoleyOS ${DVW_VERSION}`);
  lines.push("[3TEAMS]");
  lines.push(file.homeTeam);
  lines.push(file.awayTeam);
  lines.push("[3SET]");
  for (const set of file.sets) {
    lines.push(`${set.setNumber}`);
    lines.push(`${set.scoreA}-${set.scoreB}`);
  }
  lines.push("[3PLAYERS-H]");
  for (const player of file.playersHome) lines.push(`${player.number}\t${player.name}`);
  lines.push("[3PLAYERS-V]");
  for (const player of file.playersAway) lines.push(`${player.number}\t${player.name}`);
  lines.push("[3SCOUT]");
  for (const set of file.sets) {
    // Rally groups are separated by "||" (a character no scout code can hold).
    lines.push(`${set.setNumber}|${set.scout.join("||")}`);
  }
  return lines.join(LINE_END) + LINE_END;
}

/** Parses `.dvw` text. Throws when the document is not a VoleyOS/DataVolley sheet. */
export function parseDvwFile(dvwText: string): DvwFile {
  const file = tryParseDvwFile(dvwText);
  if (!file) throw new Error("invalid-dvw");
  return file;
}

/** Non-throwing reader used by the Pro console import button. */
export function tryParseDvwFile(dvwText: string): DvwFile | null {
  const lines = dvwText.replace(/\r\n/g, "\n").split("\n");
  const sections = new Map<string, string[]>();
  let current = "";
  for (const line of lines) {
    const header = /^\[(3[A-Z-]+)\]$/.exec(line.trim());
    if (header) {
      current = header[1] ?? "";
      sections.set(current, []);
      continue;
    }
    if (!current) continue;
    const bucket = sections.get(current);
    if (bucket) bucket.push(line);
  }
  if (!sections.has("3DATAVOLLEYSCORESHEET") || !sections.has("3TEAMS")) return null;

  const meta = sections.get("3DATAVOLLEYSCORESHEET") ?? [];
  const versionLine = meta.find((line) => line.startsWith("Version="));
  const version = versionLine ? versionLine.slice("Version=".length).trim() : DVW_VERSION;

  const teamLines = (sections.get("3TEAMS") ?? []).filter((line) => line.trim().length > 0);
  const homeTeam = (teamLines[0] ?? "").trim();
  const awayTeam = (teamLines[1] ?? "").trim();
  if (!homeTeam || !awayTeam) return null;

  const setLines = (sections.get("3SET") ?? []).map((line) => line.trim()).filter(Boolean);
  const sets: DvwSetRecord[] = [];
  for (let index = 0; index + 1 < setLines.length; index += 2) {
    const setNumber = Number(setLines[index]);
    const [scoreA = "0", scoreB = "0"] = (setLines[index + 1] ?? "0-0").split("-");
    if (!Number.isFinite(setNumber)) return null;
    sets.push({
      setNumber,
      scoreA: Number(scoreA) || 0,
      scoreB: Number(scoreB) || 0,
      scout: [],
    });
  }

  const readPlayers = (section: string): DvwPlayer[] =>
    (sections.get(section) ?? [])
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [numberRaw = "0", ...nameParts] = line.split("\t");
        const number = Number.parseInt(numberRaw.trim(), 10);
        const name = nameParts.join("\t").trim() || numberRaw.trim();
        return { number: Number.isFinite(number) ? number : 0, name };
      });

  const playersHome = readPlayers("3PLAYERS-H");
  const playersAway = readPlayers("3PLAYERS-V");

  for (const line of sections.get("3SCOUT") ?? []) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf("|");
    if (separator < 0) continue;
    const setNumber = Number.parseInt(trimmed.slice(0, separator), 10);
    const rallies = trimmed
      .slice(separator + 1)
      .split("||")
      .map((rally) => rally.trim())
      .filter(Boolean);
    const target = sets.find((set) => set.setNumber === setNumber);
    if (target) target.scout.push(...rallies);
  }

  return { version, homeTeam, awayTeam, sets, playersHome, playersAway };
}

/** Writes a live match to `.dvw` text (optional per-set scout logs with `@ms` timestamps). */
export function exportMatchToDvw(state: ScoreboardState, scoutSets: string[][] = []): string {
  const history = state.setHistory ?? [];
  const sets: DvwSetRecord[] = history.map((entry, index) => ({
    setNumber: entry.setNumber || index + 1,
    scoreA: entry.scoreA,
    scoreB: entry.scoreB,
    scout: scoutSets[index] ?? [],
  }));
  const currentSet = history.length + 1;
  if (sets.length === 0 || state.status === "live") {
    sets.push({
      setNumber: currentSet,
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      scout: scoutSets[history.length] ?? [],
    });
  }

  const toPlayers = (roster: ScoreboardState["rosterA"]): DvwPlayer[] =>
    roster?.players.map((player) => ({ number: player.number, name: player.name })) ?? [];

  return serializeDvwFile({
    version: DVW_VERSION,
    homeTeam: state.teamA,
    awayTeam: state.teamB,
    sets,
    playersHome: toPlayers(state.rosterA),
    playersAway: toPlayers(state.rosterB),
  });
}

/** `code@12400` → `code` plus its video timestamp in milliseconds. */
export function splitScoutTimestamp(token: string): { code: string; timestampMs: number | null } {
  const at = token.lastIndexOf("@");
  if (at <= 0) return { code: token, timestampMs: null };
  const suffix = token.slice(at + 1);
  if (!/^\d+$/.test(suffix)) return { code: token, timestampMs: null };
  return { code: token.slice(0, at), timestampMs: Number(suffix) };
}

const demoPlayersHome: DvwPlayer[] = [
  { number: 4, name: "M. PEREIRA" },
  { number: 7, name: "L. GÓMEZ" },
  { number: 9, name: "R. DÍAZ" },
  { number: 12, name: "S. NÚÑEZ" },
  { number: 14, name: "A. VERA" },
  { number: 16, name: "D. SOTO" },
];

const demoPlayersAway: DvwPlayer[] = [
  { number: 3, name: "F. MORA" },
  { number: 5, name: "J. REYES" },
  { number: 7, name: "P. LOZANO" },
  { number: 8, name: "C. RIVAS" },
  { number: 10, name: "E. BRUNO" },
  { number: 11, name: "N. ACOSTA" },
];

const demoScoutRallies: string[] = [
  "*14AT#42B2@12400",
  "*12R+@18100",
  "a07SM=@24650",
  "*09B#@31200",
  "*04SQ#16@38900",
  "a05EH+@45120",
  "*16D-@52300",
  // Intentional lint warning: two receptions in one rally, no serve between.
  "*07R/@58800 *07R=@64150",
  "a10AP#71400",
  "*14AM+@78600",
  "a11BS/@85250",
  "a03E=#92000",
];

/** 12-rally sample set with video timestamps and exactly one intentional lint
 *  warning (DOUBLE_RECEPTION on rally 8). */
export const SAMPLE_DEMO_DVW: string = serializeDvwFile({
  version: DVW_VERSION,
  homeTeam: "Tiburones",
  awayTeam: "Cóndores",
  sets: [
    { setNumber: 1, scoreA: 25, scoreB: 20, scout: demoScoutRallies },
    { setNumber: 2, scoreA: 0, scoreB: 0, scout: [] },
  ],
  playersHome: demoPlayersHome,
  playersAway: demoPlayersAway,
});

/** Turns `.dvw` scout lines into linter entries. Each array element is one
 *  rally (codes inside a rally are space separated); rally index starts at 1.
 *  `[3SCOUT]` already stores one entry per rally, so nothing is re-grouped. */
export function scoutLinesToLogEntries(rallies: string[], rotations: number[] = []): ScoutLogEntry[] {
  const entries: ScoutLogEntry[] = [];
  rallies.forEach((rally, index) => {
    const rotation = rotations[index] ?? null;
    rally
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const { code } = splitScoutTimestamp(token);
        if (!code) return;
        const entry = createScoutLogEntry(code, index + 1, rotation);
        if (entry) entries.push(entry);
      });
  });
  return entries;
}
