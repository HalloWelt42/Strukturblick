// Ausgabe eines ganzen Abfrageergebnisses als Text: JSON (eine Liste), NDJSON (ein Wert je Zeile) oder CSV (Semikolon,
// wie es Tabellenprogramme im deutschen Raum erwarten). Werte aus jq, JSONPath und Suche werden für CSV zu Zeilen:
// Objekte mit der Vereinigung ihrer Schlüssel als Spalten, verschachtelte Werte als JSON-Text, andere Werte in einer
// Spalte "wert". Rein, ohne Browser.

import type { Zellwert } from "../../kern/abfrage";

export type Ausgabeformat = "json" | "ndjson" | "csv";

export const AUSGABEFORMATE: readonly { readonly kennung: Ausgabeformat; readonly name: string; readonly endung: string; readonly erklaerung: string }[] = [
  { kennung: "json", name: "JSON", endung: "json", erklaerung: "Eine Liste mit allen Ergebnissen" },
  { kennung: "ndjson", name: "NDJSON", endung: "ndjson", erklaerung: "Ein Ergebnis je Zeile" },
  { kennung: "csv", name: "CSV", endung: "csv", erklaerung: "Tabelle mit Semikolon, für Tabellenprogramme" },
];

const TRENNER = ";";

function feld(w: unknown): string {
  if (w === null || w === undefined) return "";
  const s = typeof w === "object" ? JSON.stringify(w) : String(w);
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
  if (format === "json") return JSON.stringify(werte, null, 2);
  if (format === "ndjson") return werte.map((w) => JSON.stringify(w ?? null)).join("\n") + (werte.length ? "\n" : "");
  const t = werteAlsTabelle(werte);
  return csvAus(t.spalten, t.zeilen);
}

export function zeilenAusgeben(spalten: readonly string[], zeilen: readonly (readonly Zellwert[])[], format: Ausgabeformat): string {
  if (format === "csv") return csvAus(spalten, zeilen);
  return werteAusgeben(zeilen.map((z) => Object.fromEntries(spalten.map((s, i) => [s, z[i]]))), format);
}
