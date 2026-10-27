/**
 * v9.4 — signed `.vos` full backup vault.
 *
 * Packs teams, the unified player directory, My Season history, flow roster,
 * pinned favourites and active licences into one checksum-verified JSON file
 * that restores everything on a new phone.
 */

import { downloadBlob } from "@/lib/png-exporter";
import { checksumOf, safeJsonParse } from "@/lib/security-shield";

export const VOS_BACKUP_FORMAT = "volleyos.backup";
export const VOS_BACKUP_VERSION = 1;

const KEYS = {
  teams: "volleyos.teams",
  directory: "voleyos_player_directory_v1",
  season: "voleyos_season_history_v1",
  flowRoster: "voleyos_flow_roster_v1",
  pins: "volleyos.pins",
  supporterChip: "volleyos.supporter.chip",
  creatorToken: "volleyos.creator.token",
  customerLicense: "volleyos.vospro.license",
  apiLicense: "volleyos.license.token",
} as const;

export type VosBackupPayload = Record<keyof typeof KEYS, string | null>;

export interface VosBackup {
  format: typeof VOS_BACKUP_FORMAT;
  version: typeof VOS_BACKUP_VERSION;
  createdAt: number;
  checksum: string;
  payload: VosBackupPayload;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function buildVosBackup(now = Date.now()): VosBackup {
  const payload: VosBackupPayload = {
    teams: readRaw(KEYS.teams),
    directory: readRaw(KEYS.directory),
    season: readRaw(KEYS.season),
    flowRoster: readRaw(KEYS.flowRoster),
    pins: readRaw(KEYS.pins),
    supporterChip: readRaw(KEYS.supporterChip),
    creatorToken: readRaw(KEYS.creatorToken),
    customerLicense: readRaw(KEYS.customerLicense),
    apiLicense: readRaw(KEYS.apiLicense),
  };
  return {
    format: VOS_BACKUP_FORMAT,
    version: VOS_BACKUP_VERSION,
    createdAt: now,
    checksum: checksumOf(JSON.stringify(payload)),
    payload,
  };
}

export function serializeVosBackup(now = Date.now()): string {
  return JSON.stringify(buildVosBackup(now));
}

export type VosVerifyResult =
  | { ok: true; backup: VosBackup }
  | { ok: false; reason: "parse" | "format" | "checksum" };

export function verifyVosBackup(text: string): VosVerifyResult {
  const parsed = safeJsonParse<Partial<VosBackup> | null>(text, null);
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "parse" };
  if (parsed.format !== VOS_BACKUP_FORMAT || parsed.version !== VOS_BACKUP_VERSION) {
    return { ok: false, reason: "format" };
  }
  if (typeof parsed.checksum !== "string" || !parsed.payload || typeof parsed.payload !== "object") {
    return { ok: false, reason: "format" };
  }
  if (checksumOf(JSON.stringify(parsed.payload)) !== parsed.checksum) {
    return { ok: false, reason: "checksum" };
  }
  return { ok: true, backup: parsed as VosBackup };
}

/** Writes every non-null payload slot back into localStorage. */
export function applyVosBackup(backup: VosBackup): boolean {
  try {
    for (const [field, value] of Object.entries(backup.payload)) {
      const key = (KEYS as Record<string, string | undefined>)[field];
      if (!key || value === null) continue;
      window.localStorage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

/** Downloads `<date>.vos`; returns the filename, or null when blocked. */
export function downloadVosBackup(now = Date.now()): string | null {
  if (typeof document === "undefined") return null;
  try {
    const filename = `volleyos-backup-${new Date(now).toISOString().slice(0, 10)}.vos`;
    const blob = new Blob([serializeVosBackup(now)], { type: "application/json" });
    return downloadBlob(blob, filename) ? filename : null;
  } catch {
    return null;
  }
}
