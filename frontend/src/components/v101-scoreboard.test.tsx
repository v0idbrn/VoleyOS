import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreboardStation } from "./stations";
import { VolleyOSHub } from "./VolleyOSHub";
import { MODULE_BY_SLUG } from "@/lib/modules";
import { parseScannedVoleyOSPayload } from "@/lib/qr-codec";

vi.mock("@/lib/sound-effects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sound-effects")>();
  return {
    ...actual,
    playWhistle: vi.fn(() => true),
    playBuzzer: vi.fn(() => true),
    playPicaditoCue: vi.fn(() => true),
    playScorePop: vi.fn(() => true),
    playSetWinFanfare: vi.fn(() => true),
    playCrowdCheer: vi.fn(() => true),
    playWarmupTick: vi.fn(() => true),
    playCoinClink: vi.fn(() => true),
    playJudgeGavel: vi.fn(() => true),
  };
});

const { playBuzzer, playWhistle } = await import("@/lib/sound-effects");

const noop = (): void => undefined;

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  constructor(text: string) {
    this.text = text;
  }
}

function renderBoard() {
  const meta = MODULE_BY_SLUG.get("scoreboard");
  if (!meta) throw new Error("scoreboard module missing");
  return render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
}

describe("v10.1 scoreboard: on-board editors", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak: vi.fn(), cancel: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("corrects a partial or miscounted score directly on the board", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("score-edit-open"));
    const inputA = screen.getByTestId("score-edit-a");
    fireEvent.change(inputA, { target: { value: "18" } });
    fireEvent.blur(inputA);
    expect(screen.getByTestId("score-a").textContent).toContain("18");

    const inputB = screen.getByTestId("score-edit-b");
    fireEvent.change(inputB, { target: { value: "21" } });
    fireEvent.blur(inputB);
    expect(screen.getByTestId("score-b").textContent).toContain("21");
    fireEvent.click(screen.getByTestId("score-edit-done"));
    expect(screen.queryByTestId("score-edit-a")).toBeNull();
  });

  it("renames both teams from the board and keeps the new names while scoring", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("team-edit-open"));
    const inputA = screen.getByTestId("team-edit-a");
    expect(inputA).toHaveProperty("value", "Tiburones");
    fireEvent.change(inputA, { target: { value: "Toros FC" } });
    fireEvent.click(screen.getByTestId("team-edit-save"));
    const point = screen.getByRole("button", { name: "+ Toros FC [A]" });
    fireEvent.click(point);
    expect(screen.getByTestId("score-a").textContent).toContain("1");
  });

  it("stores the brand colour picked for each side on the score panel", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("team-edit-open"));
    fireEvent.change(screen.getByTestId("team-color-a"), { target: { value: "#123456" } });
    const panels = document.querySelectorAll("[data-side-color]");
    expect(panels.length).toBeGreaterThan(0);
    expect(panels[0]).toHaveAttribute("data-side-color", "#123456");
  });
});

describe("v10.1 scoreboard: Simple/Pro and Solo Equipos", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Simple mode strips the advanced panels but keeps scoring alive", () => {
    renderBoard();
    // Pro (default): presets, box score and lineup are present.
    expect(screen.getByRole("button", { name: /Picadito/ })).toBeTruthy();
    expect(screen.getByTestId("box-score-toggle")).toBeTruthy();
    expect(screen.getByText("Z1")).toBeTruthy();

    fireEvent.click(screen.getByTestId("ui-mode-toggle"));
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("simple");
    expect(screen.queryByRole("button", { name: /Picadito/ })).toBeNull();
    expect(screen.queryByTestId("box-score-toggle")).toBeNull();
    expect(screen.queryByText("Z1")).toBeNull();
    // Scoring stays one tap away.
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    expect(screen.getByTestId("score-a").textContent).toContain("1");

    fireEvent.click(screen.getByTestId("ui-mode-toggle"));
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("pro");
    expect(screen.getByRole("button", { name: /Picadito/ })).toBeTruthy();
  });

  it("Solo Equipos hides player-level scouting and the box score", () => {
    renderBoard();
    const toggle = screen.getByTestId("solo-teams-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Z1")).toBeTruthy();

    fireEvent.click(toggle);
    expect(window.localStorage.getItem("volleyos.soloTeams")).toBe("1");
    expect(screen.getByTestId("solo-teams-toggle").getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Z1")).toBeNull();
    expect(screen.queryByTestId("box-score-toggle")).toBeNull();

    fireEvent.click(screen.getByTestId("solo-teams-toggle"));
    expect(window.localStorage.getItem("volleyos.soloTeams")).toBe("0");
    expect(screen.getByText("Z1")).toBeTruthy();
  });
});

