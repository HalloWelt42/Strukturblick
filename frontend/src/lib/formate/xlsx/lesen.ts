// XLSX lesen: die Datei ist ein ZIP mit XML-Teilen (Arbeitsmappe, Beziehungen, gemeinsame Texte, Formate, Blätter).
// Entpackt mit fflate, gelesen mit dem eigenen XML-Leser. Ergebnis: je Blatt die Zeilen mit typisierten Werten (Zahl,
// Wahrheitswert, Text, Datum als ISO-Text). Formeln liefern ihr zuletzt berechnetes Ergebnis; das sagen die Hinweise.

import { strFromU8, unzipSync } from "fflate";
import { xmlLesen, type Element, type Textstueck } from "../xml/dom";
import { bezug, datumAusSerie, istDatumsformat } from "./zellen";

export type Zellwert = string | number | boolean | null;

export interface Blatt {
  readonly name: string;
  readonly zeilen: Zellwert[][];
}

export interface Arbeitsmappe {
  readonly blaetter: Blatt[];
  /** Was beim Lesen nicht mitkommt (Formeln, Fehlerwerte, verbundene Zellen) */
  readonly hinweise: string[];
}

export class XlsxFehler extends Error {}

const lokal = (name: string): string => name.slice(name.indexOf(":") + 1);
const kinder = (el: Element | undefined, name: string): Element[] => (el?.kinder.filter((k): k is Element => k.art === "element" && lokal(k.name) === name) ?? []);
const kind = (el: Element | undefined, name: string): Element | undefined => kinder(el, name)[0];
/** Wert eines Attributs; aus dem Text, wenn er keine Entities enthielt */
const attribut = (t: string, el: Element, name: string): string | undefined => {
  const a = el.attribute.find((x) => x.name === name || lokal(x.name) === name);
  return a ? (a.dekodiert ?? t.slice(a.von + 1, a.bis - 1)) : undefined;
};

class Mappe {
  private readonly dateien: Record<string, Uint8Array>;
  constructor(bytes: Uint8Array) {
    try {
      this.dateien = unzipSync(bytes);
    } catch {
      throw new XlsxFehler("Das ist keine XLSX-Datei (kein gültiges ZIP)");
    }
  }

  /** XML-Teil lesen: Wurzelelement und Text */
  xml(pfad: string): { el: Element; t: string } | null {
    const roh = this.dateien[pfad];
    if (!roh) return null;
    const t = strFromU8(roh);
    const d = xmlLesen(t);
    return d.wurzel ? { el: d.wurzel, t } : null;
  }
}

/** Text eines Elements samt aller Unter-Elemente (Texte in Abschnitten <r><t>), ohne Lautschrift <rPh> */
function textIn(t: string, el: Element): string {
  let aus = "";
  for (const k of el.kinder) {
    if (k.art === "text") aus += (k as Textstueck).dekodiert ?? t.slice(k.von, k.bis);
    else if (lokal(k.name) !== "rPh") aus += textIn(t, k);
  }
  return aus;
}

