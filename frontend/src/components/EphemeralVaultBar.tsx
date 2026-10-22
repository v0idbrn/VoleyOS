"use client";

import { useCallback, useEffect, useState } from "react";

import { COPY } from "@/lib/i18n";
import { VAULT_EVENT, destroyVault, loadVault, type VaultEntry, type VaultReceipt } from "@/lib/vault";
import type { Locale } from "@/lib/local-engines";

export function EphemeralVaultBar({ locale }: { locale: Locale }) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [receipt, setReceipt] = useState<VaultReceipt | null>(null);
  const [armed, setArmed] = useState(false);

  const sync = useCallback(() => {
    setEntries(loadVault());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(VAULT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(VAULT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const rows = entries.reduce((sum, entry) => sum + entry.rows, 0);

  const handleDestroy = (): void => {
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setReceipt(destroyVault());
    setArmed(false);
    sync();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-obsidian/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <span className="font-bold uppercase tracking-[0.18em] text-volt">{COPY[locale].vault}</span>
        <span className="text-white/60">
          {entries.length} {locale === "en" ? "reports" : locale === "pt" ? "relatórios" : "reportes"} · {rows} filas
        </span>
        <span className="hidden text-white/30 sm:inline">localStorage · 0 bytes al servidor</span>
        <div className="ml-auto flex items-center gap-2">
          {receipt ? (
            <span className="rounded bg-emerald/15 px-2 py-1 font-mono text-[10px] text-emerald" title="Recibo de destrucción">
              {receipt.destroyed} borrados · {receipt.receipt}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleDestroy}
            className={`rounded-lg border px-2 py-1 font-bold uppercase tracking-wider transition ${
              armed ? "border-crimson bg-crimson text-white" : "border-white/20 text-white/70 hover:border-crimson hover:text-crimson"
            }`}
          >
            {armed ? "¿Confirmar destrucción?" : "Destruir bóveda"}
          </button>
        </div>
      </div>
    </div>
  );
}
