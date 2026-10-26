import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncWidgetSnapshot } from "@/lib/widget-bridge";
import { newScoreboard } from "@/lib/local-engines";
import type { OrganizerRoster } from "@/lib/casual-engines";

const roster: OrganizerRoster = {
  venue: "Cancha Municipal",
  time: "21:00",
  capacity: 12,
  confirmed: [{ id: "ana", name: "Ana", paid: false, gear: [] }],
  waitlist: [],
};

describe("android widget snapshot bridge", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    delete (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge;
    window.localStorage.clear();
  });

  it("does nothing (and never throws) when the bridge is absent", () => {
    expect(() => syncWidgetSnapshot()).not.toThrow();
  });

  it("pushes the composed match, score and next-game snapshot", () => {
    const updateWidgetSnapshot = vi.fn();
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = { updateWidgetSnapshot };
    window.localStorage.setItem(
      "volleyos.liveScoreboard",
      JSON.stringify(newScoreboard("Tiburones", "Cóndores", 3, { scoreA: 14, scoreB: 12, setsA: 1 })),
    );
    window.localStorage.setItem("voleyos_flow_roster_v1", JSON.stringify(roster));

    syncWidgetSnapshot();

    expect(updateWidgetSnapshot).toHaveBeenCalledTimes(1);
    const [title, line, next] = updateWidgetSnapshot.mock.calls[0] as [string, string, string];
    expect(title).toBe("🏐 Tiburones vs Cóndores");
    expect(line).toBe("14 - 12 · Sets 1-0");
    expect(next).toBe("📋 Hoy 21:00 · Cancha Municipal");
  });

  it("falls back to the idle defaults without a match or a roster", () => {
    const updateWidgetSnapshot = vi.fn();
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = { updateWidgetSnapshot };

    syncWidgetSnapshot();

    const [title, line, next] = updateWidgetSnapshot.mock.calls[0] as [string, string, string];
    expect(title).toContain("Listo para jugar");
    expect(line).toContain("Tocá para abrir Marcador");
    expect(next).toBe("📋 Sin turno agendado");
  });
});
