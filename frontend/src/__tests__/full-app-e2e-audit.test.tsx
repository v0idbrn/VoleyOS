/**
 * v10.1.1 — full-app end-to-end interaction audit.
 *
 * Simulates a real user clicking through the flows that will be exercised at
 * the Interfacultades tournament: mode switching, scoreboard editing/swapping/
 * undo, the friend licence keygen round-trip (lowercase + spaces), the
 * WhatsApp roster → waitlist promotion → bench rotator → Vaquita settlement →
 * My Season chain, and a mount of every single one of the 61 modules with
 * zero runtime errors.
 */
import { createHash } from "node:crypto";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CasualPlayerSuite } from "@/components/CasualPlayerSuite";
import { CreatorKeygenPanel, MonetizationModal } from "@/components/MonetizationModal";
import { ScoreboardStation } from "@/components/stations";
import { VolleyOSHub } from "@/components/VolleyOSHub";
import {
  getDeviceInstallId,
  normalizeDeviceId,
  signCustomerLicense,
  verifyCustomerLicense,
} from "@/lib/creator-unlock";
import { MODULES, MODULE_BY_SLUG } from "@/lib/modules";
import { auditSeason, loadSeason, saveSeasonMatch } from "@/lib/season-vault";

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
    playBuzzer: vi.fn(() => true),
    playLevelUpArpeggio: vi.fn(() => true),
    playSneakerSqueak: vi.fn(() => true),
  };
});

const DIGEST = createHash("sha256").update("secret-key-for-tests").digest("hex");
const noop = (): void => undefined;

const meta = (slug: string) => {
  const value = MODULE_BY_SLUG.get(slug);
  if (!value) throw new Error(`missing module ${slug}`);
  return value;
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("voleyos_onboarding_done", "1");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve(true)) },
    configurable: true,
  });
  Object.defineProperty(window, "speechSynthesis", {
    value: { speak: vi.fn(), cancel: vi.fn() },
    configurable: true,
  });
  Object.defineProperty(navigator, "vibrate", { value: vi.fn(() => true), configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

/* ------------------------------------------------------------------ *
 * 1. Hub: Simple ⇄ Pro and every one of the 61 modules
 * ------------------------------------------------------------------ */

describe("hub E2E", () => {
  it("switches between Modo Simple and Modo Pro from Ajustes", () => {
    render(<VolleyOSHub locale="es" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /Ajustes/ }).at(-1)!);
    const toggle = screen.getByTestId("hub-mode-toggle");

    // Default is Pro: the toggle reports Simple Mode as not pressed.
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("volleyos.uiMode")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId("hub-mode-toggle").getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("simple");
    // v10.1.3: Simple Mode ships its intentional 3-tab strip.
    expect(screen.getAllByRole("tab").length).toBeLessThan(6);

    fireEvent.click(screen.getByTestId("hub-mode-toggle"));
    expect(screen.getByTestId("hub-mode-toggle").getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("volleyos.uiMode")).toBe("pro");
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(4);
  });

  it(
    "mounts, renders and closes all 61 modules with zero runtime errors",
    () => {
    expect(MODULES).toHaveLength(61);
    render(<VolleyOSHub locale="es" />);

    for (const module of MODULES) {
      // The launcher unmounts while a module is open: re-query every time.
      const search = screen.getByRole("searchbox", { name: "Buscar módulo" });
      fireEvent.change(search, { target: { value: module.name.es } });
      const cards = screen.getAllByTestId("module-card");
      const card = cards.find((element) => element.textContent?.includes(module.name.es));
      if (!card) {
        throw new Error(`module ${module.number} (${module.slug}) has no launcher card`);
      }
      fireEvent.click(card);

      const expected = `Módulo ${String(module.number).padStart(2, "0")}`;
      if (!screen.queryByText(new RegExp(`^${expected}$`))) {
        throw new Error(`module ${module.slug} did not render its full-screen header (${expected})`);
      }
      // Interact with the first live input so no module throws on typing.
      const field = document.querySelector<HTMLInputElement>(
        '[data-view="module"] input:not([type="hidden"]):not([type="file"]), [data-view="module"] textarea',
      );
      if (field) {
        const current = field.value;
        fireEvent.change(field, { target: { value: field.type === "number" ? "7" : `${current}1` } });
      }
      fireEvent.click(screen.getByRole("button", { name: "Volver" }));
      expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
    }
    },
    // 61 full mount/unmount cycles: generous under full-suite parallel load.
    30_000,
  );
});

/* ------------------------------------------------------------------ *
 * 2. ⏱️ Cancha: edit, swap, undo, win and save
 * ------------------------------------------------------------------ */

