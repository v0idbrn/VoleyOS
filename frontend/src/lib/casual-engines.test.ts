import { describe, expect, it } from "vitest";

import {
  COURT_CRIES,
  JUDGE_DISPUTES,
  WARMUP_PHASES,
  WARMUP_TOTAL_SECONDS,
  addPlayer,
  benchFairness,
  benchSwapMessage,
  buildOrganizer,
  capacityLabel,
  dropPlayer,
  formatMatchSheet,
  formatMissingBanner,
  judgeVerdict,
  missingCount,
  newBenchTeam,
  nextServeStreak,
  parseWhatsAppList,
  rotateWithBench,
  serveCapHit,
  serveCapMessage,
  toggleGear,
  togglePaid,
  translateCry,
  warmupClock,
  warmupPhaseAt,
} from "./casual-engines";

const GROUP = ["Tano", "Luci", "Marcos", "Julieta", "Rocío", "Fede", "Nata", "Pato", "Vero", "Chino", "Sol", "Momo", "Tini", "Coco"];

describe("whatsapp list manager", () => {
  it("parses numbered, bulleted and multiline lists", () => {
    expect(parseWhatsAppList("1. Tano, 2) Luci\n3: Marcos\n• Julieta\n- Rocío")).toEqual([
      "Tano",
      "Luci",
      "Marcos",
      "Julieta",
      "Rocío",
    ]);
  });

  it("splits beyond-cap players into the waitlist and dedupes", () => {
    const roster = buildOrganizer([...GROUP, "Tano"], 12, "Cancha Norte", "21:00");
    expect(roster.confirmed).toHaveLength(12);
    expect(roster.waitlist.map((player) => player.name)).toEqual(["Tini", "Coco"]);
    expect(roster.confirmed.filter((player) => player.name === "Tano")).toHaveLength(1);
  });

  it("promotes waitlist #1 automatically when someone drops out", () => {
    const roster = buildOrganizer(GROUP, 12, "Cancha Norte", "21:00");
    const victim = roster.confirmed[0]!;
    const { roster: next, promoted } = dropPlayer(roster, victim.id);
    expect(next.confirmed).toHaveLength(12);
    expect(next.confirmed.some((player) => player.id === victim.id)).toBe(false);
    expect(promoted?.name).toBe("Tini");
    expect(next.waitlist.map((player) => player.name)).toEqual(["Coco"]);
  });

  it("overflows manual adds into the waitlist once the cap is full", () => {
    const roster = buildOrganizer(GROUP, 12, "Cancha Norte", "21:00");
    const next = addPlayer(roster, "Tini");
    expect(next.confirmed).toHaveLength(12);
    expect(next.waitlist.map((player) => player.name)).toContain("Tini");
    expect(addPlayer(next, "Tini").waitlist).toHaveLength(next.waitlist.length);
  });

  it("toggles payment and gear badges per player", () => {
    const roster = buildOrganizer(GROUP, 12, "Cancha Norte", "21:00");
    const id = roster.confirmed[0]!.id;
    const paid = togglePaid(roster, id);
    expect(paid.confirmed[0]!.paid).toBe(true);
    const geared = toggleGear(paid, id, "ball");
    expect(geared.confirmed[0]!.gear).toEqual(["ball"]);
    expect(toggleGear(geared, id, "ball").confirmed[0]!.gear).toEqual([]);
    expect(roster.confirmed[0]!.paid).toBe(false);
  });

  it("generates the match sheet and the urgent missing sign in three languages", () => {
    const full = buildOrganizer(GROUP, 12, "Cancha Norte", "21:00");
    expect(missingCount(full)).toBe(0);
    const es = formatMatchSheet(full, "es");
    expect(es).toContain("Cancha Norte · 21:00");
    expect(es).toContain("Confirmados (12/12)");
    expect(formatMissingBanner(full, "es")).toBe("");

    const short = buildOrganizer(GROUP.slice(0, 10), 12, "Cancha Norte", "21:00");
    expect(missingCount(short)).toBe(2);
    expect(formatMissingBanner(short, "es")).toContain("NOS FALTAN 2");
    expect(formatMissingBanner(short, "en")).toContain("WE'RE 2 SHORT");
    expect(formatMissingBanner(short, "pt")).toContain("FALTAM 2");
    expect(formatMatchSheet(short, "en")).toContain("Confirmed (10/12)");
    expect(formatMatchSheet(togglePaid(short, short.confirmed[0]!.id), "es")).toContain("Seña/Pagó: 1/10");

    const complete = buildOrganizer(GROUP, 14, "Cancha Norte", "21:00");
    expect(formatMatchSheet(complete, "en")).toContain("Confirmed (14/14)");
    expect(formatMatchSheet(complete, "pt")).toContain("cheia");
  });

  it("labels capacity as teams in every language", () => {
    expect(capacityLabel(12, "es")).toBe("12 jugadores (6 vs 6)");
    expect(capacityLabel(18, "es")).toBe("18 jugadores (3 equipos)");
    expect(capacityLabel(12, "en")).toBe("12 players (6 vs 6)");
    expect(capacityLabel(9, "pt")).toBe("9 jogadores (5 vs 4)");
  });
});

