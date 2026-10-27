import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VolleyOSHub } from "./VolleyOSHub";
import { serializeVosBackup } from "@/lib/backup-vos";

describe("v9.4 ecosystem (Hub wiring)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    const url = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
    delete url.createObjectURL;
    delete url.revokeObjectURL;
  });

  it("pins a module into the ⭐ Mis Fijas quick-access bar and opens it from the chip", () => {
    expect(screen.queryByTestId("mis-fijas")).toBeNull();
    render(<VolleyOSHub locale="es" />);

    const stars = screen.getAllByRole("button").filter((button) => button.textContent === "☆");
    expect(stars.length).toBeGreaterThan(0);
    fireEvent.click(stars[0]!);

    const bar = screen.getByTestId("mis-fijas");
    expect(bar.textContent).toContain("Mis Fijas");
    expect(JSON.parse(window.localStorage.getItem("volleyos.pins") ?? "[]")).toEqual(["biomechanics"]);

    const chip = bar.querySelector("button");
    expect(chip).toBeTruthy();
    fireEvent.click(chip!);
    expect(screen.getByRole("button", { name: "Volver" })).toBeTruthy();
  });

  it("exports a signed .vos backup and restores it from Settings", async () => {
    window.localStorage.setItem("volleyos.teams", '[{"id":"t1","name":"Tiburones"}]');
    const goodJson = serializeVosBackup();
    const url = URL as unknown as { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void };
    url.createObjectURL = vi.fn(() => "blob:vos");
    url.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getByRole("tab", { name: /Ajustes/ }));

    fireEvent.click(screen.getByTestId("vos-export"));
    await waitFor(() => expect(screen.getByTestId("vos-msg").textContent).toContain("guardada"));

    // A tampered backup must be rejected by the checksum.
    const input = screen.getByTestId("vos-import");
    const bad = new File(
      ['{"format":"volleyos.backup","version":1,"checksum":"deadbeef","payload":{}}'],
      "bad.vos",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [bad] } });
    await waitFor(() => expect(screen.getByTestId("vos-msg").textContent).toContain("inválida"));

    // A genuine backup restores the packed slots.
    window.localStorage.setItem("volleyos.teams", "[]");
    const good = new File([goodJson], "ok.vos", { type: "application/json" });
    fireEvent.change(input, { target: { files: [good] } });
    await waitFor(() => expect(screen.getByTestId("vos-msg").textContent).toContain("restaurada"));
    expect(window.localStorage.getItem("volleyos.teams")).toContain("Tiburones");
  });
});
