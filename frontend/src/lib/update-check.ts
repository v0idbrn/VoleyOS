/** On-demand GitHub release checker: fires only when the user taps it. */

export const APP_VERSION = "10.0.0";

export const RELEASES_URL = "https://api.github.com/repos/v0idbrn/VoleyOS/releases/latest";
export const RELEASES_PAGE = "https://github.com/v0idbrn/VoleyOS/releases";

export type UpdateCheck =
  | { status: "up-to-date"; version: string }
  | { status: "update"; version: string; url: string }
  | { status: "error"; message: string };

/** "v9.2.0" / "9.2" → numeric segments for comparison. */
export function parseVersion(tag: string): number[] {
  return tag
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    });
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const left = parseVersion(candidate);
  const right = parseVersion(current);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

interface GitHubRelease {
  tag_name?: unknown;
  html_url?: unknown;
  assets?: unknown;
}

export async function checkForUpdate(
  currentVersion: string = APP_VERSION,
  fetcher: typeof fetch = fetch,
): Promise<UpdateCheck> {
  try {
    const response = await fetcher(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return { status: "error", message: `HTTP ${response.status}` };
    const data = (await response.json()) as GitHubRelease;
    if (typeof data.tag_name !== "string" || data.tag_name.length === 0) {
      return { status: "error", message: "malformed release" };
    }
    const version = data.tag_name;
    const page = typeof data.html_url === "string" ? data.html_url : RELEASES_PAGE;
    let apkUrl = page;
    if (Array.isArray(data.assets)) {
      for (const asset of data.assets) {
        const url = (asset as { browser_download_url?: unknown }).browser_download_url;
        const name = (asset as { name?: unknown }).name;
        if (typeof url === "string" && typeof name === "string" && name.toLowerCase().endsWith(".apk")) {
          apkUrl = url;
          break;
        }
      }
    }
    if (!isNewerVersion(version, currentVersion)) return { status: "up-to-date", version };
    return { status: "update", version, url: apkUrl };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "network error" };
  }
}
