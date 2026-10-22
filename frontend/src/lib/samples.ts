import type { DailyJumps, MatchResult, PickupPlayer, ScoutEvent } from "@/lib/local-engines";

export const SCOUT_SAMPLE: ScoutEvent[] = [
  { player: 4, skill: "serve", rotation: 1, targetZone: 5, result: "ACE" },
  { player: 7, skill: "attack", rotation: 1, originZone: 4, targetZone: 5, direction: "diagonal", result: "KILL", sideOut: true },
  { player: 7, skill: "attack", rotation: 1, originZone: 4, targetZone: 1, direction: "line", result: "BLOCKED", sideOut: true },
  { player: 9, skill: "attack", rotation: 2, originZone: 2, targetZone: 6, direction: "cross", result: "KILL", sideOut: true },
  { player: 9, skill: "attack", rotation: 2, originZone: 2, targetZone: 6, direction: "cross", result: "ERROR", sideOut: true },
  { player: 11, skill: "attack", rotation: 3, originZone: 3, targetZone: 5, direction: "short", result: "ERROR", sideOut: true },
  { player: 11, skill: "attack", rotation: 3, originZone: 3, targetZone: 1, direction: "deep", result: "ERROR", sideOut: true },
  { player: 7, skill: "attack", rotation: 4, originZone: 4, targetZone: 5, direction: "diagonal", result: "KILL", sideOut: true },
  { player: 7, skill: "attack", rotation: 4, originZone: 4, targetZone: 1, direction: "line", result: "KILL", sideOut: true },
  { player: 9, skill: "attack", rotation: 5, originZone: 2, targetZone: 6, direction: "cross", result: "IN_PLAY", sideOut: true },
  { player: 9, skill: "attack", rotation: 5, originZone: 2, targetZone: 6, direction: "cross", result: "KILL", sideOut: true },
  { player: 11, skill: "attack", rotation: 6, originZone: 3, targetZone: 1, direction: "short", result: "KILL", sideOut: true },
];

export const TOURNAMENT_TEAMS = ["Tiburones", "Cóndores", "Panteras", "Halcones", "Lobos", "Águilas", "Pumas", "Titanes"];

export const TOURNAMENT_MATCHES: MatchResult[] = [
  { home: "Tiburones", away: "Cóndores", homeSets: 3, awaySets: 1, homePoints: 96, awayPoints: 84 },
  { home: "Panteras", away: "Halcones", homeSets: 3, awaySets: 2, homePoints: 104, awayPoints: 101 },
  { home: "Lobos", away: "Águilas", homeSets: 3, awaySets: 0, homePoints: 75, awayPoints: 58 },
  { home: "Pumas", away: "Titanes", homeSets: 2, awaySets: 3, homePoints: 99, awayPoints: 102 },
  { home: "Tiburones", away: "Panteras", homeSets: 3, awaySets: 2, homePoints: 111, awayPoints: 108 },
  { home: "Cóndores", away: "Halcones", homeSets: 3, awaySets: 0, homePoints: 75, awayPoints: 61 },
  { home: "Lobos", away: "Pumas", homeSets: 1, awaySets: 3, homePoints: 88, awayPoints: 97 },
  { home: "Águilas", away: "Titanes", homeSets: 3, awaySets: 1, homePoints: 95, awayPoints: 82 },
  { home: "Tiburones", away: "Lobos", homeSets: 3, awaySets: 0, homePoints: 76, awayPoints: 60 },
  { home: "Panteras", away: "Pumas", homeSets: 3, awaySets: 1, homePoints: 94, awayPoints: 81 },
  { home: "Cóndores", away: "Águilas", homeSets: 3, awaySets: 2, homePoints: 107, awayPoints: 104 },
  { home: "Halcones", away: "Titanes", homeSets: 3, awaySets: 0, homePoints: 75, awayPoints: 55 },
];

export const PICKUP_SAMPLE: PickupPlayer[] = [
  { name: "Sofía", role: "armador", level: 5 },
  { name: "Camila", role: "punta", level: 4 },
  { name: "Valentina", role: "central", level: 4 },
  { name: "Micaela", role: "opuesto", level: 3 },
  { name: "Julieta", role: "libero", level: 3 },
  { name: "Renata", role: "universal", level: 2 },
  { name: "Carla", role: "armador", level: 4 },
  { name: "Daniela", role: "punta", level: 5 },
  { name: "Antonella", role: "central", level: 3 },
  { name: "Florencia", role: "opuesto", level: 2 },
  { name: "Martina", role: "libero", level: 2 },
  { name: "Lucía", role: "universal", level: 1 },
];

export function acwrSample(): DailyJumps[] {
  const end = Date.UTC(2026, 9, 22);
  return Array.from({ length: 28 }, (_, index) => {
    const stamp = new Date(end - (27 - index) * 86_400_000).toISOString().slice(0, 10);
    const base = 90 + (index % 5) * 8;
    return { date: stamp, jumps: index >= 21 ? 185 : base };
  });
}
