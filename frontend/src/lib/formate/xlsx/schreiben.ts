// XLSX schreiben: die kleinste vollständige Arbeitsmappe nach ECMA-376 (Inhaltstypen, Beziehungen, Arbeitsmappe,
// Formate, je Blatt ein Arbeitsblatt), gepackt mit fflate. Zahlen und Wahrheitswerte behalten ihren Typ, ISO-Datum und
// ISO-Datum mit Zeit werden echte Datumswerte mit Format, alles andere Text direkt in der Zelle. Die Kopfzeile ist fett
// und bleibt beim Rollen stehen.

import { strToU8, zipSync } from "fflate";
import { serieAusDatum, spaltenName } from "./zellen";

export interface Ausgabeblatt {
  readonly name: string;
  /** Kopfzeile; null ohne Kopfzeile */
  readonly spalten: readonly string[] | null;
  readonly zeilen: readonly (readonly unknown[])[];
}

/** Grenzen von XLSX */
export const GRENZEN = { zeilen: 1048576, spalten: 16384, zeichen: 32767, blattname: 31 } as const;

const STIL = { standard: 0, datum: 1, datumZeit: 2, kopf: 3 } as const;

const maskieren = (s: string): string =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** Erlaubter, eindeutiger Blattname: ohne []:*?/\ und höchstens 31 Zeichen */
export function blattnamen(namen: readonly string[]): string[] {
  const vergeben = new Set<string>();
  return namen.map((roh, i) => {
    let n = roh.replace(/[[\]:*?/\\]/g, "_").slice(0, GRENZEN.blattname).trim() || `Blatt ${i + 1}`;
    const stamm = n.slice(0, GRENZEN.blattname - 4);
    for (let z = 2; vergeben.has(n.toLowerCase()); z++) n = `${stamm} (${z})`;
    vergeben.add(n.toLowerCase());
    return n;
  });
}

function zelle(ref: string, w: unknown, kopf: boolean): string {
  if (w === null || w === undefined || w === "") return "";
  if (typeof w === "number" && Number.isFinite(w)) return `<c r="${ref}"><v>${w}</v></c>`;
  if (typeof w === "boolean") return `<c r="${ref}" t="b"><v>${w ? 1 : 0}</v></c>`;
  const s = typeof w === "object" ? JSON.stringify(w) : String(w);
  const serie = kopf ? null : serieAusDatum(s);
  if (serie !== null) return `<c r="${ref}" s="${s.length > 10 ? STIL.datumZeit : STIL.datum}"><v>${serie}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${kopf ? ` s="${STIL.kopf}"` : ""}><is><t xml:space="preserve">${maskieren(s.slice(0, GRENZEN.zeichen))}</t></is></c>`;
}

function arbeitsblatt(b: Ausgabeblatt): string {
  const zeilen = b.spalten ? [b.spalten, ...b.zeilen] : b.zeilen;
  const daten = zeilen.slice(0, GRENZEN.zeilen).map((z, r) => {
    const zellen = z.slice(0, GRENZEN.spalten).map((w, c) => zelle(`${spaltenName(c)}${r + 1}`, w, b.spalten !== null && r === 0)).join("");
    return `<row r="${r + 1}">${zellen}</row>`;
  });
  const stehen = b.spalten ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${stehen}<sheetData>${daten.join("")}</sheetData></worksheet>`;
}

export function xlsxSchreiben(blaetter: readonly Ausgabeblatt[]): Uint8Array {
  const namen = blattnamen(blaetter.map((b) => b.name));
  const dateien: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        namen.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        "</Types>",
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        namen.map((n, i) => `<sheet name="${maskieren(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        "</sheets></workbook>",
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        namen.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${namen.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts>' +
        '<fonts count="2"><font><sz val="11"/></font><font><b/><sz val="11"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    ),
  };
  blaetter.forEach((b, i) => (dateien[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(arbeitsblatt(b))));
  return zipSync(dateien, { level: 6 });
}
