import { describe, expect, it } from "vitest";

import {
  awardIndoorPoint,
  kingAwardWin,
  newKingOfCourt,
  newScoreboard,
  point8SwitchDue,
  swapCourt,
} from "./local-engines";

describe("v9 court engine: court swap, presets and king of the court", () => {
  it("toggles court sides with swapCourt", () => {
    const start = newScoreboard("Tiburones", "Cóndores", 3);
    expect(start.isCourtSwapped).toBe(false);
    const swapped = swapCourt(start);
    expect(swapped.isCourtSwapped).toBe(true);
    expect(swapCourt(swapped).isCourtSwapped).toBe(false);
    // scores and names are untouched: only the visual side flag flips
    expect(swapped.teamA).toBe("Tiburones");
    expect(swapped.scoreA).toBe(0);
  });

  it("flags the point-8 badge only in 15-point sets while live", () => {
    const short = newScoreboard("A", "B", 1, { matchFormat: "short15" });
    let state = short;
    for (let i = 0; i < 8; i += 1) state = awardIndoorPoint(state, "A").state;
    expect(state.scoreA).toBe(8);
    expect(point8SwitchDue(state)).toBe(true);
    const official = newScoreboard("A", "B", 3, { matchFormat: "bo3" });
    expect(point8SwitchDue(official)).toBe(false);
  });

  it("runs picadito to 15 with win-by-2 deuce", () => {
    let state = newScoreboard("Tiburones", "Cóndores", 1, {
      matchFormat: "short15",
      targetPoints: 15,
      scoreA: 13,
      scoreB: 13,
    });
    state = awardIndoorPoint(state, "A").state;
    state = awardIndoorPoint(state, "A").state;
    expect(state.scoreA).toBe(15);
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
  });

  it("keeps playing through 14-14 deuce until a 2-point lead", () => {
    let state = newScoreboard("A", "B", 1, {
      matchFormat: "short15",
      targetPoints: 15,
      scoreA: 13,
      scoreB: 14,
    });
    const deuced = awardIndoorPoint(state, "A"); // 14-14: deuce announced
    expect(deuced.message).toContain("DEUCE");
    expect(deuced.state.status).toBe("live");
    state = awardIndoorPoint(deuced.state, "A").state; // 15-14 not enough
    expect(state.status).toBe("live");
    state = awardIndoorPoint(state, "A").state; // 16-14 wins by 2
    expect(state.status).toBe("finished");
    expect(state.scoreA).toBe(16);
  });

  it("ends immediately on golden point (no 2-point margin)", () => {
    let state = newScoreboard("A", "B", 1, {
      matchFormat: "short15",
      targetPoints: 15,
      goldenPoint: true,
      scoreA: 14,
      scoreB: 14,
    });
    const result = awardIndoorPoint(state, "A");
    expect(result.setFinished).toBe(true);
    expect(result.state.status).toBe("finished");
    state = result.state;
    expect(state.winner).toBe("A");
  });

  it("supports custom picadito targets (11 / 21)", () => {
    let state = newScoreboard("A", "B", 1, {
      matchFormat: "short15",
      targetPoints: 11,
      scoreA: 9,
      scoreB: 10,
    });
    state = awardIndoorPoint(state, "A").state; // 10-10 deuce
    expect(state.status).toBe("live");
    state = awardIndoorPoint(state, "A").state; // 11-10 not enough (win by 2)
    expect(state.status).toBe("live");
    state = awardIndoorPoint(state, "A").state; // 12-10
    expect(state.status).toBe("finished");
  });

  it("auto-closes a Bo3 set at 25 with the 24-24 deuce", () => {
    let state = newScoreboard("A", "B", 3, { matchFormat: "bo3", scoreA: 24, scoreB: 23 });
    const result = awardIndoorPoint(state, "A");
    expect(result.setFinished).toBe(true);
    expect(result.state.setsA).toBe(1);
    expect(result.state.setNumber).toBe(2);
    expect(result.state.scoreA).toBe(0);
    state = result.state;
    expect(state.status).toBe("live");
  });

  it("requires 3-5 teams for Rey de la Cancha", () => {
    expect(() => newKingOfCourt(["Tiburones", "Lobos"])).toThrow("3 to 5");
    expect(() => newKingOfCourt(["A", "B", "C", "D", "E", "F"])).toThrow("3 to 5");
  });

  it("keeps the winner on court and rotates the loser to the queue", () => {
    const start = newKingOfCourt(["Tiburones", "Lobos", "Titanes", "Vinchas"]);
    expect(start.courtA).toBe("Tiburones");
    expect(start.courtB).toBe("Lobos");
    expect(start.queue).toEqual(["Titanes", "Vinchas"]);

    const after = kingAwardWin(start, "A"); // Tiburones win
    expect(after.courtA).toBe("Tiburones"); // winner stays
    expect(after.courtB).toBe("Titanes"); // challenger enters
    expect(after.queue).toEqual(["Vinchas", "Lobos"]); // loser to the back
    expect(after.wins["Tiburones"]).toBe(1);
    expect(after.streakTeam).toBe("Tiburones");
    expect(after.streak).toBe(1);

    const streaked = kingAwardWin(after, "A");
    expect(streaked.streak).toBe(2);
    expect(streaked.courtB).toBe("Vinchas");
    expect(streaked.wins["Tiburones"]).toBe(2);

    const upset = kingAwardWin(streaked, "B"); // Vinchas win
    expect(upset.courtB).toBe("Vinchas"); // winner stays
    expect(upset.courtA).toBe("Lobos"); // next challenger enters
    expect(upset.queue).toEqual(["Titanes", "Tiburones"]); // loser to the back
    expect(upset.streakTeam).toBe("Vinchas");
    expect(upset.streak).toBe(1);
  });
});
