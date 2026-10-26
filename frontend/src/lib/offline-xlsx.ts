/**
 * Offline report generation: a minimal but valid OpenXML .xlsx writer using a
 * stored (uncompressed) ZIP container, plus a printable report with a VOS-SEAL.
 *
 * No network, no third-party dependency, no telemetry. Works inside the APK.
 */

export interface SheetSpec {
  name: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface ReportSpec {
  title: string;
  module: string;
  locale: string;
  generatedAt: string;
  sheets: SheetSpec[];
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnLetter(index: number): string {
  let value = index + 1;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function dosStamp(date: Date): { time: number; date: number } {
  const time = ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day = (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
  return { time, date: day };
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Stored-only ZIP: valid for Excel and readable without compression libs. */
function buildZip(entries: ZipEntry[], now: Date): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const stamp = dosStamp(now);
  let offset = 0;

  for (const entry of entries) {
    const name = encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, stamp.time, true);
    view.setUint16(12, stamp.date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    local.set(name, 30);
    chunks.push(local, entry.data);

    const header = new Uint8Array(46 + name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint16(6, 20, true);
    headerView.setUint16(8, 0x0800, true);
    headerView.setUint16(10, 0, true);
    headerView.setUint16(12, stamp.time, true);
    headerView.setUint16(14, stamp.date, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, entry.data.length, true);
    headerView.setUint32(24, entry.data.length, true);
    headerView.setUint16(28, name.length, true);
    headerView.setUint16(30, 0, true);
    headerView.setUint16(32, 0, true);
    headerView.setUint16(34, 0, true);
    headerView.setUint16(36, 0, true);
    headerView.setUint32(38, 0, true);
    headerView.setUint32(42, offset, true);
    header.set(name, 46);
    central.push(header);
    offset += local.length + entry.data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const total = chunks.reduce((sum, part) => sum + part.length, 0) + centralSize + end.length;
  const output = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...chunks, ...central, end]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

function sheetXml(sheet: SheetSpec): string {
  const rows: string[] = [];
  const all = [sheet.headers, ...sheet.rows];
  all.forEach((row, rowIndex) => {
    const cells = row
      .map((cell, columnIndex) => {
        const ref = `${columnLetter(columnIndex)}${rowIndex + 1}`;
        if (typeof cell === "number" && Number.isFinite(cell)) {
          return `<c r="${ref}"><v>${cell}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(String(cell))}</t></is></c>`;
      })
      .join("");
    rows.push(`<row r="${rowIndex + 1}">${cells}</row>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

function safeSheetName(name: string, index: number): string {
  const clean = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28);
  return clean || `Sheet ${index + 1}`;
}

/** Build a valid .xlsx workbook (ZIP store + OpenXML) entirely in the browser. */
export function buildXlsx(report: ReportSpec): Uint8Array {
  const sheets = report.sheets.length > 0 ? report.sheets : [{ name: "Reporte", headers: ["Campo"], rows: [["Sin datos"]] }];
  const sheetFiles: ZipEntry[] = sheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: encode(sheetXml(sheet)),
  }));
  const workbookSheets = sheets
    .map((sheet, index) => `<sheet name="${xml(safeSheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const workbookRels = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");
  const overrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");

  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/styles.xml",
      data: encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
      ),
    },
    ...sheetFiles,
  ];

  return buildZip(files, new Date(report.generatedAt));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Revoking in the same tick aborts the download in Chromium.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadXlsx(report: ReportSpec): void {
  const bytes = buildXlsx(report);
  downloadBlob(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${slugify(report.module)}-${report.generatedAt.slice(0, 10)}.xlsx`);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "unavailable";
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface PrintableReport {
  html: string;
  seal: string;
}

function sheetTable(sheet: SheetSpec): string {
  const head = sheet.headers.map((header) => `<th>${xml(header)}</th>`).join("");
  const body = sheet.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${xml(String(cell))}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

const DEFAULT_PRINT_COPY = {
  print: "Imprimir / Guardar PDF",
  footer:  "61 motores locales · 0 telemetría · Sello SHA-256 sobre el contenido del reporte.",
};

const PRINT_COPY: Record<string, typeof DEFAULT_PRINT_COPY> = {
  es: DEFAULT_PRINT_COPY,
  en: { print: "Print / Save as PDF", footer:  "61 local engines · 0 telemetry · SHA-256 seal over the report content." },
  pt: { print: "Imprimir / Salvar PDF", footer:  "61 motores locais · 0 telemetria · Selo SHA-256 sobre o conteúdo do relatório." },
};

/** Printable A4 report with a VOS-SEAL derived from every cell. */
export async function buildPrintableReport(report: ReportSpec): Promise<PrintableReport> {
  const canonical = JSON.stringify([report.module, report.title, report.generatedAt, report.sheets]);
  const seal = await sha256Hex(canonical);
  const copy = PRINT_COPY[report.locale] ?? DEFAULT_PRINT_COPY;
  const html = `<!doctype html><html lang="${xml(report.locale)}"><head><meta charset="utf-8"/><title>${xml(report.title)}</title><style>
@page{size:A4;margin:14mm}
body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;margin:0}
h1{font-size:22px;margin:0 0 4px}
.meta{font-size:11px;color:#555;margin-bottom:14px}
.seal{font-family:ui-monospace,monospace;font-size:10px;color:#0a7a4f;word-break:break-all;margin:10px 0 16px}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px}
th{text-align:left;background:#f1f5f9;border-bottom:1px solid #cbd5e1;padding:6px}
td{border-bottom:1px solid #e2e8f0;padding:5px 6px}
footer{margin-top:18px;font-size:9px;color:#666}
@media print{.no-print{display:none}}
</style></head><body>
<button class="no-print" onclick="window.print()">${xml(copy.print)}</button>
<h1>${xml(report.title)}</h1>
<div class="meta">${xml(report.module)} · ${xml(report.generatedAt)} · VolleyOS · AGPL-3.0-or-later</div>
<div class="seal">VOS-SEAL ${seal}</div>
${report.sheets.map((sheet) => `<h2>${xml(sheet.name)}</h2>${sheetTable(sheet)}`).join("")}
<footer>${xml(copy.footer)}</footer>
</body></html>`;
  return { html, seal };
}

export async function openPrintableReport(report: ReportSpec): Promise<boolean> {
  const { html } = await buildPrintableReport(report);
  if (typeof window === "undefined") return false;
  // A "noopener" window.open() returns null, so open a normal tab, hand it the
  // already-escaped document, and sever the opener reference immediately.
  const view = window.open("", "_blank");
  if (!view) return false;
  view.opener = null;
  view.document.open();
  view.document.write(html);
  view.document.close();
  return true;
}