describe("bench rotator for 7-10 players", () => {
  it("rejects squads outside the 7-10 range", () => {
    expect(() => newBenchTeam(["a", "b", "c", "d", "e", "f", "g"].slice(0, 6), "serve")).toThrow("bench_size");
    expect(() => newBenchTeam([..."abcdefghij"], "serve")).not.toThrow();
  });

  it("rotates zones and swaps the bench player in at the serve spot", () => {
    const team = newBenchTeam(["P1", "P2", "P3", "P4", "P5", "P6", "P7"], "serve");
    const next = rotateWithBench(team);
    expect(next.court).toEqual(["P7", "P3", "P4", "P5", "P6", "P1"]);
    expect(next.bench).toEqual(["P2"]);
    expect(next.lastSwap).toEqual({ entering: "P7", exiting: "P2", entry: "serve", zone: 1 });
    expect(benchSwapMessage(next.lastSwap!, "es")).toBe("➡️ ENTRA DEL BANCO: P7 (al Saque) · 🪑 SALE A DESCANSAR: P2");
    expect(benchSwapMessage(next.lastSwap!, "en")).toContain("BENCH IN: P7 (to Serve)");
    expect(benchSwapMessage(next.lastSwap!, "pt")).toContain("ENTRA DO BANCO: P7 (ao Saque)");
  });

  it("swaps at position VI when the entry spot is the back", () => {
    const team = newBenchTeam(["P1", "P2", "P3", "P4", "P5", "P6", "P7"], "back");
    const next = rotateWithBench(team);
    expect(next.court).toEqual(["P2", "P3", "P4", "P5", "P6", "P7"]);
    expect(next.bench).toEqual(["P1"]);
    expect(next.lastSwap?.zone).toBe(6);
  });

  it("keeps a fair 8-player rotation where nobody sits out twice in a row", () => {
    let team = newBenchTeam(["A", "B", "C", "D", "E", "F", "G", "H"], "serve");
    const entryOrder: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      team = rotateWithBench(team);
      if (team.lastSwap) entryOrder.push(team.lastSwap.entering);
    }
    expect(new Set(entryOrder).size).toBe(8);
    expect(team.court).toHaveLength(6);
    expect(team.bench).toHaveLength(2);
    const total = Object.values(team.rotations).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(8 * 6);
    expect(benchFairness(team)).toHaveLength(8);
  });

  it("credits the player heading to the bench for their stint", () => {
    const team = newBenchTeam(["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"], "serve");
    const next = rotateWithBench(team);
    expect(next.rotations["P2"]).toBe(1);
    expect(next.rotations["P7"]).toBe(0);
  });
});

describe("recreational consecutive-serve cap", () => {
  it("counts consecutive points on serve and resets on side-out", () => {
    expect(nextServeStreak(0, true)).toBe(1);
    expect(nextServeStreak(2, true)).toBe(3);
    expect(nextServeStreak(2, false)).toBe(0);
  });

  it("fires only at the configured limit and never when off", () => {
    expect(serveCapHit(2, 3)).toBe(false);
    expect(serveCapHit(3, 3)).toBe(true);
    expect(serveCapHit(9, 5)).toBe(true);
    expect(serveCapHit(9, 0)).toBe(false);
  });

  it("shows the friendly rotation banner in three languages", () => {
    expect(serveCapMessage(3, "es")).toBe(
      "🤝 ¡3 Saques seguidos! Rotación amistosa de sacador (tu equipo conserva el saque)",
    );
    expect(serveCapMessage(3, "en")).toContain("3 serves in a row!");
    expect(serveCapMessage(5, "pt")).toContain("5 saques seguidos!");
  });
});

