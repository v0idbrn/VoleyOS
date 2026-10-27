import { describe, expect, it, vi } from "vitest";

import { PNG_WIDTH, PNG_HEIGHT, ensureSvgSize, rasterizeSvgToPng, sharePng } from "@/lib/png-exporter";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540"><rect width="720" height="540" fill="#0B0B0F"/></svg>';

describe("png exporter", () => {
  it("forces the crisp target size onto the svg root", () => {
    const sized = ensureSvgSize(SVG, PNG_WIDTH, PNG_HEIGHT);
    expect(sized).toContain(`width="${PNG_WIDTH}"`);
    expect(sized).toContain(`height="${PNG_HEIGHT}"`);
    expect(sized).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(PNG_WIDTH).toBe(1080);
    expect(PNG_HEIGHT).toBe(1350);
  });

  it("returns null when the environment cannot rasterize (jsdom fallback)", async () => {
    await expect(rasterizeSvgToPng(SVG, 10, 10, 15)).resolves.toBeNull();
  });

  it("shares the PNG through navigator when files are supported", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const share = vi.fn().mockResolvedValue(undefined);
    const outcome = await sharePng(SVG, "poster.png", {
      rasterize: async () => blob,
      canShare: () => true,
      share,
    });
    expect(outcome).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const file = share.mock.calls[0]?.[0] as File;
    expect(file.name).toBe("poster.png");
    expect(file.type).toBe("image/png");
  });

  it("falls back to a .png download when sharing is unavailable", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const url = URL as unknown as { createObjectURL?: (b: Blob) => string; revokeObjectURL?: (u: string) => void };
    const originalCreate = url.createObjectURL;
    const originalRevoke = url.revokeObjectURL;
    url.createObjectURL = vi.fn(() => "blob:vos");
    url.revokeObjectURL = vi.fn();
    try {
      const outcome = await sharePng(SVG, "poster.png", {
        rasterize: async () => blob,
        canShare: () => false,
      });
      expect(outcome).toBe("downloaded");
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      click.mockRestore();
      if (originalCreate) url.createObjectURL = originalCreate;
      if (originalRevoke) url.revokeObjectURL = originalRevoke;
      else delete url.revokeObjectURL;
    }
  });

  it("reports failure when rasterization is impossible", async () => {
    const outcome = await sharePng(SVG, "poster.png", { rasterize: async () => null });
    expect(outcome).toBe("failed");
  });

  it("falls back to download when the share sheet is dismissed", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const url = URL as unknown as { createObjectURL?: (b: Blob) => string; revokeObjectURL?: (u: string) => void };
    url.createObjectURL = vi.fn(() => "blob:vos");
    url.revokeObjectURL = vi.fn();
    try {
      const outcome = await sharePng(SVG, "poster.png", {
        rasterize: async () => blob,
        canShare: () => true,
        share: async () => {
          throw new Error("AbortError");
        },
      });
      expect(outcome).toBe("downloaded");
    } finally {
      click.mockRestore();
      delete (url as { createObjectURL?: unknown }).createObjectURL;
      delete (url as { revokeObjectURL?: unknown }).revokeObjectURL;
    }
  });
});
