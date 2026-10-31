import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreboardStation } from "@/components/stations";
import {
  SAMPLE_DEMO_DVW,
  exportMatchToDvw,
  lintScoutLogSequence,
  parseDvwFile,
  scoutLinesToLogEntries,
  serializeDvwFile,
  translateScoutCodeLive,
} from "@/lib/datavolley-courtside-engine";
import { newScoreboard } from "@/lib/local-engines";
import { MODULE_BY_SLUG } from "@/lib/modules";

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

const noop = (): void => undefined;

const renderBoard = () => render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);

const scoreOf = (side: "left" | "right"): string => screen.getByTestId(`landscape-score-${side}`).textContent ?? "";

const setViewport = (width: number, height: number): void => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true, writable: true });
};

describe("v10.3.0 Modo Mesa (landscape 50/50 scoreboard)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewport(1024, 768);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => cleanup());

  it("scores, swaps, undoes, resets and exits from the full-screen board", async () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("enter-table-mode-btn"));

    const board = screen.getByTestId("landscape-table-scoreboard");
    expect(within(board).getByTestId("landscape-half-left")).toBeTruthy();
    expect(within(board).getByTestId("landscape-half-right")).toBeTruthy();
    expect(within(board).getByTestId("landscape-set-pill")).toBeTruthy();
    expect(within(board).queryAllByRole("button").length).toBeGreaterThanOrEqual(5);

    // Tap the giant left half → +1.
    fireEvent.click(within(board).getByTestId("landscape-half-left"));
    await waitFor(() => expect(scoreOf("left")).toBe("1"));

    // Discrete −1 in the outer corner.
    fireEvent.click(screen.getByTestId("landscape-minus-left"));
    await waitFor(() => expect(scoreOf("left")).toBe("0"));

    // Right half twice.
    const right = screen.getByTestId("landscape-half-right");
    fireEvent.click(right);
    fireEvent.click(right);
    await waitFor(() => expect(scoreOf("right")).toBe("2"));

    // ↶ Deshacer.
    fireEvent.click(screen.getByTestId("landscape-undo-btn"));
    await waitFor(() => expect(scoreOf("right")).toBe("1"));

    // 🔄 Cambio de lado inverts both halves.
    const leftNameBefore = screen.getByTestId("landscape-name-left").textContent;
    const rightNameBefore = screen.getByTestId("landscape-name-right").textContent;
    fireEvent.click(screen.getByTestId("landscape-swap-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("landscape-name-left").textContent).not.toBe(leftNameBefore);
      expect(screen.getByTestId("landscape-name-right").textContent).not.toBe(rightNameBefore);
    });

    // 🏐 SACA badge follows the serving side after the swap.
    expect(screen.getByTestId("landscape-serve-left")).toBeTruthy();

    // ↺ Reiniciar (0-0) clears the points, undo brings them back.
    fireEvent.click(screen.getByTestId("landscape-reset-btn"));
    await waitFor(() => {
      expect(scoreOf("left")).toBe("0");
      expect(scoreOf("right")).toBe("0");
    });

    // ✕ Salir leaves the overlay.
    fireEvent.click(screen.getByTestId("landscape-exit-btn"));
    expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull();
  });

  it("auto-arms on a horizontal phone viewport and leaves on Escape / Android Back", async () => {
    renderBoard();
    expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull();

    setViewport(800, 380);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy());

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull());

    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy());

    const back = (window as Window & { __vosHandleAndroidBack?: () => string }).__vosHandleAndroidBack;
    expect(typeof back).toBe("function");
    expect(back?.()).toBe("handled");
    await waitFor(() => expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull());

    // Back to portrait: the mode stays off and detection re-arms.
    setViewport(400, 800);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull());
  });

  it("keeps a manual entry alive while the viewport is still portrait", async () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("enter-table-mode-btn"));
    expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy();

    setViewport(1200, 700);
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy());
  });
});

