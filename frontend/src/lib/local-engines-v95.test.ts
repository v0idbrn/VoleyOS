import { describe, expect, it } from "vitest";

import { ROLE_HOME_ZONES, roleZones, zoneNeighbors } from "@/lib/local-engines";

describe("1st-person rotation role tracker", () => {
  it("keeps the documented rotation-1 home zones", () => {
    expect(ROLE_HOME_ZONES).toEqual({ S: [1], OPP: [2], OH1: [4], OH2: [6], MB: [3, 5] });
  });

  it("walks every rotating role clockwise across R1-R6", () => {
    const clockwise = (zone: number): number => (zone === 1 ? 6 : zone - 1);
    for (const role of ["S", "OPP", "OH1", "OH2", "MB"] as const) {
      let previous = roleZones(role, 1);
      expect(previous).toEqual([...ROLE_HOME_ZONES[role]]);
      for (let rotation = 2; rotation <= 6; rotation += 1) {
        const zones = roleZones(role, rotation);
        expect(zones).toEqual(previous.map(clockwise));
        for (const zone of zones) {
          expect(zone).toBeGreaterThanOrEqual(1);
          expect(zone).toBeLessThanOrEqual(6);
        }
        previous = zones;
      }
      // A seventh rotation would leave the legal court.
      expect(() => roleZones(role, 7)).toThrow("rotation must be 1..6");
    }
  });

  it("sends the S 1 -> 6 -> 5 -> 4 -> 3 -> 2 and never rotates the libero", () => {
    expect([1, 2, 3, 4, 5, 6].map((rotation) => roleZones("S", rotation)[0])).toEqual([1, 6, 5, 4, 3, 2]);
    expect(roleZones("MB", 1)).toEqual([3, 5]);
    expect(roleZones("L", 3)).toEqual([]);
    expect(roleZones("all", 3)).toEqual([]);
    expect(() => roleZones("S", 0)).toThrow("rotation must be 1..6");
  });

  it("pairs the vertical FIVB 7.4 couples exactly", () => {
    expect(zoneNeighbors(5)[0]).toEqual({ side: "behind", mate: 4 });
    expect(zoneNeighbors(6)[0]).toEqual({ side: "behind", mate: 3 });
    expect(zoneNeighbors(1)[0]).toEqual({ side: "behind", mate: 2 });
    expect(zoneNeighbors(4)[0]).toEqual({ side: "ahead", mate: 5 });
    expect(zoneNeighbors(3)[0]).toEqual({ side: "ahead", mate: 6 });
    expect(zoneNeighbors(2)[0]).toEqual({ side: "ahead", mate: 1 });
  });

  it("keeps horizontal mates inside the same row for every zone", () => {
    const front = new Set([4, 3, 2]);
    const back = new Set([5, 6, 1]);
    for (let zone = 1; zone <= 6; zone += 1) {
      const neighbors = zoneNeighbors(zone);
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
      const row = front.has(zone) ? front : back;
      for (const neighbor of neighbors.slice(1)) {
        expect(["left", "right"]).toContain(neighbor.side);
        expect(row.has(neighbor.mate)).toBe(true);
        expect(neighbor.mate).not.toBe(zone);
      }
      // The middle of each row is boxed in from both sides.
      if (zone === 3 || zone === 6) expect(neighbors).toHaveLength(3);
    }
    expect(() => zoneNeighbors(0)).toThrow("zone must be 1..6");
    expect(() => zoneNeighbors(7)).toThrow("zone must be 1..6");
  });
});
