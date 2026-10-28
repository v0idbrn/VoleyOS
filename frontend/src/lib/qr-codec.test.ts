
import { describe, expect, it } from "vitest";

import { parseScannedVoleyOSPayload } from "./qr-codec";



describe("parseScannedVoleyOSPayload", () => {
  it("recognizes a device-id QR", () => {
    const raw = "vos-device: AABB-1122";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "device_id", deviceId: "AABB-1122" });
  });

  it("normalizes a noisy device-id QR", () => {
    const p = parseScannedVoleyOSPayload("vos-device: a-a-b-b-1-1-2-2");
    expect(p).toEqual({ type: "device_id", deviceId: "AABB-1122" });
  });

  it("recognizes a raw uppercased device id", () => {
    const p = parseScannedVoleyOSPayload("FF44-9900");
    expect(p).toEqual({ type: "device_id", deviceId: "FF44-9900" });
  });

  it("recognizes a live-room URL", () => {
    const raw = "https://voleyos.app/?room=CANCHA-ABCD&pub=sha1hash&snap=photo-base64";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "live_room", roomId: "CANCHA-ABCD", pubHash: "sha1hash", snap: "photo-base64" });
  });

  it("recognizes a handover URL", () => {
    const raw = "https://voleyos.local/?room=CANCHA-XYZ&handoverSecret=secret123";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "handover", roomId: "CANCHA-XYZ", handoverSecret: "secret123" });
  });

  it("recognizes an embedded room code as live_room", () => {
    const raw = "https://voleyos.app/join?room=CANCHA-TEST";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "live_room", roomId: "CANCHA-TEST" });
  });

  it("recognizes a hotspot HTTP URL", () => {
    const raw = "http://192.168.0.55:8765/state";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "hotspot_url", url: raw });
  });

  it("recognizes a VOS-LICENSE: QR", () => {
    const raw = "VOS-LICENSE: VOS-PRO.XXXX-XXXX.PLAYER.20300101.HOLDER.0123456789abcdef";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "license_key", licenseKey: "VOS-PRO.XXXX-XXXX.PLAYER.20300101.HOLDER.0123456789abcdef" });
  });

  it("recognizes a plain VOS-PRO code pasted as text", () => {
    const raw = "vos-pro.abcd-efgh.player.20270101.holder.abcdef0123456789";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "license_key", licenseKey: "VOS-PRO.ABCD-EFGH.PLAYER.20270101.HOLDER.ABCDEF0123456789" });
  });

  it("recognizes a VOS-CHIP code", () => {
    const raw = "VOS-CHIP.CHIP-MIA.HOLDER.bd8a3c21";
    const p = parseScannedVoleyOSPayload(raw);
    expect(p).toEqual({ type: "license_key", licenseKey: "VOS-CHIP.CHIP-MIA.HOLDER.BD8A3C21" });
  });

  it("returns null for unrelated strings", () => {
    expect(parseScannedVoleyOSPayload("hello world")).toBeNull();
    expect(parseScannedVoleyOSPayload("")).toBeNull();
  });
});
