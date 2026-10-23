import { describe, expect, it } from "vitest";

import {
  awardIndoorPoint,
  newScoreboard,
  parseRosterSheet,
  teamFromRosterSheet,
  validateRosterPlayers,
  type ScoreboardState,
} from "./local-engines";

const SHEET = [
  "1 Sofia S C",
  "4 Valentina OH",
  "7 Martina L",
  "9 Renata MB",
  "11 Carla OPP",
  "14 Julieta MB",
  "21 Micaela OH",
].join("\n");

const at = (state: ScoreboardState, scoreA: number, scoreB: number): ScoreboardState => ({
  ...state,
  scoreA,
  scoreB,
});

describe("roster manager", () => {
  it("parses a roster sheet into validated players", () => {
    const players = parseRosterSheet(SHEET);
    expect(players).toHaveLength(7);
    expect(players[0]).toMatchObject({ number: 1, name: "Sofia", role: "S", captain: true });
    expect(validateRosterPlayers(players)).toEqual([]);
  });

  it("rejects duplicate jerseys, missing captain and a libero captain", () => {
    expect(validateRosterPlayers(parseRosterSheet(SHEET.replace("21 Micaela", "1 Micaela")))).toContain(
      "Dorsales repetidos.",
    );
    expect(validateRosterPlayers(parseRosterSheet(SHEET.replace("1 Sofia S C", "1 Sofia S")))).toContain(
      "Debe haber exactamente un capitan.",
    );
    expect(validateRosterPlayers(parseRosterSheet(SHEET.replace("1 Sofia S C", "1 Sofia L C")))).toContain(
      "El libero no puede ser capitan.",
    );
  });

  it("builds a team with six starters and one libero", () => {
    const team = teamFromRosterSheet("Tiburones", "TIB", SHEET);
    expect(team.starters).toHaveLength(6);
    expect(team.starters).not.toContain(7);
    expect(team.libero).toBe(7);
    expect(team.players).toHaveLength(7);
  });

  it("plays deuce to 26-24 and the decider to 17-15", () => {
    const first = awardIndoorPoint(at(newScoreboard("A", "B", 3), 24, 24), "A");
    expect(first.setFinished).toBe(false);
    const closed = awardIndoorPoint(at(first.state, 25, 24), "A");
    expect(closed.setFinished).toBe(true);
    expect(closed.state.setsA).toBe(1);
    expect(closed.state.setHistory?.[0]).toEqual({ setNumber: 1, scoreA: 26, scoreB: 24 });

    const decider = newScoreboard("A", "B", 5, { setNumber: 5, setsA: 2, setsB: 2 });
    const firstDecider = awardIndoorPoint(at(decider, 15, 15), "A");
    expect(firstDecider.setFinished).toBe(false);
    const second = awardIndoorPoint(at(firstDecider.state, 16, 15), "B");
    expect(second.setFinished).toBe(false);
    const third = awardIndoorPoint(at(second.state, 16, 16), "A");
    expect(third.setFinished).toBe(false);
    const match = awardIndoorPoint(at(third.state, 17, 16), "A");
    expect(match.matchFinished).toBe(true);
    expect(match.state.winner).toBe("A");
  });
});
