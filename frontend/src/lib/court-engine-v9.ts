/**
 * v11.3.3 — 7-player pickup rotation ("6 on court + 1 at serve").
 *
 * The roster is an ordered wheel of seven labels:
 *   roster[0]    → the active 7th player standing in the serve slot
 *   roster[1..6] → the six players on court (Z1..Z6)
 *
 * One rotation pushes the serve-slot player onto the back row, brings the
 * player coming down from the front-right wheel position into the serve slot,
 * and exposes who is next in line. Everything here is pure so the scoreboard,
 * the giant gym board, the Modo Mesa dock and the tests all agree.
 */

export const SEVEN_PLAYER_DEFAULT_ROSTER = ["J1", "J2", "J3", "J4", "J5", "J6", "J7"] as const;

export interface SevenPlayerState {
  /** All seven labels, serve slot first. */
  roster: string[];
  /** The six players currently on court (Z1..Z6). */
  onCourt: string[];
  /** Who serves the next rally (the 7th player in the serve slot). */
  server: string;
  /** Who steps onto the back row on the next rotation. */
  enteringCourt: string;
  /** Who takes the serve slot after that entry. */
  nextInLine: string;
}

export interface SevenPlayerRotation {
  nextRoster: string[];
  enteringCourt: string;
  newServer: string;
  nextInLine: string;
}

/** Builds a 7-slot roster, filling any gap with J1..J7. */
export function createSevenPlayerRoster(labels?: string[]): string[] {
  const source = (labels ?? [])
    .map((label) => (typeof label === "string" ? label.trim() : ""))
    .filter((label) => label.length > 0)
    .slice(0, 7);
  const roster = [...source];
  for (let index = roster.length; index < 7; index += 1) {
    roster.push(`J${index + 1}`);
  }
  return roster;
}

function normalize(roster: string[]): string[] {
  return createSevenPlayerRoster(roster);
}

/**
 * Clockwise wheel: the serve-slot player enters the court, the next player in
 * the wheel takes the serve slot, and the one after that becomes next in line.
 */
export function rotateSevenPlayers(roster: string[]): SevenPlayerRotation {
  const current = normalize(roster);
  const enteringCourt = current[0] as string;
  const newServer = current[1] as string;
  const nextRoster = [...current.slice(1), enteringCourt];
  return { nextRoster, enteringCourt, newServer, nextInLine: nextRoster[1] as string };
}

/** Reverses exactly one wheel step (Undo on a rotation point). */
export function undoRotateSevenPlayers(roster: string[]): string[] {
  const current = normalize(roster);
  const last = current[current.length - 1] as string;
  return [last, ...current.slice(0, current.length - 1)];
}

/** Snapshot used by the scoreboard strip and the gym board pill. */
export function sevenPlayerStatus(roster: string[]): SevenPlayerState {
  const current = normalize(roster);
  return {
    roster: current,
    onCourt: current.slice(1),
    server: current[0] as string,
    enteringCourt: current[0] as string,
    nextInLine: current[1] as string,
  };
}

/** Localisation helper: the spoken cue after a 7-player rotation. */
export function sevenPlayerCue(
  enteringCourt: string,
  newServer: string,
  locale: "es" | "en" | "pt",
): string {
  if (locale === "en") return `7 rotation: ${enteringCourt} in, ${newServer} serves`;
  if (locale === "pt") return `Rotação de 7: entra ${enteringCourt}, saca ${newServer}`;
  return `Rotación de 7: entra ${enteringCourt}, al saque ${newServer}`;
}