describe("scoreboard E2E", () => {
  const renderScoreboard = () =>
    render(<ScoreboardStation meta={meta("scoreboard")} locale="es" onSave={noop} />);

  it("edits the mid-match score, applies a faculty chip, swaps sides, undoes and wins the match", async () => {
    renderScoreboard();

    // --- mid-match editor: 14-11, sets 1-0 ---------------------------------
    fireEvent.click(screen.getByTestId("score-edit-open"));
    const editA = screen.getByTestId("score-edit-a");
    const editB = screen.getByTestId("score-edit-b");
    fireEvent.change(editA, { target: { value: "14" } });
    fireEvent.blur(editA);
    fireEvent.change(editB, { target: { value: "11" } });
    fireEvent.blur(editB);
    const setsA = screen.getByTestId("sets-edit-a");
    const setsB = screen.getByTestId("sets-edit-b");
    fireEvent.change(setsA, { target: { value: "1" } });
    fireEvent.blur(setsA);
    fireEvent.change(setsB, { target: { value: "0" } });
    fireEvent.blur(setsB);
    expect(screen.getByTestId("score-a").textContent).toBe("14");
    expect(screen.getByTestId("score-b").textContent).toBe("11");

    // --- quick faculty chip renames team A everywhere ----------------------
    fireEvent.click(screen.getByTestId("team-edit-open"));
    fireEvent.click(screen.getByTestId("faculty-a-Ingeniería"));
    expect(screen.getAllByText("Ingeniería").length).toBeGreaterThan(0);

    // --- point + undo ------------------------------------------------------
    fireEvent.click(screen.getByRole("button", { name: "+ Ingeniería [A]" }));
    expect(screen.getByTestId("score-a").textContent).toBe("15");
    fireEvent.click(screen.getByRole("button", { name: /\[Z\] Deshacer/ }));
    expect(screen.getByTestId("score-a").textContent).toBe("14");

    // --- swap sides: columns flip, +buttons follow the team on that side ---
    fireEvent.click(screen.getByRole("button", { name: /Cambio de Cancha/ }));
    // Left column now shows team B (Cóndores) with B's score.
    expect(screen.getAllByText("Cóndores").length).toBeGreaterThan(0);
    expect(screen.getByTestId("score-b").textContent).toBe("11");
    expect(screen.getByTestId("score-a").textContent).toBe("14");
    // Left-column button increments the team displayed on the left (B).
    fireEvent.click(screen.getByRole("button", { name: "+ Cóndores [A]" }));
    expect(screen.getByTestId("score-b").textContent).toBe("12");
    // Swap back: A left (14), B right (12).
    fireEvent.click(screen.getByRole("button", { name: /Cambio de Cancha/ }));
    expect(screen.getByTestId("score-a").textContent).toBe("14");
    expect(screen.getByTestId("score-b").textContent).toBe("12");

    // --- sound bar fires without errors ------------------------------------
    fireEvent.click(screen.getByTestId("sound-whistle"));
    fireEvent.click(screen.getByTestId("sound-whistle-double"));
    fireEvent.click(screen.getByTestId("sound-buzzer"));
    fireEvent.click(screen.getByRole("button", { name: /Probar Voz/ }));

    // --- score 11 straight points to close the match (25-12, sets 1-0 → 2-0)
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "+ Ingeniería [A]" }));
    }
    expect(screen.getByTestId("score-a").textContent).toBe("25");
    await waitFor(() => expect(screen.getByText(/guardado en Mi Temporada/)).toBeDefined());
    expect(loadSeason()).toHaveLength(1);
    expect(auditSeason(loadSeason()).ok).toBe(true);

    // --- manual save into 🏆 Mi Temporada ----------------------------------
    fireEvent.click(screen.getByTestId("save-season"));
    expect(screen.getByText(/Partido guardado en 🏆 Mi Temporada/)).toBeDefined();
    expect(loadSeason().length).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ *
 * 3. Creator Keygen → friend redemption (lowercase + spaces)
 * ------------------------------------------------------------------ */

