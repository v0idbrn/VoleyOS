import { safeJsonParse } from "@/lib/security-shield";

/**
 * Ephemeral vault: offline job previews stored in localStorage only.
 * Destroying it removes the payload and emits a signed-style UTC receipt.
 */

export interface VaultEntry {
  id: string;
  module: string;
  rows: number;
  createdAt: string;
}

export interface VaultReceipt {
  destroyed: number;
  deletedAt: string;
  receipt: string;
}

const KEY = "volleyos.vault.v1";
export const VAULT_EVENT = "volleyos:vault";

function isEntry(value: unknown): value is VaultEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.module === "string" &&
    typeof record.rows === "number" &&
    typeof record.createdAt === "string"
  );
}

export function loadVault(): VaultEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = safeJsonParse(raw, null);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

function persist(entries: VaultEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(VAULT_EVENT));
}

export function addVaultEntry(module: string, rows: number): VaultEntry[] {
  const entries = loadVault();
  const entry: VaultEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    module,
    rows,
    createdAt: new Date().toISOString(),
  };
  const next = [...entries, entry].slice(-24);
  persist(next);
  return next;
}

export function destroyVault(): VaultReceipt {
  const entries = loadVault();
  const deletedAt = new Date().toISOString();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(VAULT_EVENT));
  }
  const seed = `${entries.length}|${deletedAt}|${entries.map((entry) => entry.id).join(",")}`;
  return {
    destroyed: entries.length,
    deletedAt,
    receipt: hash(seed),
  };
}

function hash(input: string): string {
  let state = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    state ^= input.charCodeAt(index);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return `vlt_${state.toString(16).padStart(8, "0")}${Date.now().toString(16).slice(-8)}`;
}
