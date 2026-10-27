import { beforeEach, describe, expect, it } from "vitest";

import {
  PLAYER_DIRECTORY_KEY,
  buildOrganizer,
  clearPlayerDirectory,
  loadPlayerDirectory,
  newBenchTeam,
  rememberPlayerNames,
} from "@/lib/casual-engines";

describe("unified player directory (cross-module memory)", () => {
  beforeEach(() => window.localStorage.clear());

  it("remembers names typed into the WhatsApp organizer", () => {
    buildOrganizer("1. Ana\n2) Bruno\n3: Carla", 10, "Cancha Municipal", "21:00");
    const players = loadPlayerDirectory();
    expect(players).toContain("Ana");
    expect(players).toContain("Bruno");
    expect(players).toContain("Carla");
  });

  it("remembers bench squads and dedupes case-insensitively with normalised spacing", () => {
    newBenchTeam(["Ana", "Bruno", "Carla", "Damián", "Eugenia", "Flavio", "Gaby", "Héctor"], "serve");
    rememberPlayerNames(["ana", "  Nueva   Jugadora "]);
    const players = loadPlayerDirectory();
    expect(players).toContain("Damián");
    expect(players).toContain("Nueva Jugadora");
    expect(players.filter((name) => name.toLowerCase() === "ana")).toHaveLength(1);
  });

  it("is readable from any module and clearable in one tap", () => {
    rememberPlayerNames(["Valentina"]);
    expect(window.localStorage.getItem(PLAYER_DIRECTORY_KEY)).toContain("Valentina");
    expect(clearPlayerDirectory()).toEqual([]);
    expect(loadPlayerDirectory()).toEqual([]);
  });

  it("ignores empty and over-long junk entries", () => {
    rememberPlayerNames(["", " ", "x", "y".repeat(80)]);
    expect(loadPlayerDirectory()).toEqual([]);
  });

  it("caps the directory at the 200 most recent players", () => {
    const many = Array.from({ length: 220 }, (_, index) => `Player ${index}`);
    rememberPlayerNames(many);
    const players = loadPlayerDirectory();
    expect(players).toHaveLength(200);
    expect(players[0]).toBe("Player 20");
    expect(players.at(-1)).toBe("Player 219");
  });
});
