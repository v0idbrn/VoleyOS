import { describe, expect, it } from "vitest";

import {
  awardMvp,
  buildSignalSheet,
  fanReport,
  refereeReport,
  splitCosts,
  trackSubstitutions,
} from "./local-engines";

describe("v3 offline engines", () => {
  it("escalates a second yellow card into a penalty point", () => {
    const report = refereeReport({
      scoreA: 10,
      scoreB: 9,
      serving: "A",
      events: [
        { team: "A", player: 4, kind: "WARNING_YELLOW" },
        { team: "A", player: 4, kind: "WARNING_YELLOW" },
      ],
    });
    expect(report.sanctions[0]?.applied).toBe("WARNING_YELLOW");
    expect(report.sanctions[1]?.applied).toBe("PENALTY_RED");
    expect(report.sanctions[1]?.escalated).toBe(true);
    expect(report.scoreB).toBe(10);
    expect(report.serving).toBe("B");
    expect(report.serveSeconds).toBe(8);
  });

  it("escalates a repeated delay and keeps exceptional subs free", () => {
    const delay = refereeReport({
      events: [
        { team: "B", kind: "DELAY_WARNING" },
        { team: "B", kind: "DELAY_WARNING" },
      ],
    });
    expect(delay.sanctions[1]?.applied).toBe("DELAY_PENALTY");
    expect(delay.delayPenalties).toBe(1);

    const subs = trackSubstitutions([
      { team: "A", outNumber: 5, inNumber: 15, position: 1, exceptional: true },
      { team: "A", outNumber: 6, inNumber: 16, position: 2 },
    ]);
    expect(subs.events[0]?.exceptional).toBe(true);
    expect(subs.remainingSubs.A).toBe(5);
  });

  it("splits pickup costs to the exact cent and nests deposits", () => {
    const report = splitCosts({
      mode: "pickup",
      courtCost: 90,
      extrasCost: 30,
      attendees: [
        { name: "Ana", deposit: 30 },
        { name: "Beto" },
        { name: "Caro", discountPct: 50 },
      ],
      paymentAlias: "volleyos.demo",
      paymentHolder: "Tesoreria",
    });
    expect(report.pickup).not.toBeNull();
    const rows = report.pickup?.rows ?? [];
    expect(rows.reduce((sum, row) => sum + row.shareCents, 0)).toBe(12000);
    expect(rows[0]?.shareCents).toBe(4800);
    expect(rows[0]?.balanceCents).toBe(1800);
    expect(rows[1]?.balanceCents).toBe(4800);
    expect(rows[2]?.shareCents).toBe(2400);
    expect(report.pickup?.whatsapp).toContain("volleyos.demo");
  });

  it("computes tournament profit and break-even", () => {
    const report = splitCosts({
      mode: "tournament",
      teams: 8,
      teamFee: 50,
      courtCost: 120,
      refereeCost: 20,
      prizesCost: 10,
    });
    expect(report.tournament?.revenueCents).toBe(40000);
    expect(report.tournament?.profitCents).toBe(25000);
    expect(report.tournament?.breakEvenTeams).toBe(3);
  });

  it("decodes gestures and ranks a perfect fan trivia", () => {
    const gesture = fanReport({ action: "decode", gesture: "touch_top_net" });
    expect(gesture.decision?.rule).toBe("FIVB 11.3.1");
    expect(gesture.decision?.call.en).toBe("Net touch");

    const trivia = fanReport({ action: "trivia", answers: [0, 1, 1, 1, 1] });
    expect(trivia.trivia?.score).toBe(5);
    expect(trivia.trivia?.rank).toBe("ORACULO_DE_TRIBUNA");
  });

  it("flags setter signal collisions and duplicate plays", () => {
    const report = buildSignalSheet({
      team: "Tiburones",
      assignments: [
        { gesture: "index_finger", play: "A" },
        { gesture: "index_finger", play: "Pipe" },
        { gesture: "fist", play: "A" },
      ],
    });
    expect(report.valid).toBe(false);
    expect(report.collisions).toHaveLength(1);
    expect(report.duplicatePlays).toEqual(["A"]);
    expect(report.missingGestures).toContain("pinky");
  });

  it("seals an MVP award card with six awards", async () => {
    const report = await awardMvp({
      match: "Final - Tiburones vs Marlins",
      players: [
        { name: "Ana", team: "Tiburones", points: 20, blocks: 3, aces: 2, digs: 8, votes: 4, pressurePoints: 5 },
        { name: "Beto", team: "Marlins", points: 18, blocks: 6, assists: 12, digs: 5 },
        { name: "Caro", team: "Tiburones", points: 9, digs: 20, isLibero: true },
      ],
    });
    expect(report.awards).toHaveLength(6);
    expect(report.awards[0]?.winner).toBe("Ana");
    expect(report.awards[2]?.winner).toBe("Caro");
    expect(report.seal).toMatch(/^VOS-SEAL-[0-9A-F]{32}$/);
    expect(report.shareText).toContain(report.seal);
  });
});
