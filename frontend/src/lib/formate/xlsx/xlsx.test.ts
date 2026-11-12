// XLSX: Lesen einer Datei aus einem fremden Programm (pruefdaten/umsatz.xlsx, mit openpyxl erzeugt), Öffnen als
// JSON-Dokument, Schreiben und Zurücklesen, Datumswerte und Grenzfälle.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { xlsxLesen, XlsxFehler } from "./lesen";
import { xlsxAlsDokument } from "./oeffnen";
import { blattnamen, xlsxSchreiben } from "./schreiben";
import { bezug, datumAusSerie, istDatumsformat, serieAusDatum, spaltenName } from "./zellen";

const UMSATZ = new Uint8Array(readFileSync(new URL("../../../../pruefdaten/umsatz.xlsx", import.meta.url)));

describe("Zellen und Datum", () => {
  it("Spaltennamen und Bezüge", () => {
    expect([0, 25, 26, 701, 702].map(spaltenName)).toEqual(["A", "Z", "AA", "ZZ", "AAA"]);
    expect(bezug("AB12")).toEqual({ spalte: 27, zeile: 11 });
    expect(bezug("$C$3")).toEqual({ spalte: 2, zeile: 2 });
  });

  it("Seriennummern hin und zurück, auch um den 29.02.1900 herum", () => {
    expect(datumAusSerie(46329, false)).toBe("2026-11-03");
    expect(datumAusSerie(46331.6041666667, false)).toBe("2026-11-05T14:30:00");
    expect(datumAusSerie(1, false)).toBe("1900-01-01");
    expect(datumAusSerie(61, false)).toBe("1900-03-01");
    expect(datumAusSerie(0, true)).toBe("1904-01-01");
    expect(serieAusDatum("2026-11-03")).toBe(46329);
    expect(serieAusDatum("1900-03-01")).toBe(61);
    expect(serieAusDatum("2026-02-30")).toBeNull();
  });

  it("erkennt Datumsformate, aber keine Zahlenformate", () => {
    expect(istDatumsformat(14, undefined)).toBe(true);
    expect(istDatumsformat(164, "yyyy-mm-dd h:mm:ss")).toBe(true);
    expect(istDatumsformat(165, '#,##0.00 "€"')).toBe(false);
    expect(istDatumsformat(166, "0.0%")).toBe(false);
  });
});

describe("XLSX lesen", () => {
  it("liest die Datei aus dem fremden Programm mit Typen, Datum und Hinweisen", () => {
    const m = xlsxLesen(UMSATZ);
    expect(m.blaetter.map((b) => b.name)).toEqual(["Umsatz November", "Hinweise"]);
    expect(m.blaetter[0].zeilen.slice(0, 4)).toEqual([
      ["Tag", "Artikel", "Menge", "Preis", "Bezahlt", "Notiz"],
      ["2026-11-03", "Honig 500 g", 2, 7.5, true],
      ["2026-11-04", "Bergkäse 300 g", 1, 6.9, false, "Abholung Samstag"],
      ["2026-11-05T14:30:00", "Hofeier 10 Stück", 3, 3.8, true, "Grüße & Dank"],
    ]);
    expect(m.blaetter[1].zeilen).toEqual([["Lindenhof"], ["PLZ", "01067", 42]]);
    expect(m.hinweise).toEqual(["1 Formel: übernommen ist das zuletzt berechnete Ergebnis", "1 verbundener Zellbereich: nur die erste Zelle trägt den Wert"]);
  });

  it("öffnet als JSON-Dokument: Kopfzeile wird Feldnamen, leere Zeilen fallen weg", () => {
    const d = xlsxAlsDokument(UMSATZ, "umsatz.xlsx");
    expect(d.name).toBe("umsatz.json");
    const w = JSON.parse(d.text);
    expect(w["Umsatz November"][0]).toEqual({ Tag: "2026-11-03", Artikel: "Honig 500 g", Menge: 2, Preis: 7.5, Bezahlt: true, Notiz: null });
    expect(w["Umsatz November"]).toHaveLength(3);
    expect(w.Hinweise).toEqual([{ Lindenhof: "PLZ", "Spalte B": "01067", "Spalte C": 42 }]);
    expect(d.meldung).toContain("2 Blätter, 4 Zeilen");
  });

  it("weist Dateien ab, die keine Arbeitsmappe sind", () => {
    expect(() => xlsxLesen(new TextEncoder().encode("kein zip"))).toThrow(XlsxFehler);
  });
});

describe("XLSX schreiben", () => {
  it("schreibt Typen, Datum und Kopfzeile so, dass das Lesen dasselbe ergibt", () => {
    const bytes = xlsxSchreiben([
      { name: "Bestellungen", spalten: ["nr", "datum", "menge", "bezahlt", "notiz", "plz"], zeilen: [["B-1", "2026-11-01", 2, true, null, "01067"], ["B-2", "2026-11-02T08:15:00", 1.5, false, "a < b & c", "04109"]] },
      { name: "Angaben", spalten: null, zeilen: [["shop", "Hofladen"]] },
    ]);
    const m = xlsxLesen(bytes);
    expect(m.blaetter[0].zeilen).toEqual([
      ["nr", "datum", "menge", "bezahlt", "notiz", "plz"],
      ["B-1", "2026-11-01", 2, true, null, "01067"],
      ["B-2", "2026-11-02T08:15:00", 1.5, false, "a < b & c", "04109"],
    ]);
    expect(m.blaetter[1]).toEqual({ name: "Angaben", zeilen: [["shop", "Hofladen"]] });
    const teile = unzipSync(bytes);
    expect(Object.keys(teile).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]);
    expect(strFromU8(teile["xl/worksheets/sheet1.xml"])).toContain('state="frozen"');
  });

  it("Blattnamen: verbotene Zeichen, Länge, Doppel", () => {
    expect(blattnamen(["a/b", "x".repeat(40), "Daten", "daten", ""])).toEqual(["a_b", "x".repeat(31), "Daten", "daten (2)", "Blatt 5"]);
  });
});
