import { describe, expect, it } from "vitest";

import { WHISTLE_PLANS, whistleDurationMs } from "./court-audio";

describe("court audio", () => {
  it("keeps whistle plans ordered and audible", () => {
    for (const plan of Object.values(WHISTLE_PLANS)) {
      expect(plan.length).toBeGreaterThan(0);
      for (const step of plan) {
        expect(step.frequency).toBeGreaterThan(1000);
        expect(step.durationMs).toBeGreaterThan(50);
        expect(step.gain).toBeGreaterThan(0);
        expect(step.gain).toBeLessThanOrEqual(1);
      }
    }
    expect(whistleDurationMs("double")).toBeGreaterThan(whistleDurationMs("short"));
    expect(whistleDurationMs("long")).toBeGreaterThan(whistleDurationMs("double"));
  });
});
