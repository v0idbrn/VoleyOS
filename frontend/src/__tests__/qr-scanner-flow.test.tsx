import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QRScannerModal } from "@/components/QRScannerModal";
import {
  parseScannedVoleyOSPayload,
  encodeQrPayloadForVoleyOS,
  qrMatrixToSvg,
} from "@/lib/qr-codec";

afterEach(() => {
  cleanup();
});

// jsdom has no camera, so stub a live MediaStream to exercise the viewfinder
// branch (flip button, laser line) the way a real phone would.
beforeEach(() => {
  const fakeStream = {
    getTracks: () => [{ stop: vi.fn() }],
  } as unknown as MediaStream;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
    writable: true,
    configurable: true,
  });
});

// writeValue is a Testing Library helper added via vitest setup.
const writeValue = (el: HTMLTextAreaElement | HTMLInputElement, value: string) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("qr-scanner user flow", () => {
  it("parses the 5 payload types the live flow relies on", () => {
    expect(parseScannedVoleyOSPayload("VOS-DEVICE:AABB-1122")).toBeNull(); // not yet normalized
    expect(parseScannedVoleyOSPayload("vos-device: AABB-1122")).toEqual({
      type: "device_id",
      deviceId: "AABB-1122",
    });
    expect(parseScannedVoleyOSPayload("http://192.168.1.10:8765/state")).toEqual({
      type: "hotspot_url",
      url: "http://192.168.1.10:8765/state",
    });
    expect(
      parseScannedVoleyOSPayload("https://voleyos.app/?room=CANCHA-XYZ&pub=abc"),
    ).toEqual({ type: "live_room", roomId: "CANCHA-XYZ", pubHash: "abc" });
    expect(
      parseScannedVoleyOSPayload("https://voleyos.local/?room=CANCHA-ABC&handoverSecret=x"),
    ).toEqual({ type: "handover", roomId: "CANCHA-ABC", handoverSecret: "x" });
    expect(
      parseScannedVoleyOSPayload(
        "VOS-PRO.XXXX-XXXX.PLAYER.20300101.HOLDER.0123456789abcdef",
      ),
    ).toEqual({
      type: "license_key",
      licenseKey: "VOS-PRO.XXXX-XXXX.PLAYER.20300101.HOLDER.0123456789ABCDEF",
    });
  });

  it("renders the scanner with camera + file + paste fallbacks", async () => {
    const onScanSuccess = vi.fn();
    render(<QRScannerModal locale="es" onScanSuccess={onScanSuccess} onClose={vi.fn()} />);
    expect(screen.getByText(/escanear qr/i)).toBeInTheDocument();
    // The flip button mounts only after the async getUserMedia resolves.
    expect(await screen.findByRole("button", { name: /cambiar cámara/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tomar foto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pegar del portapapeles/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/pega el código manualmente/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salir/i })).toBeInTheDocument();
  });

  it("builds a stable QR matrix + SVG for a device id", () => {
    const matrix = encodeQrPayloadForVoleyOS("vos-device: AABB-1122");
    expect(matrix.size).toBe(21);
    expect(matrix.modules.length).toBe(matrix.size * matrix.size);
    const svg = qrMatrixToSvg(matrix);
    expect(svg).toContain("<svg");
  });

  it("builds a stable QR matrix + SVG for a license key", () => {
    const key = "VOS-PRO.XXXX-XXXX.PLAYER.20300101.HOLDER.0123456789abcdef";
    const matrix = encodeQrPayloadForVoleyOS(key);
    expect(matrix.size).toBe(21);
    const svg = qrMatrixToSvg(matrix);
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(50);
  });

  it("calls onScanSuccess for a valid device id when pasted", async () => {
    const onScanSuccess = vi.fn();
    render(<QRScannerModal locale="es" onScanSuccess={onScanSuccess} onClose={vi.fn()} />);
    const box = screen.getByPlaceholderText(/pega el código manualmente/i) as HTMLTextAreaElement;
    writeValue(box, "vos-device: AABB-1122");
    expect(onScanSuccess).toHaveBeenCalledWith({ type: "device_id", deviceId: "AABB-1122" });
  });

  it("does not call onScanSuccess for an irrelevant string pasted", async () => {
    const onScanSuccess = vi.fn();
    render(<QRScannerModal locale="es" onScanSuccess={onScanSuccess} onClose={vi.fn()} />);
    const box = screen.getByPlaceholderText(/pega el código manualmente/i) as HTMLTextAreaElement;
    writeValue(box, "not a code");
    expect(onScanSuccess).not.toHaveBeenCalled();
  });
});
