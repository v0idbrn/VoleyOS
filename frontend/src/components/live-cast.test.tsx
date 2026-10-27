import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveCastModal } from "./LiveCastModal";
import { readLiveScoreboard } from "@/lib/court-ux";
import {
  buildPacket,
  createHostSecret,
  createRoomId,
  encodeWhatsAppFreePulse,
} from "@/lib/live-cast-engine";
import { newScoreboard, type ScoreboardState } from "@/lib/local-engines";

interface TestBridge {
  startLocalHotspotServer?: () => string;
  updateLocalLiveServer?: (json: string) => void;
  setLocalLivePin?: (pin: string) => void;
}

type BridgedWindow = Window & { VoleyOSBridge?: TestBridge };

function sampleState(): ScoreboardState {
  return newScoreboard("Tiburones", "Cóndores", 1, {
    matchFormat: "short15",
    scoreA: 14,
    scoreB: 12,
    setsA: 1,
    serving: "B",
  });
}

function openModal(overrides: Partial<Parameters<typeof LiveCastModal>[0]> = {}) {
  return render(
    <LiveCastModal
      locale="es"
      state={sampleState()}
      roomId="CANCHA-TEST"
      hostSecret={createHostSecret()}
      onClose={() => {}}
      {...overrides}
    />,
  );
}

