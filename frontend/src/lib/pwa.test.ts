import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC = join(process.cwd(), "public");

interface Manifest {
  name: string;
  start_url: string;
  display: string;
  icons: Array<{ src: string; sizes: string; purpose?: string }>;
}

describe("pwa assets", () => {
  it("declares an installable manifest with real icon files", () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8")) as Manifest;
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/es");
    expect(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons) {
      expect(existsSync(join(PUBLIC, icon.src))).toBe(true);
    }
  });

  it("ships a service worker that skips api requests", () => {
    const sw = readFileSync(join(PUBLIC, "sw.js"), "utf8");
    expect(sw).toContain("/api/");
    expect(sw).toContain("navigate");
  });
});
