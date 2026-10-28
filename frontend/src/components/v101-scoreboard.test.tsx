import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreboardStation } from "./stations";
import { VolleyOSHub } from "./VolleyOSHub";
import { MODULE_BY_SLUG } from "@/lib/modules";

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
    fireEvent.click(screen.getAllByRole("tab", { name: /Inicio/ }).at(-1)!);
    audit(); // Simple — nothing is removed
  });
});
