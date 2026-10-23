/**
 * Browser client for the VolleyOS API.
 *
 * Job downloads and previews enforce payment on the server; this client attaches
 * the creator key or the server-issued licence token so the backend can authorise
 * the request without trusting client-side state.
 */

import { readCreatorToken } from "@/lib/creator-unlock";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";
const LICENSE_KEY = "volleyos.license.token";
const MAX_TOKEN_LENGTH = 512;

export interface CreatorUnlockResult {
  unlocked: boolean;
  license_token: string;
  tier: string;
}

export interface JobPreview {
  job_id: string;
  module: string;
  title: string;
  is_paid: boolean;
  locked: boolean;
  row_count: number;
  columns: string[];
  summary: Record<string, unknown>;
  preview_rows: Array<Record<string, unknown>>;
  server_pro_audit_locked?: boolean;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLicenseToken(): string | null {
  const store = storage();
  const value = store?.getItem(LICENSE_KEY) ?? null;
  return value && value.length <= MAX_TOKEN_LENGTH ? value : null;
}

export function persistLicenseToken(token: string): void {
  const store = storage();
  if (!store || !token || token.length > MAX_TOKEN_LENGTH) return;
  store.setItem(LICENSE_KEY, token);
}

export function clearLicenseToken(): void {
  storage()?.removeItem(LICENSE_KEY);
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const license = readLicenseToken();
  if (license) headers["X-VoleyOS-License"] = license;
  const creatorKey = readCreatorToken();
  if (creatorKey) headers["X-Creator-Key"] = creatorKey;
  return headers;
}

function isUnlockResult(value: unknown): value is CreatorUnlockResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.unlocked === true &&
    typeof record.license_token === "string" &&
    record.license_token.startsWith("VOS-LIC-") &&
    typeof record.tier === "string"
  );
}

/** Ask the server to verify the key and mint a licence token. */
export async function unlockCreatorOnServer(
  creatorKey: string,
  jobId?: string,
): Promise<CreatorUnlockResult | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/security/creator-unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobId ? { creator_key: creatorKey, job_id: jobId } : { creator_key: creatorKey }),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!isUnlockResult(payload)) return null;
    persistLicenseToken(payload.license_token);
    return payload;
  } catch {
    return null;
  }
}

export async function fetchJobPreview(jobId: string): Promise<JobPreview | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/jobs/${encodeURIComponent(jobId)}/preview`, {
      headers: authHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as JobPreview;
  } catch {
    return null;
  }
}

/** Download an .xlsx/.csv report; the server returns 402 until paid or licensed. */
export async function downloadJobReport(jobId: string, format: "xlsx" | "csv" = "xlsx"): Promise<Response> {
  return fetch(`${API_BASE}/api/v1/jobs/${encodeURIComponent(jobId)}/download?format=${format}`, {
    headers: authHeaders(),
  });
}
