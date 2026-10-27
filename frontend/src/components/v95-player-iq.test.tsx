import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnginePreviewStation, RotationStation, VolleycardStation } from "./stations";
import { ATHLETE_RECORDS_KEY } from "@/lib/athlete-records";
import { PICKUP_AWARDS_KEY, loadPickupAwards, recordPickupAward } from "@/lib/casual-engines";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { SEASON_KEY } from "@/lib/season-vault";

vi.mock("@/lib/sound-effects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sound-effects")>();
  return {
    ...actual,
    playLevelUpArpeggio: vi.fn(() => true),
    playWarmupTick: vi.fn(() => true),
  };
});

vi.mock("@/lib/court-audio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/court-audio")>();
  return {
    ...actual,
    playWhistle: vi.fn(() => true),
    playArenaCue: vi.fn(() => true),
  };
});

const { playLevelUpArpeggio, playWarmupTick } = await import("@/lib/sound-effects");
const { playWhistle } = await import("@/lib/court-audio");

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;

/** Steps the fake clock one second per act so React renders every tick. */
const stepSeconds = (seconds: number): void => {
  for (let index = 0; index < seconds; index += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

describe("v9.5 player IQ", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("tracks the setter across R1-R6 with neighbour constraints and the action card", () => {
    render(<RotationStation meta={meta("rotation")} locale="es" onSave={noop} />);
    expect(screen.queryByTestId("role-card")).toBeNull();

    fireEvent.click(screen.getByTestId("role-S"));
    expect(screen.getByTestId("role-card")).toBeTruthy();
    expect(screen.getByTestId("tracked-zone-1")).toBeTruthy();

    // Rotation-1: S at zone 1 (back-right) -> behind #2, left of #6's row side.
    expect(screen.getByTestId("constraint-line-behind-2")).toBeTruthy();
    expect(screen.getByTestId("constraint-line-left-6")).toBeTruthy();
    expect(screen.getByTestId("role-constraints").textContent).toContain("No pasar adelante de #2");
    expect(screen.getByTestId("role-card").textContent).toContain("Zona 1 en la rotación 1");

    const expected: Record<number, string[]> = {
      2: ["constraint-line-behind-3", "constraint-line-left-5", "constraint-line-right-1"],
      3: ["constraint-line-behind-4", "constraint-line-right-6"],
      4: ["constraint-line-ahead-5", "constraint-line-right-3"],
      5: ["constraint-line-ahead-6", "constraint-line-left-4", "constraint-line-right-2"],
      6: ["constraint-line-ahead-1", "constraint-line-left-3"],
    };
    for (const [rotation, lines] of Object.entries(expected)) {
      fireEvent.click(screen.getByRole("button", { name: `R${rotation}` }));
      for (const line of lines) expect(screen.getByTestId(line)).toBeTruthy();
      expect(screen.getByTestId("role-card").textContent).toContain(`en la rotación ${rotation}`);
    }

    // The K1/K2 phase toggle rewrites the enroque instruction.
    fireEvent.click(screen.getByTestId("phase-k2"));
    expect(screen.getByTestId("phase-k2").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("role-card").textContent).toContain("Sacá desde la zona 2 y volvé a tu base");
    fireEvent.click(screen.getByTestId("phase-k1"));
    expect(screen.getByTestId("role-card").textContent).toContain("Apenas saquen ellos, corré de la zona 2");

    // The libero never rotates: card stays, constraint lines disappear.
    fireEvent.click(screen.getByTestId("role-L"));
    expect(screen.getByTestId("role-card").textContent).toContain("El líbero no rota");
    expect(screen.queryByTestId("constraint-line-ahead-1")).toBeNull();

    // MB lights both middle zones in Volt Gold (back at rotation 1).
    fireEvent.click(screen.getByRole("button", { name: "R1" }));
    fireEvent.click(screen.getByTestId("role-MB"));
    expect(screen.getByTestId("tracked-zone-3")).toBeTruthy();
    expect(screen.getByTestId("tracked-zone-5")).toBeTruthy();

    fireEvent.click(screen.getByTestId("role-all"));
    expect(screen.queryByTestId("role-card")).toBeNull();
  });

  it("runs the 5x45s/90s isometric tendon protocol hands-free", () => {
    vi.useFakeTimers();
    render(<EnginePreviewStation meta={meta("injury-prehab")} locale="es" onSave={noop} />);
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:45");
    expect(screen.getByTestId("tendon-set").textContent).toContain("Serie 1 de 5");

    fireEvent.click(screen.getByTestId("tendon-start"));
    expect(screen.getByTestId("tendon-phase").textContent).toContain("Sentadilla isom");
    expect(playWhistle).toHaveBeenCalledWith("short");

    stepSeconds(45);
    // Hold 1 done -> 90s rest with the long whistle and 5 countdown ticks.
    expect(screen.getByTestId("tendon-clock").textContent).toBe("1:30");
    expect(screen.getByTestId("tendon-phase").textContent).toContain("Pausa activa");
    expect(playWhistle).toHaveBeenCalledWith("long");
    expect(playWarmupTick).toHaveBeenCalledTimes(5);

    stepSeconds(90);
    expect(screen.getByTestId("tendon-set").textContent).toContain("Serie 2 de 5");
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:45");
    expect(playWhistle).toHaveBeenCalledTimes(3);

    // Finish holds 2-5 and rests 2-4 (4 holds + 3 rests + final hold).
    stepSeconds(4 * 45 + 3 * 90 + 45);
    expect(screen.getByTestId("tendon-phase").textContent).toContain("Protocolo completo");
    expect(screen.getByTestId("tendon-set").textContent).toContain("Serie 5 de 5");
    expect(playWhistle).toHaveBeenCalledWith("double");
    // 5 holds x 5 ticks + 4 rests x 5 ticks.
    expect(playWarmupTick).toHaveBeenCalledTimes(45);
    // 5 short (starts) + 4 long (rests) + 1 double (finish).
    expect(playWhistle).toHaveBeenCalledTimes(10);
  });

  it("pauses, resumes and resets without losing the protocol", () => {
    vi.useFakeTimers();
    render(<EnginePreviewStation meta={meta("injury-prehab")} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByTestId("tendon-start"));
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:35");

    fireEvent.click(screen.getByTestId("tendon-pause"));
    expect(screen.getByTestId("tendon-phase").textContent).toContain("En pausa");
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:35");

    fireEvent.click(screen.getByTestId("tendon-start"));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:30");

    fireEvent.click(screen.getByTestId("tendon-reset"));
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:45");
    expect(screen.getByTestId("tendon-phase").textContent).toContain("Listo");
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId("tendon-clock").textContent).toBe("0:45");
  });

  it("syncs the career VolleyCard from real records and arpeggios on an OVR level-up", () => {
    window.localStorage.setItem(
      ATHLETE_RECORDS_KEY,
      JSON.stringify([{ date: "2026-10-27", flightMs: 520, heightCm: 58 }]),
    );
    window.localStorage.setItem(
      SEASON_KEY,
      JSON.stringify([
        {
          id: "m1",
          date: "2026-10-01",
          mode: "oficial",
          teamA: "Tiburones",
          teamB: "Lobos",
          setsA: 2,
          setsB: 0,
          setScores: [{ setNumber: 1, a: 25, b: 20 }],
          winner: "A",
        },
        {
          id: "m2",
          date: "2026-10-02",
          mode: "oficial",
          teamA: "Tiburones",
          teamB: "Lobos",
          setsA: 0,
          setsB: 2,
          setScores: [{ setNumber: 1, a: 20, b: 25 }],
          winner: "B",
        },
      ]),
    );
    window.localStorage.setItem(PICKUP_AWARDS_KEY, "3");

    render(<VolleycardStation meta={meta("volleycard")} locale="es" onSave={noop} />);
    expect(screen.queryByTestId("career-stats")).toBeNull();

    fireEvent.click(screen.getByTestId("sync-career"));
    const stats = screen.getByTestId("career-stats");
    expect(stats.textContent).toContain("JMP70");
    expect(stats.textContent).toContain("ATK73");
    expect(stats.textContent).toContain("DEF65");
    expect(stats.textContent).toContain("IQ42");
    expect(stats.textContent).toContain("OVR63");
    // The card adopts the saved jump (58cm -> 308cm spike reach -> ROOKIE).
    expect(screen.getByText(/ROOKIE/)).toBeTruthy();
    expect(screen.getByTestId("career-msg").textContent).toContain("Tarjeta sincronizada");
    expect(playLevelUpArpeggio).not.toHaveBeenCalled();

    // A new personal best lifts OVR 63 -> 73 and plays the level-up arpeggio.
    window.localStorage.setItem(
      ATHLETE_RECORDS_KEY,
      JSON.stringify([{ date: "2026-10-28", flightMs: 640, heightCm: 81 }]),
    );
    fireEvent.click(screen.getByTestId("sync-career"));
    expect(screen.getByTestId("career-stats").textContent).toContain("OVR73");
    expect(screen.getByTestId("career-msg").textContent).toContain("OVR subió");
    expect(playLevelUpArpeggio).toHaveBeenCalledTimes(1);
    // 81cm jump -> 331cm spike reach -> ELITE.
    expect(screen.getByText(/ELITE/)).toBeTruthy();
  });

  it("counts earned pickup awards and ignores garbage storage", () => {
    expect(loadPickupAwards()).toBe(0);
    expect(recordPickupAward()).toBe(1);
    expect(recordPickupAward()).toBe(2);
    expect(window.localStorage.getItem(PICKUP_AWARDS_KEY)).toBe("2");
    expect(loadPickupAwards()).toBe(2);
    window.localStorage.setItem(PICKUP_AWARDS_KEY, "junk");
    expect(loadPickupAwards()).toBe(0);
  });
});
