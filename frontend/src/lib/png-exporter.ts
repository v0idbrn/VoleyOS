/**
 * v9.4 — crisp `1080x1350` PNG export for the SVG artists (Premios poster,
 * Match poster, VolleyCard radar, chalkboard), with native
 * `navigator.share({ files })` for WhatsApp / Instagram and an automatic
 * `.png` download fallback when sharing is unavailable.
 */

export const PNG_WIDTH = 1080;
export const PNG_HEIGHT = 1350;

export type RasterizeFn = (svg: string, width: number, height: number) => Promise<Blob | null>;

/** Forces an explicit pixel size on the root `<svg>` so the canvas is crisp. */
export function ensureSvgSize(svg: string, width: number, height: number): string {
  return svg.replace(/^<svg\b[^>]*>/i, (tag) => {
    const stripped = tag
      .replace(/\swidth="[^"]*"/i, "")
      .replace(/\sheight="[^"]*"/i, "");
    return stripped.replace(
      "<svg",
      `<svg width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"`,
    );
  });
}

/**
 * Draws the SVG onto a canvas and returns a PNG blob.
 * Returns `null` in environments without image loading (tests, old WebViews),
 * which callers translate into the download/failure paths — never a crash.
 */
export async function rasterizeSvgToPng(
  svg: string,
  width: number = PNG_WIDTH,
  height: number = PNG_HEIGHT,
  timeoutMs = 5000,
): Promise<Blob | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  try {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ensureSvgSize(svg, width, height))}`;
    const img = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true;
        if (timer !== null) clearTimeout(timer);
        resolve(value);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      timer = setTimeout(() => finish(false), timeoutMs);
      img.src = dataUrl;
    });
    if (!loaded) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0B0B0F";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch {
    return null;
  }
}

/* ------------------------------------------- Android WebView file bridge */

interface VosSaveBridge {
  shareOrSaveDataUri?: (filename: string, dataUriOrText: string, mimeType: string) => boolean;
}

function vosSaveBridge(): VosSaveBridge["shareOrSaveDataUri"] | undefined {
  const bridge = (globalThis as { VoleyOSBridge?: VosSaveBridge }).VoleyOSBridge;
  return typeof bridge?.shareOrSaveDataUri === "function" ? bridge.shareOrSaveDataUri.bind(bridge) : undefined;
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  if (typeof FileReader === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch {
      resolve(null);
    }
  });
}

/**
 * v10.1.1 — hand the payload to the native Android bridge first: WebView
 * cannot download `blob:` URLs, so inside the APK every export must become a
 * real file + native share sheet. Text payloads go across synchronously;
 * `data:` URIs are decoded natively. Returns `false` outside the APK.
 */
export async function saveViaBridge(
  input: Blob | string,
  filename: string,
  mimeType = "application/octet-stream",
): Promise<boolean> {
  const bridge = vosSaveBridge();
  if (!bridge) return false;
  try {
    if (typeof input === "string") return bridge(filename, input, mimeType) === true;
    const dataUrl = await blobToDataUrl(input);
    if (!dataUrl) return false;
    return bridge(filename, dataUrl, input.type || mimeType) === true;
  } catch {
    return false;
  }
}

/** Synchronous bridge save for TEXT exports (`.vos`, `.csv`, `.svg`, JSON). */
export function bridgeSaveData(filename: string, data: string, mimeType: string): boolean {
  const bridge = vosSaveBridge();
  if (!bridge) return false;
  try {
    return bridge(filename, data, mimeType) === true;
  } catch {
    return false;
  }
}

/**
 * Universal save: Android bridge → standard browser `<a download>`. Returns
 * `true` when either path accepted the file.
 */
export async function saveFileUniversal(
  input: Blob | string,
  filename: string,
  mimeType = "application/octet-stream",
): Promise<boolean> {
  const blob =
    typeof input === "string" ? new Blob([input], { type: mimeType }) : input;
  if (await saveViaBridge(blob, filename, mimeType)) return true;
  return downloadBlob(blob, filename);
}

/** Saves a blob as a file download. Returns false where downloads are blocked. */
export function downloadBlob(blob: Blob, filename: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return false;
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.click();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}

export type PngShareOutcome = "shared" | "downloaded" | "failed";

interface SharePngOptions {
  width?: number;
  height?: number;
  /** Injectable rasterizer (tests); defaults to the canvas pipeline. */
  rasterize?: RasterizeFn;
  canShare?: (file: File) => boolean;
  share?: (file: File) => Promise<void>;
}

/**
 * Rasterize → share as a real photo → fall back to a `.png` download.
 * `"failed"` only when the environment cannot rasterize at all.
 */
export async function sharePng(
  svg: string,
  filename: string,
  options: SharePngOptions = {},
): Promise<PngShareOutcome> {
  const width = options.width ?? PNG_WIDTH;
  const height = options.height ?? PNG_HEIGHT;
  const rasterize =
    options.rasterize ?? ((value: string, w: number, h: number) => rasterizeSvgToPng(value, w, h));
  const blob = await rasterize(svg, width, height);
  if (!blob) return "failed";

  // 1) Android APK: the native bridge turns the PNG into a real file and
  //    opens the system share sheet (blob: URLs die inside WebView).
  if (await saveViaBridge(blob, filename, "image/png")) return "downloaded";

  const file = new File([blob], filename, { type: "image/png" });
  const nav = typeof navigator === "undefined" ? null : navigator;
  const shareApi = nav && typeof nav.share === "function" ? nav.share.bind(nav) : null;
  const canShareApi = nav && typeof nav.canShare === "function" ? nav.canShare.bind(nav) : null;

  const share = options.share ?? (shareApi ? (target: File) => shareApi({ files: [target] }) : null);
  const canShare =
    options.canShare ??
    ((target: File) => Boolean(share && canShareApi && canShareApi({ files: [target] })));

  if (share && canShare(file)) {
    try {
      await share(file);
      return "shared";
    } catch {
      /* sheet dismissed: fall through to the download fallback */
    }
  }
  return downloadBlob(blob, filename) ? "downloaded" : "failed";
}
