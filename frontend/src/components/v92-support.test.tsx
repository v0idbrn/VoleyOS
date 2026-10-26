import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupportSheet } from "./SupportSheet";
import { VolleyOSHub } from "./VolleyOSHub";
import { canAskSupport, clearSupporterChip, persistSupporterChip, signSupporterChip } from "@/lib/support";
import { buildPrizePoster } from "@/lib/casual-engines";

const MP_ALIAS = "unfrgvnn.dead";
const KOFI_URL = "https://ko-fi.com/unfrgvnn";

async function aChip(seed = "ana"): Promise<string> {
  const chip = await signSupporterChip(seed);
  if (!chip) throw new Error("chip signing failed");
  return chip;
}

describe("support sheet (layer 1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
  });
  afterEach(() => cleanup());

  it("shows the honest narrative with 1-tap Alias MP and Ko-fi actions", async () => {
    const onClose = vi.fn();
    render(<SupportSheet locale="es" moment="match" onClose={onClose} />);
    const sheet = screen.getByTestId("support-sheet");
    expect(sheet.textContent).toContain("sin cuentas, sin telemetría");
    expect(screen.getByTestId("support-kofi")).toHaveAttribute("href", KOFI_URL);

    fireEvent.click(screen.getByTestId("support-alias"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MP_ALIAS));

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(canAskSupport()).toBe(false);
  });

  it("opens once at a moment and stays quiet for the 7-day cooldown", async () => {
    window.localStorage.setItem("voleyos_onboarding_done", "1");
    render(<VolleyOSHub locale="es" />);
    window.dispatchEvent(new CustomEvent("voleyos:support-moment", { detail: "match" }));
    await waitFor(() => expect(screen.getByTestId("support-sheet")).toBeDefined());

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByTestId("support-sheet")).toBeNull());
    expect(canAskSupport()).toBe(false);

    window.dispatchEvent(new CustomEvent("voleyos:support-moment", { detail: "export" }));
    await waitFor(() => expect(screen.queryByTestId("support-sheet")).toBeNull());
  });
});

describe("supporter chip badge (layer 2)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
  });
  afterEach(() => {
    cleanup();
    clearSupporterChip();
  });

  it("renders the golden 👑 Patrocinador badge in the app header once activated", async () => {
    render(<VolleyOSHub locale="es" />);
    expect(screen.queryByTestId("supporter-badge")).toBeNull();

    cleanup();
    expect(await persistSupporterChip(await aChip())).toBe(true);
    render(<VolleyOSHub locale="es" />);
    const badge = screen.getByTestId("supporter-badge");
    expect(badge.textContent).toContain("Patrocinador Oficial");
  });

  it("stamps the badge on exported prize posters only when a chip is active", async () => {
    const plain = buildPrizePoster({ locale: "es", champion: "Ana", potCents: 1500, date: "26/10/2026" });
    expect(plain).not.toContain("PATROCINADOR OFICIAL");

    expect(await persistSupporterChip(await aChip("poster"))).toBe(true);
    const sponsored = buildPrizePoster({
      locale: "es",
      champion: "Ana",
      potCents: 1500,
      date: "26/10/2026",
      supporter: true,
    });
    expect(sponsored).toContain("PATROCINADOR OFICIAL");
    expect(sponsored).toContain("#FACC15");
  });
});

describe("github update checker (settings)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("voleyos_onboarding_done", "1");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("checks only on tap and offers the APK download for a newer release", async () => {
    const fetcher = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: "v99.0.0",
          html_url: "https://github.com/v0idbrn/VoleyOS/releases/tag/v99.0.0",
          assets: [{ name: "voleyos.apk", browser_download_url: "https://example.com/voleyos.apk" }],
        }),
      }) as unknown as Response,
    );
    vi.stubGlobal("fetch", fetcher);

    render(<VolleyOSHub locale="es" />);
    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("tab", { name: /Ajustes/ }).at(-1)!);
    fireEvent.click(screen.getByTestId("update-check"));

    await waitFor(() => expect(screen.getByTestId("update-result").textContent).toContain("v99.0.0"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const link = screen.getByRole("link", { name: /Descargar APK/ });
    expect(link).toHaveAttribute("href", "https://example.com/voleyos.apk");
  });

  it("reports an offline failure without breaking settings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
    );
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /Ajustes/ }).at(-1)!);
    fireEvent.click(screen.getByTestId("update-check"));
    await waitFor(() => expect(screen.getByTestId("update-result").textContent).toContain("offline"));
  });
});
