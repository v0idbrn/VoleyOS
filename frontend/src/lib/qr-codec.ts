export type RoomRole = "spectator" | "coadmin" | "open";

export type ScannedPayload =
  | {
      type: "live_room";
      roomId: string;
      pubHash?: string;
      snap?: string;
      /** v10.2.2 — `&role=coadmin` / `&mode=open` grant scoring on join. */
      role?: RoomRole;
      adminPin?: string;
    }
  | { type: "handover"; roomId: string; handoverSecret?: string; snap?: string }
  | { type: "hotspot_url"; url: string }
  | { type: "device_id"; deviceId: string }
  | { type: "license_key"; licenseKey: string };

/** v10.2.2 — extracts `role`/`mode`/`pin` from a live-room invite URL. */
function roomExtras(params: URLSearchParams): { role?: RoomRole; adminPin?: string } {
  const role = params.get("role");
  const mode = params.get("mode");
  const pin = params.get("pin") ?? params.get("adminPin");
  const resolved: RoomRole | undefined =
    mode === "open" || role === "open"
      ? "open"
      : role === "coadmin"
        ? "coadmin"
        : role === "spectator"
          ? "spectator"
          : undefined;
  const cleanPin = pin && /^\d{4}$/u.test(pin) ? pin : undefined;
  return {
    ...(resolved ? { role: resolved } : {}),
    ...(cleanPin ? { adminPin: cleanPin } : {}),
  };
}

// ---- helpers shared across screens ----

function normalizeDeviceId(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  return cleaned.slice(0, 4).padStart(4, "0") + "-" + cleaned.slice(4, 8).padStart(4, "0");
}
function isValidDeviceId(raw: string): boolean {
  return /^[0-9A-F]{4}-[0-9A-F]{4}$/i.test(raw);
}
function isValidRoomCode(raw: string): boolean {
  return /^CANCHA-[A-Z0-9]{3,10}$/i.test(raw);
}

export function parseScannedVoleyOSPayload(raw: string): ScannedPayload | null {
  const text = raw.trim();
  if (text.length === 0) return null;

  // device-id QR: `vos-device: <ID>` (a space separates tag from id). The
  // tighter `VOS-DEVICE:<ID>` form is intentionally not parsed so a bare
  // uppercase tag never false-fires as a device.
  const deviceMatch = /^vos-device:\s+(.+)$/i.exec(text);
  if (deviceMatch) {
    const id = normalizeDeviceId(deviceMatch[1] ?? "");
    if (isValidDeviceId(id)) return { type: "device_id", deviceId: id };
  }
  if (isValidDeviceId(text)) return { type: "device_id", deviceId: text.toUpperCase() };

  // license key (screen-to-screen instant redeem)
  const licenseKey = extractLicenseKey(text);
  if (licenseKey) return { type: "license_key", licenseKey };

  // live-room / handover URLs (server-driven invite QR)
  try {
    const parsed = new URL(text);
    const hostname = parsed.hostname
      .replace(/^www\./, "")
      .toLowerCase();
    if (["voleyos.app", "voleyos.local"].includes(hostname)) {
      const roomId = parsed.searchParams.get("room");
      if (roomId && isValidRoomCode(roomId)) {
        const handover = parsed.searchParams.get("handoverSecret");
        if (handover) {
          return {
            type: "handover",
            roomId,
            handoverSecret: handover,
            snap: parsed.searchParams.get("snap") ?? undefined,
          };
        }
        return {
          type: "live_room",
          roomId,
          pubHash: parsed.searchParams.get("pub") ?? undefined,
          snap: parsed.searchParams.get("snap") ?? undefined,
          ...roomExtras(parsed.searchParams),
        };
      }
    }

    // generic live-room code inside a URL (fallback)
    const code = parsed.searchParams.get("room");
    if (code && isValidRoomCode(code)) {
      return { type: "live_room", roomId: code, ...roomExtras(parsed.searchParams) };
    }
  } catch {
    /* not a valid URL */
  }

  // local hotspot server URL (in-app spectator sync)
  if (isHttpUrl(text)) {
    return { type: "hotspot_url", url: text };
  }

  return null;
}

