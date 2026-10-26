import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CasualPlayerSuite } from "./CasualPlayerSuite";
import { ScoreboardStation } from "./stations";
import { MODULE_BY_SLUG } from "@/lib/modules";

vi.mock("@/lib/sound-effects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sound-effects")>();
  return {
    ...actual,
    playPicaditoCue: vi.fn(() => true),
    playScorePop: vi.fn(() => true),
    playSetWinFanfare: vi.fn(() => true),
    playCrowdCheer: vi.fn(() => true),
    playWarmupTick: vi.fn(() => true),
    playCoinClink: vi.fn(() => true),
    playJudgeGavel: vi.fn(() => true),
    playWhistle: vi.fn(() => true),
  };
});

const { playCoinClink, playJudgeGavel, playPicaditoCue, playWarmupTick, playWhistle } = await import(
  "@/lib/sound-effects"
);

const meta = MODULE_BY_SLUG.get("scoreboard");
if (!meta) throw new Error("scoreboard module missing");

const noop = (): void => undefined;

const speak = vi.fn();
const cancelSpeech = vi.fn();

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  constructor(text: string) {
    this.text = text;
  }
}

describe("court audio wiring", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "speechSynthesis", {
      value: { speak, cancel: cancelSpeech },
      configurable: true,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("scores with the picadito audio grammar: ace, side-out, then a kill", () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    const home = screen.getByRole("button", { name: "+ Tiburones [A]" });
    const away = screen.getByRole("button", { name: "+ Cóndores [L]" });

    fireEvent.click(home);
    expect(playPicaditoCue).toHaveBeenLastCalledWith("ace");

    fireEvent.click(away);
    expect(playPicaditoCue).toHaveBeenLastCalledWith("sideout");

    fireEvent.click(home);
    fireEvent.click(home);
    fireEvent.click(home);
    fireEvent.click(away);
    expect(playPicaditoCue).toHaveBeenLastCalledWith("kill");
  });

  it("whistles the friendly double-chirp when the 3-serve cap kicks in", () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /⚡ Picadito/ }));
    fireEvent.click(screen.getByRole("button", { name: "3 Saques" }));
    const home = screen.getByRole("button", { name: "+ Tiburones [A]" });
    for (let index = 0; index < 4; index += 1) fireEvent.click(home);
    expect(playPicaditoCue).toHaveBeenCalledWith("serve_cap");
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("announces the score and server over TTS only while the voice toggle is ON", async () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    const toggle = screen.getByTestId("voice-toggle");
    expect(toggle.textContent).toContain("OFF");

    fireEvent.click(toggle);
    expect(window.localStorage.getItem("volleyos.voice")).toBe("1");
    expect(toggle.textContent).toContain("ON");

    speak.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    await waitFor(() => expect(speak).toHaveBeenCalled());
    const announced = String(speak.mock.calls.at(-1)?.[0]?.text ?? "");
    expect(announced).toContain("1 a 0");
    expect(announced).toContain("Tiburones");

    fireEvent.click(toggle);
    expect(window.localStorage.getItem("volleyos.voice")).toBe("0");
    speak.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "+ Cóndores [L]" }));
    expect(speak).not.toHaveBeenCalled();
  });

  it("runs the 3-2-1 warmup ticks, phase whistle and finishing double", () => {
    vi.useFakeTimers();
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Calentamiento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Empezar/ }));
    for (let second = 1; second <= 240; second += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(vi.mocked(playWarmupTick).mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(vi.mocked(playWarmupTick).mock.calls.some(([finalSecond]) => finalSecond === true)).toBe(true);
    expect(playWhistle).toHaveBeenCalledWith("short");
    expect(playWhistle).toHaveBeenCalledWith("double");
  });

  it("drops the gavel on every Judge ruling", () => {
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /El Juez/ }));
    fireEvent.click(screen.getByRole("button", { name: /✅ Sí, pasó/ }));
    expect(playJudgeGavel).toHaveBeenCalledTimes(1);
  });

  it("clinks the coin when the Vaquita settlement is copied", async () => {
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.change(screen.getByPlaceholderText(/1\. Tano/), { target: { value: "Ana\nBruno\nCarla" } });
    fireEvent.click(screen.getByRole("button", { name: /Armá la lista/ }));
    fireEvent.click(screen.getByRole("tab", { name: /La Vaquita/ }));
    fireEvent.change(screen.getByLabelText(/Cuota por jugador/), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Caja actual/), { target: { value: "0" } });

    fireEvent.click(screen.getByTestId("vaquita-copy"));
    await waitFor(() => expect(playCoinClink).toHaveBeenCalledTimes(1));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((node) => (node.textContent ?? "").includes("Cierre copiado"))).toBe(
        true,
      ),
    );
  });
});
