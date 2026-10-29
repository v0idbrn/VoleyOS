"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/local-engines";
import { copyTextUniversal } from "@/lib/security-shield";
import { parseScannedVoleyOSPayload } from "@/lib/qr-codec";
import type { ScannedPayload } from "@/lib/qr-codec";

type BridgeWindow = Window & {
  VoleyOSBridge?: {
    triggerHapticPattern?: (pattern: string) => void;
    playScorePop?: (volume: number) => void;
  };
  VosleyOSBridge?: unknown;
};

/**
 * v10.2.1 — the APK ships without the CAMERA permission (Play Protect
 * compliance), so inside the native WebView — or anywhere getUserMedia is
 * missing — we never open a live stream and go straight to the
 * upload-photo + paste-code interface. No permission prompt, no error.
 */
function cameraUnavailableInThisShell(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window as BridgeWindow;
  if (Boolean(bridge.VoleyOSBridge) || Boolean(bridge.VosleyOSBridge)) return true;
  return !(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
}

interface QRScannerModalProps {
  locale: Locale;
  onScanSuccess: (payload: ScannedPayload) => void;
  onClose: () => void;
}

export function QRScannerModal({ locale, onScanSuccess, onClose }: QRScannerModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [scanned, setScanned] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraSkipped, setCameraSkipped] = useState(false);
  const frameRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastId = useRef("");
  const frameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const startStream = useCallback(async () => {
    stop();
    setScanError(null);
    setScanned(null);
    if (cameraUnavailableInThisShell()) {
      setCameraSkipped(true);
      return;
    }
    setCameraSkipped(false);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
      });
      setStream(media);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Cámara no disponible");
    }
  }, [facing, stop]);

  useEffect(() => {
    startStream();
    return stop;
  }, [startStream, stop]);

  // React's JSX types omit srcObject, so wire the MediaStream imperatively.
  useEffect(() => {
    const el = frameRef.current;
    if (el) el.srcObject = stream;
  }, [stream]);

  const flip = useCallback(() => {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
  }, []);

  const parse = useCallback((text: string) => {
    const payload = parseScannedVoleyOSPayload(text);
    if (!payload) return false;
    const label =
      payload.type === "device_id"
        ? payload.deviceId
        : payload.type === "license_key"
          ? payload.licenseKey
          : payload.type === "hotspot_url"
            ? payload.url
            : payload.roomId;
    if (payload.type === "device_id" && payload.deviceId === lastId.current) return false;
    lastId.current = label;
    setScanned(label || text);
    onScanSuccess(payload);
    return true;
  }, [onScanSuccess]);

  const readFrame = useCallback(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (frame == null || canvas == null) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = frame.videoWidth || 320;
    canvas.height = frame.videoHeight || 240;
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      // small native probe: BarcodeDetector if available
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        // fire-and-forget; we also accept pasted/text fallbacks below.
        void (async () => {
          try {
            const det = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({
              formats: ["qr_code"],
            });
            const bars = await det.detect(canvas);
            for (const bar of bars) {
              if (parse(bar.rawValue)) return;
            }
          } catch {
            /* engine absent after feature check: ignore */
          }
        })();
      }
    } catch {
      /* canvas unavailable in this env: ignore */
    }
  }, [parse]);

  // 180 ms frame loop
  useEffect(() => {
    const tick = () => {
      readFrame();
      frameTimer.current = setTimeout(tick, 180);
    };
    if (stream) tick();
    return () => {
      if (frameTimer.current) clearTimeout(frameTimer.current);
    };
  }, [stream, readFrame]);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        if (!src.startsWith("data:image/")) return;
        const img = new Image();
        img.onload = () => {
          canvasRef.current = document.createElement("canvas");
          const ctx = canvasRef.current.getContext("2d");
          if (!ctx) return;
          canvasRef.current.width = img.naturalWidth;
          canvasRef.current.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          try {
            if (typeof window !== "undefined" && "BarcodeDetector" in window) {
              void (async () => {
                try {
                  const det = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (img: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({
                    formats: ["qr_code"],
                  });
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const bars = await det.detect(canvas);
                  for (const bar of bars) {
                    if (parse(bar.rawValue)) return;
                    setScanError("No se detectó código VoleyOS en esa imagen");
                  }
                } catch {
                  setScanError("Escáner nativo no disponible en este navegador");
                }
              })();
            } else {
              setScanError("Escáner nativo no disponible en este navegador");
            }
          } catch {
            setScanError("No se pudo leer el código");
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [parse],
  );

  const fileRef = useRef<HTMLInputElement | null>(null);

  const takePhotoOrUpload = useCallback((withCapture = true) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // v10.2.1: no capture hint inside the permission-less APK — the plain
    // gallery/file picker is the path there, never a camera intent.
    if (withCapture) input.capture = "environment";
    input.onchange = (e) => {
      const entry = e.target as HTMLInputElement;
      const file = entry.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
    fileRef.current = input;
  }, [handleFile]);

  const pasteNow = useCallback(async () => {
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setPasteError("Portapapeles vacío");
        return;
      }
      if (!parse(text)) setPasteError("No se detectó código VoleyOS en el portapapeles");
    } catch {
      setPasteError("Portapapeles bloqueado: pega manualmente abajo");
    }
  }, [parse]);

  const manualPaste = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (!value) { setPasteError("Pega un código primero"); return; }
      if (!parse(value)) setPasteError("No se detectó código VoleyOS en ese texto");
    },
    [parse],
  );

  // gentle haptic + audio cue on detection (only on capable surfaces)
  const cue = useCallback(
    (kind: "home_score" | "low_beep" | "success") => {
      const bridge = (window as BridgeWindow).VoleyOSBridge;
      try {
        bridge?.triggerHapticPattern?.(kind === "success" ? "home_point" : "low_beep");
      } catch {
        /* native hook absent */
      }
      try {
        bridge?.playScorePop?.(1);
      } catch {
        /* audio hook absent */
      }
    },
    [],
  );

  useEffect(() => {
    if (scanned) cue("success");
  }, [scanned, cue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70 p-3" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-volt/40 bg-obsidian/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-volt">
            {t(locale, "Escanear QR", "Scan QR", "Escanear QR")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/10"
          >
            ✕ {t(locale, "Salir", "Close", "Sair")}
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-black/40">
          {stream ? (
            <>
              <video
                ref={frameRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Crimson laser scan line */}
              <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-crimson shadow-[0_0_8px_2px_rgba(200,16,46,0.8)] animate-pulse" />
              {/* corner brackets */}
              <span className="absolute left-2 top-2 text-crimson text-lg">⌜</span>
              <span className="absolute right-2 top-2 text-crimson text-lg">⌝</span>
              <span className="absolute left-2 bottom-2 text-crimson text-lg">⌞</span>
              <span className="absolute right-2 bottom-2 text-crimson text-lg">⌟</span>
              {/* camera flip button */}
              <button
                type="button"
                onClick={flip}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-white backdrop-blur"
              >
                🔄 {t(locale, "Cambiar cámara", "Flip camera", "Mutar câmera")}
              </button>
            </>
          ) : cameraSkipped ? (
            <div data-testid="qr-manual-fallback" className="flex h-full flex-col items-center justify-center gap-2 px-4">
              <button
                type="button"
                onClick={() => takePhotoOrUpload(false)}
                className="w-full rounded-xl border border-volt/50 bg-volt/15 px-3 py-3 text-[12px] font-black uppercase tracking-wider text-volt"
              >
                📤 {t(locale, "Subir Foto del QR", "Upload QR Photo", "Enviar Foto do QR")}
              </button>
              <button
                type="button"
                onClick={pasteNow}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-[12px] font-black uppercase tracking-wider text-white"
              >
                📋 {t(locale, "Pegar Código / ID en 1 Toque", "Paste Code / ID in 1 Tap", "Colar Código / ID em 1 Toque")}
              </button>
              <p className="text-center text-[9px] leading-snug text-white/45">
                {t(
                  locale,
                  "Sin cámara: subí una foto del QR o pegá el código.",
                  "No camera: upload a QR photo or paste the code.",
                  "Sem câmera: envie uma foto do QR ou cole o código.",
                )}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-white/60">
              <p className="text-[11px] font-bold uppercase tracking-wider">{t(locale, "Cámara no senalizada", "No camera signal", "Câmera sem sinal")}</p>
              {scanError && <p className="max-w-[80%] text-center text-[10px] text-crimson">{scanError}</p>}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-3 py-2">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => takePhotoOrUpload(!cameraSkipped)} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white">
              📸 {t(locale, "Tomar foto / subir", "Take photo / upload", "Tirar foto / enviar")}
            </button>
            <button type="button" onClick={pasteNow} className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white">
              📋 {t(locale, "Pegar del portapapeles", "Paste clipboard", "Colar porta-lápis")}
            </button>
          </div>
          <textarea
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] font-mono text-white placeholder-white/30"
            rows={2}
            placeholder={t(locale, "O pega el código manualmente aquí", "Or paste the code here manually", "Ou cole o código manualmente aqui")}
            onChange={manualPaste}
          />
          {pasteError && <p className="mt-1 text-[10px] font-bold text-crimson">{pasteError}</p>}
          {scanned && <p className="mt-1 text-[10px] font-bold text-emerald">{t(locale, "¡Detectado!", "Detected!", "Detectado!")}</p>}
        </div>

        <div className="border-t border-white/10 px-3 py-2">
          <p className="text-[10px] leading-relaxed text-white/50">
            {t(
              locale,
              "Se escanean los códigos en vivo cada 180 ms.\nAparece pantalla completa en el teléfono y, en el navegador, solo se abre cuando el usuario acepta la cámara.",
              "Codes are scanned live every 180 ms.\nOn the phone it opens fullscreen; in the browser it only opens after the user accepts the camera.",
              "Os códigos são escaneados ao vivo a cada 180 ms.\nAbre em tela cheia no celular e, no navegador, só abre depois que o usuário aceita a câmera.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
