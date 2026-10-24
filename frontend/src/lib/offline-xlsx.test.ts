import { describe, expect, it, vi } from "vitest";

import { buildPrintableReport, buildXlsx, openPrintableReport, type ReportSpec } from "./offline-xlsx";

const report: ReportSpec = {
  title: "Scouting Tiburones",
  module: "scouting",
  locale: "es",
  generatedAt: "2026-10-23T00:00:00.000Z",
  sheets: [
    {
      name: "Reportes",
      headers: ["Módulo", "Filas"],
      rows: [["Scouting en 3 Toques", 12], ["Ataque", 4]],
    },
  ],
};

function readStoredZip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files: Record<string, string> = {};
  let offset = 0;
  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    files[name] = new TextDecoder().decode(bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return files;
}

describe("offline xlsx", () => {
  it("builds a stored ZIP with the OpenXML parts Excel needs", () => {
    const bytes = buildXlsx(report);
    expect(new TextDecoder().decode(bytes.slice(0, 2))).toBe("PK");
    const files = readStoredZip(bytes);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/styles.xml"]),
    );
    expect(files["xl/worksheets/sheet1.xml"]).toContain("Scouting en 3 Toques");
    expect(files["xl/workbook.xml"]).toContain("Reportes");
  });

  it("embeds every row as inline strings or numbers", () => {
    const files = readStoredZip(buildXlsx(report));
    const sheet = files["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain("<t xml:space=\"preserve\">Módulo</t>");
    expect(sheet).toContain("<v>12</v>");
    expect(sheet).toContain("<row r=\"3\">");
  });

  it("prints a seal over the whole report", async () => {
    const printable = await buildPrintableReport(report);
    expect(printable.seal).toMatch(/^[0-9a-f]{64}$/);
    expect(printable.html).toContain("VOS-SEAL");
    expect(printable.html).toContain("Scouting Tiburones");
    expect(printable.html).toContain("Ataque");
  });

  it("localises the printed chrome", async () => {
    const printable = await buildPrintableReport({ ...report, locale: "en" });
    expect(printable.html).toContain("Print / Save as PDF");
    expect(printable.html).toContain("60 local engines");
    expect(printable.html).not.toContain("Guardar PDF");
  });

  it("opens a printable tab and severs the opener", async () => {
    const writes: string[] = [];
    const fake = {
      opener: window,
      document: {
        open: vi.fn(),
        write: (html: string) => writes.push(html),
        close: vi.fn(),
      },
    } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(fake);
    await expect(openPrintableReport({ ...report, locale: "en" })).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(fake.opener).toBeNull();
    expect(writes.join("")).toContain("Print / Save as PDF");
    open.mockRestore();
  });

  it("reports blocked pop-ups instead of throwing", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await expect(openPrintableReport(report)).resolves.toBe(false);
    open.mockRestore();
  });
});