describe("v10.1 scoreboard: sound bar routing", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak: vi.fn(), cancel: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("routes the whistle, buzzer, crowd and audio-test buttons", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("sound-whistle"));
    expect(playWhistle).toHaveBeenCalledWith("short");

    fireEvent.click(screen.getByTestId("sound-buzzer"));
    expect(playBuzzer).toHaveBeenCalledTimes(1);

    const crowd = screen.getByTestId("sound-crowd");
    const before = crowd.getAttribute("aria-pressed");
    fireEvent.click(crowd);
    expect(crowd.getAttribute("aria-pressed")).not.toBe(before);

    fireEvent.click(screen.getByTestId("sound-pass"));
    expect(playWhistle).toHaveBeenLastCalledWith("short");
    expect(document.body.textContent).toContain("Audio listo");
  });
});

describe("v10.1 web back-gesture guard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("bounces popstate while a match has points on the board", () => {
    renderBoard();
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    expect((window.history.state as { vosBackGuard?: number } | null)?.vosBackGuard).toBe(1);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect((window.history.state as { vosBackGuard?: number } | null)?.vosBackGuard).toBe(1);
    expect(document.body.textContent).toContain("Partido en curso");
  });
});

describe("v10.1 hub: top-level Simple/Pro toggle keeps every tab", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("audits the tab strip in both modes with full module coverage", () => {
    render(<VolleyOSHub locale="es" />);
    const audit = () => {
      expect(screen.getAllByTestId("module-card").length).toBeGreaterThan(47);
      expect(screen.getAllByRole("tab").length).toBeGreaterThan(5);
      expect(screen.getAllByRole("tab", { name: /Cancha/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("tab", { name: /Ajustes/ }).length).toBeGreaterThan(0);
    };

    audit(); // Pro (default)
    fireEvent.click(screen.getByRole("tab", { name: /Ajustes/ }));
    const toggle = screen.getByTestId("hub-mode-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("simple");
    expect(screen.getByTestId("hub-mode-toggle").getAttribute("aria-pressed")).toBe("true");
    // v10.1.3: Simple Mode intentionally collapses the strip to 3 tabs…
    expect(screen.getAllByRole("tab").length).toBeLessThan(6);
    expect(screen.getAllByRole("tab", { name: /Cancha/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: /Ajustes/ }).length).toBeGreaterThan(0);
    // …while the full launcher stays reachable from its home tab.
    fireEvent.click(screen.getAllByRole("tab", { name: /Picadito & Amigos/ }).at(-1)!);
    expect(screen.getAllByTestId("module-card").length).toBeGreaterThan(47);
  });

  it("shares the app through the Web Share API", async () => {
    const share = vi.fn(async (_data?: ShareData) => undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Ajustes/ }));
    fireEvent.click(screen.getByTestId("share-app"));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://volleyos.app" }));
    expect(screen.getByTestId("share-result")).toBeTruthy();
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
});

describe("v10.2 Cancha: hard-reset engine, set sync and native volume keys", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak: vi.fn(), cancel: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    delete (window as unknown as { VoleyOSBridge?: unknown }).VoleyOSBridge;
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { VoleyOSBridge?: unknown }).VoleyOSBridge;
    delete (window as unknown as { __vosHardwareVolumeKey?: unknown }).__vosHardwareVolumeKey;
  });

  const edit = (values: { a?: string; b?: string; sa?: string; sb?: string }): void => {
    fireEvent.click(screen.getByTestId("score-edit-open"));
    const patch: Record<string, string> = {};
    if (values.a !== undefined) patch["score-edit-a"] = values.a;
    if (values.b !== undefined) patch["score-edit-b"] = values.b;
    if (values.sa !== undefined) patch["sets-edit-a"] = values.sa;
    if (values.sb !== undefined) patch["sets-edit-b"] = values.sb;
    for (const [id, value] of Object.entries(patch)) {
      fireEvent.change(screen.getByTestId(id), { target: { value } });
    }
    fireEvent.click(screen.getByTestId("score-edit-apply"));
  };

  it("🔄 Nuevo Partido (0-0) wipes points, sets and setHistory after a finished match and undoes cleanly", () => {
    renderBoard();
    edit({ sa: "2", sb: "0" });
    expect(screen.getByTestId("match-winner-banner")).toBeTruthy();
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 3");

    fireEvent.click(screen.getByTestId("reset-match-btn"));
    expect(screen.getByTestId("score-a").textContent).toContain("0");
    expect(screen.getByTestId("score-b").textContent).toContain("0");
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 1");
    expect(screen.queryByTestId("match-winner-banner")).toBeNull();
    expect(document.body.textContent).toContain("Sets 0");

    fireEvent.click(screen.getByRole("button", { name: /\[Z\] Deshacer/ }));
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 3");
    expect(screen.getByTestId("match-winner-banner")).toBeTruthy();
  });

  it("↺ Reiniciar Set zeroes the points but keeps homeSets, awaySets and setHistory", () => {
    renderBoard();
    edit({ a: "14", b: "11", sa: "1", sb: "0" });
    expect(screen.getByTestId("score-a").textContent).toContain("14");
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 2");

    fireEvent.click(screen.getByTestId("reset-set-btn"));
    expect(screen.getByTestId("score-a").textContent).toContain("0");
    expect(screen.getByTestId("score-b").textContent).toContain("0");
    expect(screen.getByText("Sets 1")).toBeTruthy();
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 2");
    expect(screen.queryByTestId("match-winner-banner")).toBeNull();
  });

  it("✏️ Apply syncs setHistory so the badge jumps to SET 3 and scoring keeps flowing", () => {
    renderBoard();
    edit({ a: "14", b: "11", sa: "1", sb: "1" });
    expect(screen.getByTestId("set-badge").textContent).toContain("SET 3");
    expect(screen.getByTestId("set-indicator").textContent).toContain("SET 3");
    expect(screen.queryByTestId("match-winner-banner")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    expect(screen.getByTestId("score-a").textContent).toContain("15");
  });

  it("🔊 volume-key scoring arms the native bridge and window.__vosHardwareVolumeKey scores both columns", () => {
    // kept below the v10.2.2 multi-admin suite
    const setVolumeKeyScoring = vi.fn();
    (window as unknown as { VoleyOSBridge?: unknown }).VoleyOSBridge = { setVolumeKeyScoring };
    renderBoard();
    expect(setVolumeKeyScoring).toHaveBeenLastCalledWith(false);

    const toggle = screen.getByTestId("volume-scoring-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem("volleyos.volumeScoring")).toBe("1");
    expect(setVolumeKeyScoring).toHaveBeenLastCalledWith(true);

    const win = window as unknown as { __vosHardwareVolumeKey?: (dir: "up" | "down") => void };
    expect(typeof win.__vosHardwareVolumeKey).toBe("function");
    act(() => {
      win.__vosHardwareVolumeKey?.("up");
    });
    expect(screen.getByTestId("score-a").textContent).toContain("1");
    act(() => {
      win.__vosHardwareVolumeKey?.("down");
    });
    expect(screen.getByTestId("score-b").textContent).toContain("1");
  });
});

