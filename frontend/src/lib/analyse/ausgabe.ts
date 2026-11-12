// Ausgabe von Ergebnissen als Text (Abfrage, gefilterte Tabelle, Treffer im Baum): JSON (eine Liste), NDJSON (ein Wert je
// Zeile) oder CSV (Semikolon, wie es Tabellenprogramme im deutschen Raum erwarten). Werte werden für CSV zu Zeilen:
// Objekte mit der Vereinigung ihrer Schlüssel als Spalten, verschachtelte Werte als JSON-Text, andere Werte in einer
// Spalte "wert". Rein, ohne Browser.

import type { Zellwert } from "../kern/abfrage";
import type { Strukturindex } from "../kern/strukturindex";
import { schreiben, teileVon } from "../kern/pfade";
import type { Tabelle } from "./tabelle";
import { wertAus } from "./wert";
import { jsonText } from "../kern/json";

export type Ausgabeformat = "json" | "ndjson" | "csv";

export const AUSGABEFORMATE: readonly { readonly kennung: Ausgabeformat; readonly name: string; readonly endung: string; readonly erklaerung: string }[] = [
  { kennung: "json", name: "JSON", endung: "json", erklaerung: "Eine Liste mit allen Ergebnissen" },
  { kennung: "ndjson", name: "NDJSON", endung: "ndjson", erklaerung: "Ein Ergebnis je Zeile" },
  { kennung: "csv", name: "CSV", endung: "csv", erklaerung: "Tabelle mit Semikolon, für Tabellenprogramme" },
];

const TRENNER = ";";

function feld(w: unknown): string {
  if (w === null || w === undefined) return "";
  const s = typeof w === "object" ? jsonText(w) : String(w);
  return /[;"\r\n]/.test(s) || s !== s.trim() ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvAus(spalten: readonly string[], zeilen: readonly (readonly unknown[])[]): string {
  return [spalten, ...zeilen].map((z) => z.map(feld).join(TRENNER)).join("\r\n") + "\r\n";
}

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

/** Werte als Tabelle: Objekte nach Schlüsseln, sonst eine Spalte "wert" */
export function werteAlsTabelle(werte: readonly unknown[]): { spalten: string[]; zeilen: unknown[][] } {
  if (werte.length && werte.every(istObjekt)) {
    const spalten: string[] = [];
    for (const o of werte) for (const s of Object.keys(o)) if (!spalten.includes(s)) spalten.push(s);
    return { spalten, zeilen: werte.map((o) => spalten.map((s) => o[s])) };
  }
  return { spalten: ["wert"], zeilen: werte.map((w) => [w]) };
}

export function werteAusgeben(werte: readonly unknown[], format: Ausgabeformat): string {
  if (format === "json") return jsonText(werte, 2);
  if (format === "ndjson") return werte.map((w) => jsonText(w ?? null)).join("\n") + (werte.length ? "\n" : "");
  const t = werteAlsTabelle(werte);
  return csvAus(t.spalten, t.zeilen);
}

export function zeilenAusgeben(spalten: readonly string[], zeilen: readonly (readonly Zellwert[])[], format: Ausgabeformat): string {
  if (format === "csv") return csvAus(spalten, zeilen);
  return werteAusgeben(zeilen.map((z) => Object.fromEntries(spalten.map((s, i) => [s, z[i]]))), format);
}

/** Die sichtbaren Zeilen einer Tabelle (Filter und Sortierung wie angezeigt) als Werte */
export const sichtWerte = (t: Tabelle, index: Strukturindex, text: string, sicht: Int32Array): unknown[] =>
  Array.from(sicht, (i) => wertAus(index, text, t.zeilen[i]));

/** Knoten (etwa Treffer im Baum) als Werte, in Textreihenfolge. Sind alle Objekte (ausgewählte Einträge), bleiben sie,
 *  wie sie sind; sonst (einzelne Werte einer Textsuche) kommt jeder mit seinem Pfad, damit man weiß, woher er stammt. */
export function knotenWerte(index: Strukturindex, text: string, knoten: ArrayLike<number>): unknown[] {
  const werte = Array.from(knoten, (k) => wertAus(index, text, k));
  if (werte.length && werte.every((w) => typeof w === "object" && w !== null && !Array.isArray(w))) return werte;
  return Array.from(knoten, (k, i) => ({ pfad: schreiben(teileVon(index, text, k), "jq"), wert: werte[i] }));
}
