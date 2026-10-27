import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ModuleErrorBoundary } from "./ModuleErrorBoundary";

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) throw new Error("tool exploded");
  return <p data-testid="tool-ok">tool fine</p>;
}

describe("ModuleErrorBoundary — self-healing tool crashes", () => {
  afterEach(() => {
    shouldThrow = true;
    cleanup();
    vi.restoreAllMocks();
  });

  it("catches a render crash and offers the 1-tap restart instead of killing the shell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ModuleErrorBoundary locale="es">
        <Bomb />
      </ModuleErrorBoundary>,
    );

    expect(screen.getByTestId("module-error-boundary")).toBeInTheDocument();
    expect(screen.queryByTestId("tool-ok")).toBeNull();
    const restart = screen.getByTestId("module-restart");
    expect(restart.textContent).toContain("Reiniciar esta herramienta");
    expect(restart.textContent).toContain("Tu partido sigue intacto");
  });

  it("restarts the tool in place once the error condition is gone", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ModuleErrorBoundary locale="en">
        <Bomb />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByTestId("module-error-boundary")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId("module-restart"));

    expect(screen.getByTestId("tool-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("module-error-boundary")).toBeNull();
  });

  it("renders children untouched while nothing throws", () => {
    shouldThrow = false;
    render(
      <ModuleErrorBoundary locale="pt">
        <Bomb />
      </ModuleErrorBoundary>,
    );
    expect(screen.getByTestId("tool-ok")).toBeInTheDocument();
    expect(screen.queryByTestId("module-error-boundary")).toBeNull();
  });
});