export function xlsxLesen(bytes: Uint8Array): Arbeitsmappe {
  const mappe = new Mappe(bytes);
  const wb = mappe.xml("xl/workbook.xml");
  if (!wb) throw new XlsxFehler("Die Datei hat keine Arbeitsmappe (xl/workbook.xml fehlt)");
  const system1904 = attribut(wb.t, kind(wb.el, "workbookPr") ?? wb.el, "date1904") === "1" || attribut(wb.t, kind(wb.el, "workbookPr") ?? wb.el, "date1904") === "true";

  // Beziehungen: r:id zu Pfad
  const ziele = new Map<string, string>();
  const rels = mappe.xml("xl/_rels/workbook.xml.rels");
  for (const r of kinder(rels?.el, "Relationship")) {
    const ziel = attribut(rels!.t, r, "Target") ?? "";
    ziele.set(attribut(rels!.t, r, "Id") ?? "", ziel.startsWith("/") ? ziel.slice(1) : `xl/${ziel}`);
  }

  // Gemeinsame Texte
  const sst = mappe.xml("xl/sharedStrings.xml");
  const texte = kinder(sst?.el, "si").map((si) => textIn(sst!.t, si));

  // Zahlenformate: Stil-Index zu "ist Datum"
  const stile = mappe.xml("xl/styles.xml");
  const formate = new Map<number, string>();
  for (const f of kinder(kind(stile?.el, "numFmts"), "numFmt")) formate.set(Number(attribut(stile!.t, f, "numFmtId")), attribut(stile!.t, f, "formatCode") ?? "");
  const datumsStil = kinder(kind(stile?.el, "cellXfs"), "xf").map((xf) => {
    const id = Number(attribut(stile!.t, xf, "numFmtId") ?? 0);
    return istDatumsformat(id, formate.get(id));
  });

  let formeln = 0;
  let fehlerwerte = 0;
  let verbunden = 0;
  const blaetter: Blatt[] = [];
  for (const s of kinder(kind(wb.el, "sheets"), "sheet")) {
    const name = attribut(wb.t, s, "name") ?? `Blatt ${blaetter.length + 1}`;
    const pfad = ziele.get(attribut(wb.t, s, "r:id") ?? attribut(wb.t, s, "id") ?? "");
    const ws = pfad ? mappe.xml(pfad) : null;
    if (!ws) continue;
    verbunden += kinder(kind(ws.el, "mergeCells"), "mergeCell").length;
    const zeilen: Zellwert[][] = [];
    let zeilenNr = 0;
    for (const row of kinder(kind(ws.el, "sheetData"), "row")) {
      const r = Number(attribut(ws.t, row, "r") ?? zeilenNr + 1) - 1;
      zeilenNr = r + 1;
      const zeile: Zellwert[] = [];
      let spalte = 0;
      for (const c of kinder(row, "c")) {
        const ort = bezug(attribut(ws.t, c, "r") ?? "");
        if (ort) spalte = ort.spalte;
        if (kind(c, "f")) formeln++;
        const typ = attribut(ws.t, c, "t") ?? "n";
        const v = kind(c, "v");
        const roh = v ? textIn(ws.t, v) : "";
        let wert: Zellwert = null;
        if (typ === "inlineStr") wert = textIn(ws.t, kind(c, "is") ?? c);
        else if (!v || roh === "") wert = null;
        else if (typ === "s") wert = texte[Number(roh)] ?? "";
        else if (typ === "str") wert = roh;
        else if (typ === "b") wert = roh === "1" || roh === "true";
        else if (typ === "e") { wert = roh; fehlerwerte++; }
        else if (typ === "d") wert = roh;
        else {
          const n = Number(roh);
          wert = Number.isFinite(n) ? (datumsStil[Number(attribut(ws.t, c, "s") ?? 0)] ? datumAusSerie(n, system1904) : n) : roh;
        }
        zeile[spalte] = wert;
        spalte++;
      }
      zeilen[r] = Array.from(zeile, (w) => w ?? null);
    }
    blaetter.push({ name, zeilen: Array.from(zeilen, (z) => z ?? []) });
  }
  const hinweise: string[] = [];
  if (formeln) hinweise.push(`${formeln.toLocaleString("de-DE")} ${formeln === 1 ? "Formel" : "Formeln"}: übernommen ist das zuletzt berechnete Ergebnis`);
  if (fehlerwerte) hinweise.push(`${fehlerwerte.toLocaleString("de-DE")} Fehlerwerte wie #DIV/0! stehen als Text da`);
  if (verbunden) hinweise.push(`${verbunden.toLocaleString("de-DE")} verbundene Zellbereiche: nur die erste Zelle trägt den Wert`);
  return { blaetter, hinweise };
}