describe("LiveCastModal — 4 broadcast modes", () => {
  let pinFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    pinFn = vi.fn();
    (window as BridgedWindow).VoleyOSBridge = {
      startLocalHotspotServer: () => "http://192.168.43.1:8765",
      setLocalLivePin: pinFn,
    };
    window.localStorage.clear();
  });

  afterEach(() => {
    delete (window as BridgedWindow).VoleyOSBridge;
    cleanup();
  });

  it("Mode 1: boots the pure-Java hotspot server and shows its LAN URL", async () => {
    const onActive = vi.fn();
    openModal({ onActiveChange: onActive });

    expect(screen.getByTestId("live-cast-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("hotspot-start"));

    await waitFor(() =>
      expect(screen.getByTestId("hotspot-url").textContent).toBe("http://192.168.43.1:8765"),
    );
    expect(onActive).toHaveBeenCalledWith(true);
    // The scannable QR renders for the LAN URL.
    await waitFor(() => expect(screen.getByTestId("hotspot-qr").innerHTML).toContain("<svg"));
  });

  it("Mode 1: arms a fresh 4-digit bench PIN and shows the mesh join URL", async () => {
    openModal();
    fireEvent.click(screen.getByTestId("hotspot-start"));

    await waitFor(() => expect(screen.getByTestId("bench-pin")).toBeInTheDocument());
    const pin = /\d{4}/u.exec(screen.getByTestId("bench-pin").textContent ?? "")?.[0] ?? "";
    expect(pin).toMatch(/^\d{4}$/u);
    expect(pinFn).toHaveBeenCalledWith(pin);
    expect(screen.getByTestId("bench-url").textContent).toBe(`http://192.168.43.1:8765/?pin=${pin}`);
    // The QR now scans straight into the PIN-locked giant bench scoreboard.
    await waitFor(() => expect(screen.getByTestId("hotspot-qr").innerHTML).toContain("<svg"));
  });

  it("Mode 1: explains the APK-only fallback when the bridge is absent", () => {
    delete (window as BridgedWindow).VoleyOSBridge;
    openModal();
    fireEvent.click(screen.getByTestId("hotspot-start"));
    expect(screen.getByTestId("hotspot-error")).toBeInTheDocument();
  });

  it("Mode 2: builds a visual VOS1: pulse and clones a pasted pulse offline", async () => {
    openModal();
    fireEvent.click(screen.getByTestId("cast-mode-2"));

    await waitFor(() =>
      expect(screen.getByTestId("wa-pulse-preview").textContent).toContain("VOS1:"),
    );
    expect(screen.getByTestId("wa-pulse-preview").textContent).toContain("Tiburones 14 - 12");

    const packet = await buildPacket(sampleState(), {
      roomId: "CANCHA-TEST",
      seq: 1,
      mode: "picadito",
      hostSecret: createHostSecret(),
    });
    const message = await encodeWhatsAppFreePulse(packet);
    expect(message).toContain("🏐 *EN VIVO:");

    fireEvent.change(screen.getByTestId("wa-paste"), { target: { value: message } });
    fireEvent.click(screen.getByTestId("wa-clone"));

    await waitFor(() => {
      const cloned = readLiveScoreboard();
      expect(cloned?.teamA).toBe("Tiburones");
      expect(cloned?.scoreA).toBe(14);
      expect(cloned?.matchFormat).toBe("short15");
    });
    expect(screen.getByTestId("wa-clone-message").textContent).toContain("✅");
  });

  it("Mode 2: rejects pasted text without a VOS1 capsule", async () => {
    openModal();
    fireEvent.click(screen.getByTestId("cast-mode-2"));
    await waitFor(() => expect(screen.getByTestId("wa-pulse-preview").textContent).toContain("VOS1:"));

    fireEvent.change(screen.getByTestId("wa-paste"), { target: { value: "holiwi, ¿cómo van?" } });
    fireEvent.click(screen.getByTestId("wa-clone"));

    await waitFor(() =>
      expect(screen.getByTestId("wa-clone-message").textContent).toContain("VOS1"),
    );
    expect(readLiveScoreboard()).toBeNull();
  });

  it("Mode 3: renders the cloud QR pointing at GitHub Pages with the room code", async () => {
    openModal();
    fireEvent.click(screen.getByTestId("cast-mode-3"));

    await waitFor(() =>
      expect(screen.getByTestId("cloud-url").textContent).toContain(
        "https://v0idbrn.github.io/VoleyOS/?room=CANCHA-TEST",
      ),
    );
    expect(screen.getByTestId("cloud-room").textContent).toBe("CANCHA-TEST");
    expect(screen.getByTestId("cloud-url").textContent).toContain("snap=");
    await waitFor(() => expect(screen.getByTestId("cloud-qr").innerHTML).toContain("<svg"));
  });

  it("Mode 3: joining a room validates the CANCHA-XXXX code and starts following it", async () => {
    openModal();
    fireEvent.click(screen.getByTestId("cast-mode-3"));
    await waitFor(() => expect(screen.getByTestId("cloud-room").textContent).toBe("CANCHA-TEST"));

    fireEvent.change(screen.getByTestId("join-input"), { target: { value: "MALCODIGO" } });
    fireEvent.click(screen.getByTestId("join-go"));
    expect(screen.getByTestId("join-error").textContent).toContain("CANCHA-XXXX");

    fireEvent.change(screen.getByTestId("join-input"), { target: { value: "cancha-abcd" } });
    fireEvent.click(screen.getByTestId("join-go"));
    await waitFor(() => expect(screen.getByTestId("join-waiting")).toBeInTheDocument());
    expect(screen.queryByTestId("join-error")).toBeNull();
  });

  it("Mode 3: the relay toggle reports live state to the host station", () => {
    const onActive = vi.fn();
    const onRelay = vi.fn();
    openModal({ onActiveChange: onActive, onRelayChange: onRelay });
    fireEvent.click(screen.getByTestId("cast-mode-3"));

    fireEvent.click(screen.getByTestId("relay-toggle"));
    expect(onRelay).toHaveBeenCalledWith(true);
    expect(onActive).toHaveBeenCalledWith(true);
    expect(screen.getAllByTestId("live-badge").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("relay-toggle"));
    expect(onRelay).toHaveBeenLastCalledWith(false);
  });

  it("Mode 4: renders the battery-handover QR URL carrying the host secret", async () => {
    openModal({ hostSecret: "deadbeefdeadbeef" });
    fireEvent.click(screen.getByTestId("cast-mode-4"));

    await waitFor(() =>
      expect(screen.getByTestId("handover-url").textContent).toContain("secret=deadbeefdeadbeef"),
    );
    expect(screen.getByTestId("handover-url").textContent).toContain("room=CANCHA-TEST");
    await waitFor(() => expect(screen.getByTestId("handover-qr").innerHTML).toContain("<svg"));
  });

  it("opens directly in spectator mode when a scanned QR carries ?room=", async () => {
    openModal({ initialJoin: "CANCHA-WIFI" });
    expect(screen.getByTestId("join-input")).toHaveValue("CANCHA-WIFI");
    await waitFor(() => expect(screen.getByTestId("join-waiting")).toBeInTheDocument());
  });
});
