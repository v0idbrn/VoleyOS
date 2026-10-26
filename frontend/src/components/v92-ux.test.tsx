import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoachMarksOverlay } from "./CoachMarksOverlay";
import { ScoreboardStation } from "./stations";
import { StickyMiniScoreboard, VolleyOSHub } from "./VolleyOSHub";
import { isMatchActive, readLiveScoreboard } from "@/lib/court-ux";
import { newScoreboard } from "@/lib/local-engines";
import { MODULE_BY_SLUG } from "@/lib/modules";
import type { Locale } from "@/lib/local-engines";

const meta = MODULE_BY_SLUG.get("scoreboard");
if (!meta) throw new Error("scoreboard module missing");

const noop = (): void => undefined;

function hubWithMatch(locale: Locale = "es") {
  window.localStorage.setItem("voleyos_onboarding_done", "1");
  window.localStorage.setItem(
    "volleyos.liveScoreboard",
    JSON.stringify(newScoreboard("Tiburones", "Cóndores", 3, { scoreA: 14, scoreB: 12, setsA: 1 })),
  );
  return render(<VolleyOSHub locale={locale} />);
}

describe("sticky mini scoreboard", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("renders the live score line and fires 1-tap actions", () => {
    const onPoint = vi.fn();
    const onSwap = vi.fn();
    const onGoCourt = vi.fn();
    render(
      <StickyMiniScoreboard
        state={newScoreboard("Tiburones", "Cóndores", 3, { scoreA: 14, scoreB: 12, setsA: 1 })}
        locale="es"
        onPoint={onPoint}
        onSwap={onSwap}
        onGoCourt={onGoCourt}
      />,
    );
    expect(screen.getByTestId("sticky-mini-scoreboard").textContent).toContain("14 - 12");
    expect(screen.getByTestId("sticky-mini-scoreboard").textContent).toContain("Sets 1 - 0");
    fireEvent.click(screen.getByRole("button", { name: /\+1 Tiburones \[A\]/ }));
    expect(onPoint).toHaveBeenCalledWith("A");
    fireEvent.click(screen.getByRole("button", { name: /\+1 Cóndores \[B\]/ }));
    expect(onPoint).toHaveBeenCalledWith("B");
    fireEvent.click(screen.getByRole("button", { name: /Cambiar de lado/ }));
    expect(onSwap).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Ir a Cancha/ }));
    expect(onGoCourt).toHaveBeenCalledOnce();
  });

  it("appears across tabs while a match is active and hides when the board is idle", () => {
    hubWithMatch();
    expect(screen.getByTestId("sticky-mini-scoreboard")).toBeDefined();

    cleanup();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    window.localStorage.setItem("volleyos.liveScoreboard", JSON.stringify(newScoreboard("Tiburones", "Cóndores", 3)));
    render(<VolleyOSHub locale="es" />);
    expect(screen.queryByTestId("sticky-mini-scoreboard")).toBeNull();
  });

  it("jumps straight to the Cancha scoreboard from the bar", async () => {
    hubWithMatch();
    fireEvent.click(screen.getByRole("button", { name: /Ir a Cancha/ }));
    await waitFor(() => expect(screen.getByTestId("score-a")).toBeDefined());
    // The scoreboard is on screen now, so the bar steps out of the way.
    expect(screen.queryByTestId("sticky-mini-scoreboard")).toBeNull();
  });

  it("only treats a board with points or sets as an active match", () => {
    expect(isMatchActive(newScoreboard("A", "B", 3))).toBe(false);
    expect(isMatchActive(newScoreboard("A", "B", 3, { scoreA: 1 }))).toBe(true);
    expect(isMatchActive(newScoreboard("A", "B", 3, { setsB: 1 }))).toBe(true);
  });
});

describe("interactive coach marks wizard", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("walks the three spotlight steps and closes on the last one", () => {
    const onClose = vi.fn();
    render(<CoachMarksOverlay locale="es" onClose={onClose} />);
    expect(screen.getByTestId("coach-marks")).toBeDefined();
    expect(screen.getByText("Elegí tu modo y tu nivel")).toBeDefined();
    fireEvent.click(screen.getByTestId("coach-next"));
    expect(screen.getByText("Marcador y Picadito en 1 toque")).toBeDefined();
    fireEvent.click(screen.getByTestId("coach-next"));
    expect(screen.getByText("Paso a paso dentro de cada módulo")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("coach-next"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens from the header trigger and from the module guide card", async () => {
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getByRole("button", { name: "Guía interactiva" }));
    await waitFor(() => expect(screen.getByTestId("coach-marks")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Saltar" }));
    await waitFor(() => expect(screen.queryByTestId("coach-marks")).toBeNull());
  });
});

describe("post-point undo pill and set-win burst", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it("shows the floating undo pill after a point and hides it once used", async () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    await waitFor(() => expect(screen.getByTestId("score-a").textContent).toBe("1"));
    expect(screen.getByTestId("undo-pill")).toBeDefined();
    fireEvent.click(screen.getByTestId("undo-pill"));
    expect(screen.getByTestId("score-a").textContent).toBe("0");
    expect(screen.queryByTestId("undo-pill")).toBeNull();
  });

  it("persists the match so the sticky bar can restore it after remount", async () => {
    const first = render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    await waitFor(() => expect(readLiveScoreboard()?.scoreA).toBe(1));
    first.unmount();

    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    expect(screen.getByTestId("score-a").textContent).toBe("1");
  });

  it("bursts into confetti when the set closes", async () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    for (let index = 0; index < 25; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    }
    await waitFor(() => expect(screen.getByTestId("set-burst")).toBeDefined());
    expect(screen.getByText(/¡Set ganado!/)).toBeDefined();
  });

  it("closes a one-set Picadito with the match-finished burst", async () => {
    render(<ScoreboardStation meta={meta} locale="es" onSave={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /⚡ Picadito/ }));
    for (let index = 0; index < 15; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+ Tiburones [A]" }));
    }
    await waitFor(() => expect(screen.getByTestId("set-burst")).toBeDefined());
    expect(screen.getByText(/¡Partido cerrado!/)).toBeDefined();
  });
});
