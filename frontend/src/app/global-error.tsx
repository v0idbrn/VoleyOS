"use client";

/**
 * Global error boundary (root layout failures): includes its own <html>/<body>
 * because it replaces the document. Without it, any escaped client exception
 * renders Next's blank "Application error" screen inside the APK.
 */

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[volleyos] global error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#070709", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 360, textAlign: "center", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 24 }}>
            <p style={{ fontSize: 32, margin: 0 }} aria-hidden>
              🏐
            </p>
            <h1 style={{ fontSize: 18, margin: "8px 0 0" }}>La app encontró un error · App hit an error</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", margin: "8px 0 0" }}>
              Tocá recargar. · Tap reload. · Toque recarregar.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px 14px",
                border: 0,
                borderRadius: 10,
                background: "#E11D48",
                color: "#fff",
                fontWeight: 800,
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              🔄 Recargar · Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
