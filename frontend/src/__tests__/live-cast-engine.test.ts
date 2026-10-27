import { describe, expect, it, vi } from "vitest";

import {
  LAN_PORT,
  PAGES_ORIGIN,
  buildPacket,
  createBenchJoinUrl,
  createBenchPin,
  createHandoverUrl,
  createHostSecret,
  createRoomId,
  createSpectatorUrl,
  decodeWhatsAppFreePulse,
  derivePubHash,
  encodeWhatsAppFreePulse,
  isValidBenchPin,
  localServerBase,
  ntfyTopic,
  parseRoomParams,
  pollBenchState,
  pollLocalState,
  publishLiveUpdate,
  setLocalLivePin,
  signPacket,
  startBenchMesh,
  startLocalHotspotServer,
  pushLocalLiveServer,
  subscribeLiveRoom,
  verifyPacket,
  type LiveMatchPacket,
} from "@/lib/live-cast-engine";
import { newScoreboard } from "@/lib/local-engines";

const SECRET = "0123456789abcdef";
const OTHER_SECRET = "fedcba9876543210";

async function samplePacket(): Promise<LiveMatchPacket> {
  const state = newScoreboard("Tiburones", "Cóndores", 3, {
    scoreA: 14,
    scoreB: 12,
    setsA: 1,
    serving: "A",
    setHistory: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
  });
  return buildPacket(state, {
    roomId: "CANCHA-ABCD",
    seq: 7,
    mode: "picadito",
    hostSecret: SECRET,
    lastEvent: "Punto de Tiburones",
  });
}