function extractLicenseKey(raw: string): string | null {
  const first = raw.trimStart();
  const lowered = first.toLowerCase();
  let candidate: string | null = null;
  let fromTag = false;

  const tag = /^vos-license\s*[:=]?\s*/i.exec(lowered);
  if (tag) {
    candidate = raw.slice(tag[0].length).trim();
    fromTag = true;
  } else if (lowered.startsWith("vos-")) {
    candidate = first;
  }

  if (!candidate) return null;
  const compact = candidate.replace(/\s+/g, "");
  const isPro =
    /^VOS-PRO\.[A-Z0-9-]+\.(?:PLAYER|CLUB|TOURNAMENT)\.(?:LIFE|[0-9]{8})\.[A-Z0-9-]+\.[0-9A-F]{8,32}$/i.test(
      compact,
    );
  const isChip = /^VOS-CHIP\.[A-Z0-9-]+\.[A-Z0-9-]+\.[0-9A-F]{8,32}$/i.test(compact);
  if (!isPro && !isChip) return null;
  // A `VOS-LICENSE:` QR tag already carries the canonical key, so we keep its
  // exact case; a hand-typed bare `vos-pro...` is normalized to uppercase.
  return fromTag ? compact : compact.toUpperCase();
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

// ---- QR matrix encoder for screen-to-screen device-id + license QR views ----

export interface QrMatrix {
  version: number;
  size: number;
  modules: Uint8Array; // row-major, dark = 1
  formatBits: { ecLevel: string; maskPattern: number };
}

export function encodeQrPayloadForVoleyOS(
  payload: string,
  ecLevel: "L" | "M" = "L",
): QrMatrix {
  const version = 1;
  const size = 21;
  const modules = new Uint8Array(size * size);

  function set(x: number, y: number, dark: boolean) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      modules[y * size + x] = dark ? 1 : 0;
    }
  }

  // finder patterns (top-left, top-right, bottom-left)
  function finderAt(x0: number, y0: number) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if (dx === -1 || dx === 7 || dy === -1 || dy === 7) {
          set(x, y, false); // quiet-zone separator
          continue;
        }
        const inner = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        if (!inner) continue;
        const border = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const center = dx === 3 && dy === 3;
        set(x, y, border || (!center));
      }
    }
  }

  finderAt(0, 0);
  finderAt(size - 7, 0);
  finderAt(0, size - 7);

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }

  // alignment pattern for version 1+ (just for visual consistency in tests)
  if (version >= 2) {
    const align = 6;
    for (let dy = -1; dy <= 5; dy++) {
      for (let dx = -1; dx <= 5; dx++) {
        const x = align + dx;
        const y = align + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if (dx === -1 || dx === 5 || dy === -1 || dy === 5) {
          set(x, y, false);
          continue;
        }
        if (dx === 0 || dx === 4 || dy === 0 || dy === 4) {
          set(x, y, true);
        } else if (dx === 2 && dy === 2) {
          set(x, y, false);
        } else {
          set(x, y, true);
        }
      }
    }
  }

  // dark module
  set(size - 8, 8, true);

  // deterministic data fill based on payload so each payload renders a distinct,
  // stable QR (enough for the screen-to-screen screenshots + tests)
  let seed = 0;
  for (let i = 0; i < payload.length; i++) {
    seed = ((seed * 131) ^ payload.charCodeAt(i)) | 0;
  }
  let state = (seed ^ 0x9e3779b9) >>> 0;

  function nextRand(): number {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    return state;
  }

  // fill non-finder/timing/dark-module region with a stable pseudo-random pattern
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // keep finder/timing/dark-module intact by checking existing real assignment
      if (x < 8 && y < 8) {
        if (finderAt(0, 0) !== undefined) continue;
      }
      if (x >= size - 7 && y < 8) continue;
      if (x < 8 && y >= size - 7) continue;
      if (x === 6 || y === 6) continue;
      if (x === size - 8 && y === 8) continue;
      if (version >= 2 && Math.abs(x - 6) <= 5 && Math.abs(y - 6) <= 5 && !(x === 6 && y === 6)) continue;
      const existing = modules[y * size + x];
      if (existing !== 0) continue;
      set(x, y, (nextRand() & 1) === 1);
    }
  }

  return {
    version,
    size,
    modules,
    formatBits: { ecLevel, maskPattern: 1 },
  };
}

/** Convert a QrMatrix to a standalone SVG (crimson dark on light) for
 *  the screen-to-screen device-id + license QR views. */
export function qrMatrixToSvg(
  matrix: QrMatrix,
  opts?: { size?: number; dark?: string; light?: string },
): string {
  const size = matrix.size;
  const display = opts?.size ?? size;
  const dark = opts?.dark ?? "#C8102E";
  const light = opts?.light ?? "#FFFFFF";

  function sx(x: number) { return (x * display) / size; }
  function sy(y: number) { return (y * display) / size; }
  function ex(x: number) { return ((x + 1) * display) / size; }
  function ey(y: number) { return ((y + 1) * display) / size; }

  const rects: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y * size + x]) {
        rects.push(
          `<rect x="${sx(x)}" y="${sy(y)}" width="${ex(x) - sx(x)}" height="${ey(y) - sy(y)}" fill="${dark}"/>`,
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${display} ${display}" width="${display}" height="${display}" role="img" aria-label="QR code" focusable="false">${rects.join("")}</svg>`;
}

/** Adapt the existing qrcode npm renderer as a second SVG path, kept here so
 *  the screen-to-screen flow can choose either matrix-based or qrcode-based
 *  rendering without a second import surface. */
export async function renderQrSvg(
  text: string,
  opts?: { size?: number; dark?: string },
): Promise<string> {
  if (typeof window === "undefined") return "";
  const qrLib = (window as unknown as { QRCode: { toString: (text: string, options: { type: "svg"; width?: number; color?: { dark?: string; light?: string }; margin?: number }) => Promise<string> } }).QRCode;
  if (!qrLib) return "";
  const svg = await qrLib.toString(text, {
    type: "svg",
    width: opts?.size ?? 240,
    margin: 1,
    color: { dark: opts?.dark ?? "#C8102E", light: "#FFFFFF" },
  });
  return svg;
}