describe("el juez del picadito", () => {
  it("awards the point to the accusing team when the fault is confirmed", () => {
    const verdict = judgeVerdict("lift", true, "A", "es");
    expect(verdict.winner).toBe("B");
    expect(verdict.text).toContain("Falta confirmada");
    expect(verdict.text).toContain("Punto para el equipo B");
  });

  it("keeps the point with the accused team when the call is denied", () => {
    const verdict = judgeVerdict("net", false, "B", "en");
    expect(verdict.winner).toBe("B");
    expect(verdict.text).toContain("No foul");
    expect(verdict.text).toContain("stays with team B");
  });

  it("covers five disputes with questions and rules in three languages", () => {
    const ids = Object.keys(JUDGE_DISPUTES);
    expect(ids).toHaveLength(5);
    for (const dispute of ["foot", "lift", "finger", "double", "net"] as const) {
      const spec = JUDGE_DISPUTES[dispute];
      for (const locale of ["es", "en", "pt"] as const) {
        expect(spec.call[locale].length).toBeGreaterThanOrEqual(3);
        expect(spec.question[locale].length).toBeGreaterThan(3);
        expect(spec.rule[locale]).toMatch(/^Rule:|Regla:|Regra:/);
      }
    }
  });
});

describe("traductor de señas y gritos", () => {
  it("finds shouts accent-insensitively across the three languages", () => {
    expect(translateCry("mia").map((cry) => cry.id)).toContain("mia");
    expect(translateCry("Mine!").map((cry) => cry.id)).toContain("mia");
    expect(translateCry("fora").map((cry) => cry.id)).toContain("fuera");
    expect(translateCry("")).toHaveLength(COURT_CRIES.length);
    expect(translateCry("zzz")).toHaveLength(0);
  });

  it("ships every shout in ES/EN/PT with a usage note", () => {
    expect(COURT_CRIES.length).toBeGreaterThanOrEqual(10);
    for (const cry of COURT_CRIES) {
      for (const locale of ["es", "en", "pt"] as const) {
        expect(cry[locale].length).toBeGreaterThan(2);
        expect(cry.when[locale].length).toBeGreaterThan(5);
      }
    }
  });
});

describe("entrada en calentamiento express de 4 minutos", () => {
  it("covers the full four minutes with contiguous phases", () => {
    expect(WARMUP_PHASES[0]!.start).toBe(0);
    expect(WARMUP_PHASES.at(-1)!.end).toBe(WARMUP_TOTAL_SECONDS);
    expect(WARMUP_TOTAL_SECONDS).toBe(240);
    for (let index = 1; index < WARMUP_PHASES.length; index += 1) {
      expect(WARMUP_PHASES[index]!.start).toBe(WARMUP_PHASES[index - 1]!.end);
    }
    const sum = WARMUP_PHASES.reduce((total, phase) => total + (phase.end - phase.start), 0);
    expect(sum).toBe(240);
  });

  it("maps elapsed seconds to the right phase and clamps at both ends", () => {
    expect(warmupPhaseAt(0).icon).toBe("🫀");
    expect(warmupPhaseAt(45).icon).toBe("🏃");
    expect(warmupPhaseAt(100).icon).toBe("🦘");
    expect(warmupPhaseAt(239).icon).toBe("🏐");
    expect(warmupPhaseAt(240).icon).toBe("🏐");
    expect(warmupPhaseAt(-10).start).toBe(0);
  });

  it("formats the countdown clock in seconds and minutes", () => {
    expect(warmupClock(0)).toBe("0:00");
    expect(warmupClock(89)).toBe("1:29");
    expect(warmupClock(240)).toBe("4:00");
    expect(warmupClock(999)).toBe("4:00");
    expect(warmupClock(-5)).toBe("0:00");
  });

  it("labels every phase in three languages", () => {
    for (const phase of WARMUP_PHASES) {
      for (const locale of ["es", "en", "pt"] as const) {
        expect(phase[locale].length).toBeGreaterThan(5);
      }
    }
  });
});
