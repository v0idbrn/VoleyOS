import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { OverlayTv, parseTvParams } from "./OverlayTv";

afterEach(() => cleanup());

describe("v10.0.0 VNL/ESPN TV broadcast overlay", () => {
  it("parses the OBS Browser-Source params safely", () => {
    expect(parseTvParams("?chroma=1&clean=1")).toEqual({
      chroma: true,
      clean: true,
      room: null,
      base: null,
      pin: null,
    });
    expect(parseTvParams("")).toEqual({ chroma: false, clean: false, room: null, base: null, pin: null });
    expect(parseTvParams("?room=CANCHA-ABCD").room).toBe("CANCHA-ABCD");
    expect(parseTvParams("?room=../../etc").room).toBeNull();
    expect(parseTvParams("?base=http://192.168.43.1:8765&pin=4321")).toEqual({
      chroma: false,
      clean: false,
      room: null,
      base: "http://192.168.43.1:8765",
      pin: "4321",
    });
    expect(parseTvParams("?base=javascript:alert(1)").base).toBeNull();
    expect(parseTvParams("?base=http://192.168.43.1:8765&pin=12a4").pin).toBeNull();
  });

  it("renders the demo lower-third with teams, scores and set chips", () => {
    render(<OverlayTv search="" />);
    expect(screen.getByTestId("tv-stage").getAttribute("data-chroma")).toBe("0");
    expect(screen.getByText("Tiburones")).toBeInTheDocument();
    expect(screen.getByText("Cóndores")).toBeInTheDocument();
    expect(screen.getByTestId("tv-set-chips").textContent).toContain("25-20");
    expect(screen.getByTestId("tv-set-chips").textContent).toContain("18-25");
    expect(screen.getByTestId("tv-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("tv-follow")).toBeNull();
  });

  it("flips the stage to chroma green and hides the preview chrome with ?clean=1", () => {
    render(<OverlayTv search="?chroma=1&clean=1" />);
    const stage = screen.getByTestId("tv-stage");
    expect(stage.getAttribute("data-chroma")).toBe("1");
    expect(stage.style.backgroundColor).toBeTruthy();
    expect(screen.queryByTestId("tv-controls")).toBeNull();
    expect(screen.queryByTestId("tv-chroma-toggle")).toBeNull();
  });

  it("toggles chroma from the preview controls", () => {
    render(<OverlayTv search="" />);
    expect(screen.getByTestId("tv-stage").getAttribute("data-chroma")).toBe("0");
    fireEvent.click(screen.getByTestId("tv-chroma-toggle"));
    expect(screen.getByTestId("tv-stage").getAttribute("data-chroma")).toBe("1");
  });

  it("shows the follow badge for a PIN-gated LAN bench mesh and parks the demo", () => {
    render(<OverlayTv search="?base=http://192.168.43.1:8765&pin=4321" />);
    const follow = screen.getByTestId("tv-follow").textContent ?? "";
    expect(follow).toContain("MESH");
    expect(follow).toContain("192.168.43.1:8765");
    // The demo loop steps aside once a real feed is attached.
    expect(screen.queryByTestId("tv-pause")).toBeNull();
  });
});