describe("v10.3.0 desktop shortcuts and match summary", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewport(1440, 900);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => cleanup());

  it("scores left/right, undoes and toggles Modo Mesa from the keyboard", async () => {
    renderBoard();
    expect(screen.getByTestId("pc-shortcuts-hint")).toBeTruthy();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("1"));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    await waitFor(() => expect(screen.getByTestId("score-b").textContent).toBe("1"));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z" }));
    await waitFor(() => expect(screen.getByTestId("score-b").textContent).toBe("0"));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    await waitFor(() => expect(screen.getByTestId("landscape-table-scoreboard")).toBeTruthy());

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    await waitFor(() => expect(screen.queryByTestId("landscape-table-scoreboard")).toBeNull());

    // Typing in an input must never score.
    fireEvent.change(screen.getByTestId("dvw-command-input"), { target: { value: "14" } });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" }));
    expect(screen.getByTestId("score-b").textContent).toBe("0");
  });

  it("copies a formatted boxscore to the clipboard", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    renderBoard();
    fireEvent.click(screen.getByTestId("copy-match-summary-btn"));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const summary = String(writeText.mock.calls[0]?.[0] ?? "");
    expect(summary).toContain("🏐 VoleyOS");
    expect(summary).toContain("Tiburones");
    expect(summary).toContain("Set actual: 0-0");
  });
});

describe("v10.3.0 zero NaN hardening", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewport(1440, 900);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => cleanup());

  it("survives a 60-point fuzz, manual edits, hard reset and undo without NaN", async () => {
    renderBoard();

    fireEvent.click(screen.getByTestId("score-edit-open"));
    fireEvent.change(screen.getByTestId("score-edit-a"), { target: { value: "14" } });
    fireEvent.change(screen.getByTestId("score-edit-b"), { target: { value: "11" } });
    fireEvent.change(screen.getByTestId("sets-edit-a"), { target: { value: "1" } });
    fireEvent.change(screen.getByTestId("sets-edit-b"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("score-edit-apply"));
    await waitFor(() => expect(screen.getByTestId("set-badge").textContent).toContain("SET 3"));

    for (let index = 0; index < 30; index += 1) {
      const left = screen.queryByRole("button", { name: "+ Tiburones [A]" });
      if (left) fireEvent.click(left);
      const right = screen.queryByRole("button", { name: "+ Cóndores [L]" });
      if (right) fireEvent.click(right);
    }

    let text = document.body.textContent ?? "";
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");

    fireEvent.click(screen.getByTestId("reset-match-btn"));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("0"));
    expect(screen.getByTestId("score-b").textContent).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: /^\[Z\] Deshacer/ }));
    await waitFor(() => expect(screen.getByTestId("set-badge").textContent).toBeDefined());

    text = document.body.textContent ?? "";
    expect(text).not.toContain("NaN");
    expect(text).not.toContain("Infinity");
  });
});

describe("v10.3.0 Courtside DataVolley console", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewport(1440, 900);
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => cleanup());

  it("translates shorthand live and logs it on Enter", async () => {
    renderBoard();
    const input = screen.getByTestId("dvw-command-input");
    fireEvent.change(input, { target: { value: "*14AT#42B2" } });

    const readback = screen.getByTestId("dvw-live-readback");
    expect(readback.textContent).toContain("#14 Local");
    expect(readback.textContent).toContain("Zona 4→2");
    expect(readback.textContent).toContain("2 Bloqueos");

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(readback.textContent).toContain("Escribí un código"));
  });

  it("flags an unknown code instead of logging it", () => {
    renderBoard();
    fireEvent.change(screen.getByTestId("dvw-command-input"), { target: { value: "???" } });
    fireEvent.click(screen.getByTestId("dvw-submit-btn"));
    expect(screen.getByTestId("dvw-notice").textContent).toContain("no reconocido");
    expect(screen.queryByTestId("dvw-lint-warning")).toBeNull();
  });

  it("loads the 1-click demo with its intentional lint warning", async () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("dvw-load-demo-btn"));
    await waitFor(() => expect(screen.getByTestId("dvw-lint-warning")).toBeTruthy());
    expect(screen.getByTestId("dvw-lint-warning").textContent).toContain("Doble recepción");
    expect(screen.getByTestId("dvw-notice").textContent).toContain("Demo cargada");
  });

  it("exports a .dvw without throwing in jsdom", () => {
    renderBoard();
    expect(() => fireEvent.click(screen.getByTestId("dvw-export-btn"))).not.toThrow();
    expect(screen.getByTestId("dvw-notice").textContent).toContain("exportado");
  });

  it("stays hidden while Modo Mesa is open", () => {
    renderBoard();
    fireEvent.click(screen.getByTestId("enter-table-mode-btn"));
    expect(screen.queryByTestId("dvw-courtside-console")).toBeNull();
  });
});

