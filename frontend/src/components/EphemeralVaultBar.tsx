"use client";

import { useCallback, useEffect, useState } from "react";

import { t } from "@/lib/i18n";
import { VAULT_EVENT, destroyVault, loadVault, type VaultEntry, type VaultReceipt } from "@/lib/vault";
import type { Locale } from "@/lib/local-engines";

export function EphemeralVaultBar({ locale, embedded = false }: { locale: Locale; embedded?: boolean }) {
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
    <div
      className={
        embedded
          ? "rounded-2xl border border-white/10 bg-panel px-3 py-3"
          : "fixed inset-x-0 bottom-14 z-40 border-t border-white/10 bg-obsidian/95 px-3 py-2 backdrop-blur"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <span className="font-bold uppercase tracking-[0.18em] text-volt">
          {t(locale, "Bóveda efímera", "Ephemeral vault", "Cofre efêmero")}
        </span>
        <span className="text-white/60">
          {entries.length} {t(locale, "reportes", "reports", "relatórios")} · {rows} {t(locale, "filas", "rows", "linhas")}
        </span>
        <span className="hidden text-white/30 sm:inline">
          localStorage · {t(locale, "0 bytes al servidor", "0 bytes to the server", "0 bytes para o servidor")}
        </span>
        <div className={embedded ? "mt-1 flex w-full items-center gap-2" : "ml-auto flex items-center gap-2"}>
          {receipt ? (
            <span className="rounded bg-emerald/15 px-2 py-1 font-mono text-[10px] text-emerald" title="Receipt">
              {receipt.destroyed} · {receipt.receipt}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleDestroy}
            className={`tap rounded-lg border px-2 py-1 font-bold uppercase tracking-wider transition ${
              armed ? "border-crimson bg-crimson text-white" : "border-white/20 text-white/70 hover:border-crimson hover:text-crimson"
            }`}
          >
            {armed
              ? t(locale, "¿Confirmar?", "Confirm?", "Confirmar?")
              : t(locale, "Destruir bóveda", "Destroy vault", "Destruir cofre")}
          </button>
        </div>
      </div>
    </div>
  );
}