describe("v10.2.2 multi-admin co-scoring & Todos Anotan", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak: vi.fn(), cancel: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { __vosApplyCoAdminAction?: unknown }).__vosApplyCoAdminAction;
  });

  it("switches the room between 👁️ Solo Mirar, 🤝 Co-Admins and 🍻 Todos Anotan", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("live-cast-open"));
    expect(screen.getByTestId("live-cast-modal")).toBeTruthy();
    expect(screen.getByTestId("live-access-mode-spectator").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("live-access-mode-open"));
    expect(screen.getByTestId("live-access-mode-open").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("live-access-mode-spectator").getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("volleyos.accessMode")).toBe("open");

    fireEvent.click(screen.getByTestId("live-access-mode-coadmin"));
    expect(screen.getByTestId("live-access-mode-coadmin").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("live-access-mode-open").getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("volleyos.accessMode")).toBe("coadmin");

    fireEvent.change(screen.getByTestId("live-actor-name"), { target: { value: "Tano" } });
    expect(window.localStorage.getItem("volleyos.actorName")).toBe("Tano");
  });

  it("applies a higher-revision co-admin action and badges the co-scorer by name", () => {
    renderBoard();
    const win = window as unknown as {
      __vosApplyCoAdminAction?: (payload: { action?: string; actor?: string }) => void;
    };
    expect(typeof win.__vosApplyCoAdminAction).toBe("function");

    act(() => {
      win.__vosApplyCoAdminAction?.({ action: "home_plus", actor: "Tano" });
    });
    expect(screen.getByTestId("score-a").textContent).toContain("1");
    expect(screen.getByTestId("coadmin-badge").textContent).toContain("Tano");

    act(() => {
      win.__vosApplyCoAdminAction?.({ action: "away_plus", actor: "Amiga" });
    });
    expect(screen.getByTestId("score-b").textContent).toContain("1");

    act(() => {
      win.__vosApplyCoAdminAction?.({ action: "swap_serve", actor: "Mesa 1" });
    });
    act(() => {
      win.__vosApplyCoAdminAction?.({ action: "reset_set", actor: "Mesa 1" });
    });
    expect(screen.getByTestId("score-a").textContent).toContain("0");
    expect(screen.getByTestId("score-b").textContent).toContain("0");
    expect(screen.getByTestId("coadmin-badge").textContent).toContain("Mesa 1");
  });

  it("parseScannedVoleyOSPayload preserves role=coadmin and mode=open", () => {
    expect(
      parseScannedVoleyOSPayload("https://voleyos.app/?room=CANCHA-ABCD&role=coadmin&pin=4321"),
    ).toEqual({ type: "live_room", roomId: "CANCHA-ABCD", role: "coadmin", adminPin: "4321" });
    expect(parseScannedVoleyOSPayload("https://voleyos.app/?room=CANCHA-EFGH&mode=open")).toEqual({
      type: "live_room",
      roomId: "CANCHA-EFGH",
      role: "open",
    });
    expect(parseScannedVoleyOSPayload("https://example.com/invite?room=CANCHA-JKLM&role=coadmin&pin=0007")).toEqual({
      type: "live_room",
      roomId: "CANCHA-JKLM",
      role: "coadmin",
      adminPin: "0007",
    });
  });
});