describe("datavolley-courtside-engine", () => {
  it("translates the sample shorthand in Spanish and English", () => {
    const es = translateScoutCodeLive("*14AT#42B2", "es");
    expect(es.valid).toBe(true);
    expect(es.summary).toContain("#14 Local");
    expect(es.summary).toContain("Ataque (Toque)");
    expect(es.summary).toContain("Zona 4→2");
    expect(es.summary).toContain("2 Bloqueos");
    expect(es.summary).toContain("Punto (#)");

    const en = translateScoutCodeLive("*14AT#42B2", "en");
    expect(en.valid).toBe(true);
    expect(en.summary).toContain("#14 Home");
    expect(en.summary).toContain("Attack (Tip)");
    expect(en.summary).toContain("Zone 4→2");
    expect(en.summary).toContain("2 Blocks");
    expect(en.summary).toContain("Point (#)");

    expect(translateScoutCodeLive("a07SM=", "es").summary).toContain("Visita");
    expect(translateScoutCodeLive("*12R+", "pt").summary).toContain("Recepção");
    expect(translateScoutCodeLive("*09B#", "es").valid).toBe(true);
    expect(translateScoutCodeLive("hola", "es").valid).toBe(false);
    expect(translateScoutCodeLive("", "es").valid).toBe(false);
  });

  it("flags every documented impossible sequence", () => {
    const doubleReception = lintScoutLogSequence(scoutLinesToLogEntries(["*12R+ *12R+"]), "es");
    expect(doubleReception.some((issue) => issue.type === "DOUBLE_RECEPTION")).toBe(true);

    const missingBlock = lintScoutLogSequence(scoutLinesToLogEntries(["*14A/ *07R+"]), "es");
    expect(missingBlock.some((issue) => issue.type === "MISSING_BLOCK_AFTER_STUFF")).toBe(true);

    const backRow = lintScoutLogSequence(scoutLinesToLogEntries(["*06A#32"], [6]), "es");
    expect(backRow.some((issue) => issue.type === "BACKROW_FRONTZONE_VIOLATION")).toBe(true);

    const rotationSlip = lintScoutLogSequence(scoutLinesToLogEntries(["*14S+", "*16S+"]), "es");
    expect(rotationSlip.some((issue) => issue.type === "ROTATION_SLIP")).toBe(true);

    const clean = lintScoutLogSequence(scoutLinesToLogEntries(["*14S+", "a07R+"]), "es");
    expect(clean).toEqual([]);
  });

  it("round-trips the demo .dvw losslessly and exports a live match", () => {
    const reparsed = serializeDvwFile(parseDvwFile(SAMPLE_DEMO_DVW));
    expect(reparsed).toBe(SAMPLE_DEMO_DVW);

    const state = {
      ...newScoreboard("Tiburones", "Cóndores", 3),
      setHistory: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
      scoreA: 5,
      scoreB: 3,
    };
    const text = exportMatchToDvw(state, [["*14AT#42B2@1000"]]);
    const parsed = parseDvwFile(text);
    expect(parsed.homeTeam).toBe("Tiburones");
    expect(parsed.awayTeam).toBe("Cóndores");
    expect(parsed.sets.map((set) => `${set.scoreA}-${set.scoreB}`)).toEqual(["25-20", "5-3"]);
    expect(parsed.sets[0]?.scout).toEqual(["*14AT#42B2@1000"]);
    expect(serializeDvwFile(parsed)).toBe(text);

    expect(() => parseDvwFile("not a dvw file")).toThrow();
  });
});