describe("packet signing (host locks, spectators read-only)", () => {
  it("signs with a 16-hex sig and pubHash", async () => {
    const packet = await samplePacket();
    expect(packet.sig).toMatch(/^[0-9a-f]{16}$/);
    expect(packet.pubHash).toMatch(/^[0-9a-f]{16}$/);
    expect(packet.pubHash).toBe(await derivePubHash(SECRET));
    expect(await verifyPacket(packet, SECRET)).toBe(true);
  });

  it("rejects a wrong host secret and a tampered packet", async () => {
    const packet = await samplePacket();
    expect(await verifyPacket(packet, OTHER_SECRET)).toBe(false);
    expect(await verifyPacket({ ...packet, homeScore: 99 }, SECRET)).toBe(false);
  });

  it("different secrets produce different public keys", async () => {
    expect(await derivePubHash(SECRET)).not.toBe(await derivePubHash(OTHER_SECRET));
  });

  it("createRoomId builds CANCHA-XXXX on the unambiguous alphabet", () => {
    const roomId = createRoomId(() => 0);
    expect(roomId).toBe("CANCHA-AAAA");
    expect(createRoomId()).toMatch(/^CANCHA-[A-Z2-9]{4}$/);
    expect(createHostSecret()).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("Mode A — WhatsApp Free VOS1 bridge", () => {
  it("encodes the rich visual message with the VOS1 capsule", async () => {
    const packet = await samplePacket();
    const message = await encodeWhatsAppFreePulse(packet, "Picadito 15 pts");
    const lines = message.split("\n");
    expect(lines[0]).toBe("🏐 *EN VIVO: Tiburones 14 - 12 Cóndores* (Sets: 1-0)");
    expect(lines[1]).toBe("🔥 Saca: Tiburones · Modo: Picadito 15 pts");
    expect(lines[2]).toContain("Copiá este mensaje");
    expect(lines[3]).toMatch(/^VOS1:[A-Za-z0-9_-]+$/);
  });

  it("round-trips the full packet 100% offline", async () => {
    const packet = await samplePacket();
    const message = await encodeWhatsAppFreePulse(packet);
    const decoded = await decodeWhatsAppFreePulse(`mirá cómo va 🔥\n${message}\n(pegado del grupo)`);
    expect(decoded).not.toBeNull();
    expect(decoded).toEqual(packet);
    expect(await verifyPacket(decoded as LiveMatchPacket, SECRET)).toBe(true);
  });

  it("defaults the mode label by preset", async () => {
    const packet = await samplePacket();
    const message = await encodeWhatsAppFreePulse(packet);
    expect(message.split("\n")[1]).toContain("Modo: Picadito");
  });

  it("returns null for messages without VOS1 or with corrupt payloads", async () => {
    expect(await decodeWhatsAppFreePulse("holis, 12-10 🏐")).toBeNull();
    expect(await decodeWhatsAppFreePulse("VOS1:not-valid-!!")).toBeNull();
    expect(await decodeWhatsAppFreePulse("VOS1:aGVsbG8")).toBeNull();
  });
});

describe("Mode B — local hotspot LAN polling", () => {
  it("exposes the LAN base URL and pushes JSON into the Android bridge", async () => {
    expect(localServerBase("192.168.43.1")).toBe("http://192.168.43.1:8765");
    expect(LAN_PORT).toBe(8765);

    const pushed: string[] = [];
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = {
      startLocalHotspotServer: () => "http://192.168.137.1:8765",
      updateLocalLiveServer: (json: string) => pushed.push(json),
    };
    const packet = await samplePacket();
    expect(pushLocalLiveServer(packet)).toBe(true);
    expect(JSON.parse(pushed[0] as string)).toEqual(packet);
    expect(startLocalHotspotServer()).toBe("http://192.168.137.1:8765");
    delete (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge;
  });

  it("is a no-op outside the APK", async () => {
    expect(pushLocalLiveServer(await samplePacket())).toBe(false);
    expect(startLocalHotspotServer()).toBeNull();
  });

  it("polls GET /state and ignores non-packet payloads", async () => {
    const packet = await samplePacket();
    const fetchOk = vi.fn(async () => ({ ok: true, json: async () => packet }));
    expect(await pollLocalState("http://192.168.43.1:8765", fetchOk)).toEqual(packet);
    expect(fetchOk).toHaveBeenCalledWith("http://192.168.43.1:8765/state");

    const fetchIdle = vi.fn(async () => ({ ok: true, json: async () => ({ status: "idle" }) }));
    expect(await pollLocalState("http://192.168.43.1:8765", fetchIdle)).toBeNull();

    const fetchBoom = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await pollLocalState("http://192.168.43.1:8765", fetchBoom)).toBeNull();
  });
});

describe("Mode C — cloud SSE relay, spectator URL and battery handover", () => {
  it("publishes ~120-byte JSON packets to the room topic", async () => {
    const packet = await samplePacket();
    const post = vi.fn(async (_url: string, _init: { method: string; body: string; headers: Record<string, string> }) => ({ ok: true }));
    expect(await publishLiveUpdate(packet, post)).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    const [url, init] = post.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(url).toBe(`https://ntfy.sh/${ntfyTopic("CANCHA-ABCD")}`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(packet));
    expect(JSON.stringify(packet).length).toBeLessThan(420);
    expect(ntfyTopic("CANCHA-ABCD")).toBe("vos_live_CANCHA-ABCD");
  });

  it("reports failure when the relay is unreachable", async () => {
    const post = vi.fn(async () => {
      throw new Error("network down");
    });
    expect(await publishLiveUpdate(await samplePacket(), post)).toBe(false);
  });

  it("subscribes over EventSource and delivers parsed packets", async () => {
    const packet = await samplePacket();
    const received: LiveMatchPacket[] = [];
    const holder: { handler: ((event: { data: string }) => void) | null } = { handler: null };
    const created: string[] = [];
    const stop = subscribeLiveRoom("CANCHA-ABCD", (next) => received.push(next), {
      eventSourceImpl: (url) => {
        created.push(url);
        return {
          set onmessage(fn: ((event: { data: string }) => void) | null) {
            holder.handler = fn;
          },
          get onmessage() {
            return holder.handler;
          },
          onerror: null,
          close: vi.fn(),
        };
      },
      fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    });
    expect(created[0]).toBe("https://ntfy.sh/vos_live_CANCHA-ABCD/json");
    expect(holder.handler).not.toBeNull();
    (holder.handler as (event: { data: string }) => void)({
      data: JSON.stringify({ event: "message", message: JSON.stringify(packet) }),
    });
    expect(received).toEqual([packet]);
    stop();
  });

  it("builds spectator and handover QR URLs the app can parse back", async () => {
    const packet = await samplePacket();

    const spectator = createSpectatorUrl(packet);
    expect(spectator.startsWith(`${PAGES_ORIGIN}/?room=CANCHA-ABCD`)).toBe(true);
    const parsedSpectator = parseRoomParams(spectator.slice(spectator.indexOf("?")));
    expect(parsedSpectator.roomId).toBe("CANCHA-ABCD");
    expect(parsedSpectator.pubHash).toBe(packet.pubHash);
    expect(parsedSpectator.snapshot).toEqual(packet);
    expect(parsedSpectator.hostSecret).toBeNull();

    const handover = createHandoverUrl(packet, SECRET);
    const parsedHandover = parseRoomParams(`?${handover.split("?")[1] ?? ""}`);
    expect(parsedHandover.hostSecret).toBe(SECRET);
    expect(parsedHandover.snapshot).toEqual(packet);
    expect(await verifyPacket(parsedHandover.snapshot as LiveMatchPacket, SECRET)).toBe(true);
  });

  it("ignores malformed room params", () => {
    const params = parseRoomParams("?room=hacked&pub=zz&snap=@@&secret=nope");
    expect(params.roomId).toBeNull();
    expect(params.pubHash).toBeNull();
    expect(params.snapshot).toBeNull();
    expect(params.hostSecret).toBeNull();
  });
});

describe("Mode B+ — PIN bench mesh on :8765 (v10.0.0)", () => {
  it("mints and validates 4-digit bench pins", () => {
    expect(createBenchPin(() => 0)).toBe("0000");
    expect(createBenchPin(() => 0.9999)).toBe("9999");
    expect(createBenchPin()).toMatch(/^\d{4}$/u);
    expect(isValidBenchPin("4321")).toBe(true);
    expect(isValidBenchPin("432")).toBe(false);
    expect(isValidBenchPin("43a1")).toBe(false);
  });

  it("builds the bench join URL on the hotspot origin", () => {
    expect(createBenchJoinUrl("http://192.168.43.1:8765/", "4321")).toBe("http://192.168.43.1:8765/?pin=4321");
    expect(createBenchJoinUrl("http://192.168.137.1:8765", "0007")).toBe("http://192.168.137.1:8765/?pin=0007");
  });

  it("arms the PIN in the native server and no-ops on the web", () => {
    const pushed: string[] = [];
    (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge = {
      setLocalLivePin: (pin: string) => pushed.push(pin),
    };
    expect(setLocalLivePin("4321")).toBe(true);
    expect(pushed).toEqual(["4321"]);
    delete (window as Window & { VoleyOSBridge?: unknown }).VoleyOSBridge;
    expect(setLocalLivePin("4321")).toBe(false);
  });

  it("polls /state?pin= and distinguishes denied from offline", async () => {
    const packet = await samplePacket();
    const okFetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => packet }));
    const ok = await pollBenchState("http://192.168.43.1:8765", "4321", okFetch);
    expect(ok.status).toBe("ok");
    expect(ok.packet).toEqual(packet);
    expect(okFetch).toHaveBeenCalledWith("http://192.168.43.1:8765/state?pin=4321");

    const deniedFetch = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    expect((await pollBenchState("http://192.168.43.1:8765", "0000", deniedFetch)).status).toBe("denied");

    const boom = vi.fn(async () => {
      throw new Error("offline");
    });
    expect((await pollBenchState("http://192.168.43.1:8765", "4321", boom)).status).toBe("offline");
  });

  it("runs the bench mesh loop every 400ms until stopped", async () => {
    const packet = await samplePacket();
    vi.useFakeTimers();
    try {
      const received: LiveMatchPacket[] = [];
      const statuses: string[] = [];
      const stop = startBenchMesh({
        base: "http://192.168.43.1:8765",
        pin: "4321",
        onPacket: (next) => received.push(next),
        onStatus: (status) => statuses.push(status),
        fetchImpl: async () => ({ ok: true, status: 200, json: async () => packet }),
      });
      await vi.advanceTimersByTimeAsync(400);
      expect(received).toEqual([packet]);
      expect(statuses).toEqual(["ok"]);
      stop();
      await vi.advanceTimersByTimeAsync(800);
      expect(received).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