describe("friend licence E2E", () => {
  it("normalizes a sloppy device id, signs it and redeems it cleanly on this device", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    vi.stubEnv("NEXT_PUBLIC_DEV_UNLOCK", "true");

    // Friend's device = this install, typed with lowercase and stray spaces.
    const friendId = getDeviceInstallId();
    const sloppy = ` ${friendId.toLowerCase().replace("-", " - ")} `;

    // --- Keygen console ----------------------------------------------------
    render(<CreatorKeygenPanel locale="es" />);
    const deviceField = screen.getByPlaceholderText(/Device ID del comprador/);
    fireEvent.change(deviceField, { target: { value: sloppy } });
    // The field normalizes on every keystroke: no spaces, uppercase.
    expect((deviceField as HTMLInputElement).value).toBe(friendId);
    expect(normalizeDeviceId(sloppy)).toBe(friendId);

    fireEvent.change(screen.getByPlaceholderText(/Nombre del comprador/), {
      target: { value: "Ana Pérez" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generar código VOS-PRO/ }));
    const issuedNode = await screen.findByText(/^VOS-PRO\./);
    const code = issuedNode.textContent ?? "";
    expect(code).toMatch(
      new RegExp(`^VOS-PRO\\.${friendId}\\.PLAYER\\.\\d{8}\\.ANA-PEREZ\\.[0-9a-f]{16}$`),
    );

    // Library-level round trip mirrors a WhatsApp-wrapped paste (newline right
    // after the prefix — the dot must survive).
    const wrapped = `${code.slice(0, 8)}\n${code.slice(8)}`;
    const direct = await verifyCustomerLicense(`  ${wrapped}  `, { deviceId: friendId });
    expect(direct).toEqual({ ok: true, license: expect.anything() });

    // --- Supporter chip from the same console ------------------------------
    cleanup();
    render(<CreatorKeygenPanel locale="es" />);
    fireEvent.click(screen.getByTestId("chip-generate"));
    const chipNode = await screen.findByTestId("chip-code");
    expect(chipNode.textContent ?? "").toMatch(/^VOS-CHIP\.[0-9A-F]{12}\.[0-9A-Fa-f]{8,64}$/);
    const chip = chipNode.textContent ?? "";

    // --- Redeem the VOS-PRO code in the activation modal -------------------
    const activated = vi.fn();
    cleanup();
    render(<MonetizationModal locale="es" onClose={noop} onActivated={activated} />);
    expect(screen.getByTestId("copy-device-id")).toBeDefined();
    fireEvent.change(screen.getByLabelText(/Recibí tu código VOS-PRO/), {
      // WhatsApp wraps long codes: inject a newline mid-code on purpose.
      target: { value: `${code.slice(0, 12)}\n${code.slice(12)}` },
    });
    fireEvent.click(screen.getByRole("button", { name: /Activar en este dispositivo/ }));
    expect(await screen.findByText(/✅ Licencia activa/)).toBeDefined();
    expect(activated).toHaveBeenCalledWith(code);

    // --- Redeem the VOS-CHIP too ------------------------------------------
    cleanup();
    render(<MonetizationModal locale="es" onClose={noop} onActivated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Recibí tu código VOS-PRO/), { target: { value: chip } });
    fireEvent.click(screen.getByRole("button", { name: /Activar en este dispositivo/ }));
    expect(await screen.findByText(/👑 Patrocinador Oficial activo/)).toBeDefined();
  });

  it("signs and verifies through the shared library contract", async () => {
    vi.stubEnv("NEXT_PUBLIC_CREATOR_KEY_SHA256", DIGEST);
    const code = await signCustomerLicense({
      deviceId: " ab12 - cd34 ",
      tier: "CLUB",
      expiry: "20991231",
      holder: "Club Norte",
    });
    expect(code).toMatch(/^VOS-PRO\.AB12-CD34\.CLUB\.20991231\.CLUB-NORTE\.[0-9a-f]{16}$/);
    expect((await verifyCustomerLicense(code ?? "", { deviceId: "AB12-CD34" })).ok).toBe(true);
    expect((await verifyCustomerLicense(code ?? "", { deviceId: "FFFF-0000" })).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 4. 🍻 Picadito & Amigos: roster → promotion → pot → rotator → season
 * ------------------------------------------------------------------ */

describe("casual suite E2E", () => {
  it("builds a WhatsApp roster, promotes the waitlist and settles La Vaquita exactly", async () => {
    render(<CasualPlayerSuite locale="es" />);

    // --- bulk paste of 13 players into a 12-slot court ---------------------
    const paste = [
      "1. Ana",
      "2. Beto",
      "3. Carla",
      "4. Damián",
      "5. Eva",
      "6. Facu",
      "7. Gaby",
      "8. Hugo",
      "9. Inés",
      "10. Javi",
      "11. Lu",
      "12. Marcos",
      "13. Nico",
    ].join("\n");
    fireEvent.change(screen.getByLabelText(/Pegá la lista del grupo/), { target: { value: paste } });
    fireEvent.click(screen.getByRole("button", { name: /Armá la lista/ }));
    expect((await screen.findByRole("status")).textContent).toContain("12 confirmados");
    // Nico waits: the waitlist renumbers from 1.
    expect(screen.getByText("1. Nico")).toBeDefined();
    expect(screen.getByText(/Lista de Espera/)).toBeDefined();

    // --- capacity selector reshapes the court ------------------------------
    fireEvent.click(screen.getByRole("button", { name: "18", pressed: false }));
    await waitFor(() => expect(screen.queryByText(/Lista de Espera/)).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "12", pressed: false }));
    await waitFor(() => expect(screen.getByText(/Lista de Espera/)).toBeDefined());

    // --- 😱 Se bajó promotes waitlist #1 -----------------------------------
    fireEvent.click(screen.getAllByRole("button", { name: "😱 ¡Se bajó!" })[0]!);
    expect((await screen.findByRole("status")).textContent).toContain("Subió Nico");
    expect(screen.queryByText(/Lista de Espera/)).toBeNull();
    expect(screen.getByText(/✅ Cancha llena\./)).toBeDefined();
    // Nico now occupies the promoted slot at the end of the confirmed list.
    expect(screen.getByText("12. Nico")).toBeDefined();

    // --- copy actions never dead-end ---------------------------------------
    fireEvent.click(screen.getByRole("button", { name: /Copiar Lista Actualizada/ }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/Lista copiada|bloqueó el copiado/),
    );

    // --- flag Beto's ball and Carla's payment (rows renumbered post-drop) ---
    const betoRow = screen.getByText("1. Beto").closest("li")!;
    fireEvent.click(within(betoRow).getByRole("button", { name: /Lleva Pelota/ }));
    const carlaRow = screen.getByText("2. Carla").closest("li")!;
    fireEvent.click(within(carlaRow).getByRole("button", { name: /Seña\/Pagó/ }));

    // --- 💰 La Vaquita: fee 1000, ball credit 500 ---------------------------
    fireEvent.click(screen.getAllByRole("tab", { name: /La Vaquita/ }).at(-1)!);
    fireEvent.change(screen.getByLabelText(/Cuota por jugador/), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Caja actual/), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/🏐 Lleva Pelota/), { target: { value: "500" } });

    // Beto owes 1000-500=500, 10 others owe 1000, Carla is square.
    expect(await screen.findByText(/todo cubierto/)).toBeDefined();
    expect(screen.getAllByText(/por entrar/)).toHaveLength(11);
    expect(screen.getAllByText(/ya pagado/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId("vaquita-copy"));
    expect(await screen.findByText(/Cierre copiado/)).toBeDefined();
  });

  it("runs the 7-player bench rotator with the outgoing/incoming banner", () => {
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /Rotador con Banco/ }).at(-1)!);

    const names = ["Ana", "Bruno", "Carla", "Damián", "Eugenia", "Flavio", "Gaby"];
    fireEvent.change(screen.getByLabelText(/Jugadores del equipo/), {
      target: { value: names.join("\n") },
    });
    fireEvent.click(screen.getByRole("button", { name: /Cargar equipo/ }));
    expect(screen.getAllByText(/^Z[1-6]$/)).toHaveLength(6);
    expect(screen.getByText(/Banca:/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Rotar con el Banco/ }));
    expect(screen.getAllByText(/rotaciones/)).toHaveLength(7);
    expect(screen.queryByRole("status")).toBeTruthy();
    expect(screen.getAllByText(/^Z[1-6]$/)).toHaveLength(6);
  });

  it("shows Mi Temporada with stats, head-to-head and a valid hash chain", async () => {
    saveSeasonMatch({
      id: "e2e-1",
      date: "2026-10-28T10:00:00.000Z",
      mode: "oficial",
      teamA: "Tiburones",
      teamB: "Cóndores",
      setsA: 2,
      setsB: 1,
      setScores: [
        { setNumber: 1, a: 25, b: 20 },
        { setNumber: 2, a: 23, b: 25 },
        { setNumber: 3, a: 15, b: 11 },
      ],
      winner: "A",
    });
    render(<CasualPlayerSuite locale="es" />);
    fireEvent.click(screen.getAllByRole("tab", { name: /Mi Temporada/ }).at(-1)!);

    const vault = await screen.findByTestId("season-vault");
    expect(within(vault).getAllByText("Tiburones").length).toBeGreaterThan(0);
    expect(within(vault).getByText(/Clásicos del head-to-head/)).toBeDefined();
    expect(within(vault).getByTestId("season-trend")).toBeDefined();
    expect(auditSeason(loadSeason()).ok).toBe(true);
  });
});
