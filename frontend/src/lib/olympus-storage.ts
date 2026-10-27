/**
 * v10 Olympus storage engine — IndexedDB past Android WebView's 5 MB
 * `localStorage` ceiling (500+ MB of offline match history, rally snapshots,
 * scouting logs and `.vos` vault backups), with a synchronous dual-slot WAL
 * fallback (`atomicSave` / `atomicLoad`) whenever IndexedDB is unavailable
 * (private mode, quota denied, jsdom tests).
 *
 * Object stores (DB `voleyos_olympus_db`, version 1):
 *  - `matches`         → archived 🏆 Mi Temporada matches
 *  - `media_snapshots` → court / video frame snapshots
 *  - `scouting_logs`   → DataVolley-lite live scouting tags
 *  - `vault_backups`   → encrypted `.vos` backup envelopes
 */

import { atomicLoad, atomicSave } from "@/lib/security-shield";

export const OLYMPUS_DB_NAME = "voleyos_olympus_db";
export const OLYMPUS_DB_VERSION = 1;
export const OLYMPUS_STORES = ["matches", "media_snapshots", "scouting_logs", "vault_backups"] as const;

export type OlympusStore = (typeof OLYMPUS_STORES)[number];

/** localStorage mirror key for the synchronous WAL fallback slot. */
export function olympusFallbackKey(store: OlympusStore, key: string): string {
  return `voleyos_olympus_${store}_${key}`;
}

function openOlympus(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(OLYMPUS_DB_NAME, OLYMPUS_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of OLYMPUS_STORES) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(
  db: IDBDatabase,
  store: OlympusStore,
  mode: IDBTransactionMode,
  body: (objectStore: IDBObjectStore) => IDBRequest,
  onResult: (value: unknown) => T,
  fallback: () => T,
): Promise<T> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, mode);
      const request = body(tx.objectStore(store));
      request.onsuccess = () => resolve(onResult(request.result));
      request.onerror = () => resolve(fallback());
      tx.onabort = () => resolve(fallback());
    } catch {
      resolve(fallback());
    }
  });
}

/** Stores one record in IndexedDB; falls back to the dual-slot WAL mirror. */
export async function olympusPut<T>(store: OlympusStore, key: string, value: T): Promise<boolean> {
  const db = await openOlympus();
  if (!db) return atomicSave(olympusFallbackKey(store, key), value);
  try {
    const ok = await run(
      db,
      store,
      "readwrite",
      (objectStore) => objectStore.put(value, key),
      () => true,
      () => false,
    );
    db.close();
    if (!ok) return atomicSave(olympusFallbackKey(store, key), value);
    return true;
  } catch {
    return atomicSave(olympusFallbackKey(store, key), value);
  }
}

/** Reads one record; tries IndexedDB first, then the WAL fallback slot. */
export async function olympusGet<T>(store: OlympusStore, key: string, fallbackValue: T): Promise<T> {
  const db = await openOlympus();
  if (!db) return atomicLoad(olympusFallbackKey(store, key), fallbackValue);
  try {
    const value = await run<unknown>(
      db,
      store,
      "readonly",
      (objectStore) => objectStore.get(key),
      (result) => result,
      () => undefined,
    );
    db.close();
    if (value !== undefined && value !== null) return value as T;
    return atomicLoad(olympusFallbackKey(store, key), fallbackValue);
  } catch {
    return atomicLoad(olympusFallbackKey(store, key), fallbackValue);
  }
}

/** Reads every record in a store (newest writes first when keys sort last). */
export async function olympusAll<T>(store: OlympusStore): Promise<T[]> {
  const db = await openOlympus();
  if (!db) return [];
  try {
    const values = await run<unknown[]>(
      db,
      store,
      "readonly",
      (objectStore) => objectStore.getAll(),
      (result) => (Array.isArray(result) ? (result as T[]) : []),
      () => [],
    );
    db.close();
    return values as T[];
  } catch {
    return [];
  }
}

/** Deletes one record from IndexedDB and its WAL mirror. */
export async function olympusDelete(store: OlympusStore, key: string): Promise<boolean> {
  try {
    window.localStorage.removeItem(olympusFallbackKey(store, key));
  } catch {
    /* storage unavailable */
  }
  const db = await openOlympus();
  if (!db) return true;
  try {
    const ok = await run(
      db,
      store,
      "readwrite",
      (objectStore) => objectStore.delete(key),
      () => true,
      () => false,
    );
    db.close();
    return ok;
  } catch {
    return false;
  }
}

/** Synchronous dual-slot WAL write (used where promises cannot be awaited). */
export function olympusPutSync<T>(store: OlympusStore, key: string, value: T): boolean {
  return atomicSave(olympusFallbackKey(store, key), value);
}

/** Synchronous dual-slot WAL read (pair of `olympusPutSync`). */
export function olympusGetSync<T>(store: OlympusStore, key: string, fallbackValue: T): T {
  return atomicLoad(olympusFallbackKey(store, key), fallbackValue);
}
