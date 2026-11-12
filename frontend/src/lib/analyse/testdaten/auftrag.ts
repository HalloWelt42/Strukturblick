// Auftrag für Testdaten: Spezifikation, Anzahl, Startwert, Zielformat und Trennzeichen. Er lässt sich als Dokument
// ablegen (JSON mit der Kennung "$testdaten") und wieder lesen; ein offenes Auftragsdokument dient dem Werkzeug dann
// als Vorlage. Die Ausgabe der Datensätze geht über die Konvertierung, damit CSV und YAML genau so geschrieben werden
// wie beim Konvertieren eines Dokuments.

import { format } from "../../formate/registrierung";
import { umwandeln, VORGABEN } from "../konvertieren/konvertieren";
import type { Trennzeichen } from "../konvertieren/tabellieren";
import { ERZEUGER, type Einstellungen, type Einstellwert, type Json } from "./erzeuger";
import { LEERARTEN, type Feldspec, type Spezifikation } from "./spezifikation";

export type Zielformat = "csv" | "json" | "ndjson" | "yaml";

export const ZIELFORMATE: readonly { readonly kennung: Zielformat; readonly name: string; readonly endung: string }[] = [
  { kennung: "csv", name: "CSV", endung: "csv" },
  { kennung: "json", name: "JSON", endung: "json" },
  { kennung: "ndjson", name: "NDJSON", endung: "ndjson" },
  { kennung: "yaml", name: "YAML", endung: "yaml" },
];

export const TRENNZEICHEN: readonly { readonly wert: Trennzeichen; readonly titel: string }[] = [
  { wert: ";", titel: "Semikolon" },
  { wert: ",", titel: "Komma" },
  { wert: "\t", titel: "Tabulator" },
];

export interface Auftrag {
  readonly spezifikation: Spezifikation;
  readonly anzahl: number;
  readonly startwert: number;
  readonly ziel: Zielformat;
  readonly trennzeichen: Trennzeichen;
}

/** Datensätze im Zielformat; CSV und YAML über die Konvertierung (verschachtelte Felder wie dort) */
export function ausgeben(daten: readonly Json[], ziel: Zielformat, trennzeichen: Trennzeichen): string {
  if (ziel === "ndjson") return daten.map((d) => JSON.stringify(d)).join("\n") + (daten.length ? "\n" : "");
  const json = `${JSON.stringify(daten, null, 2)}\n`;
  if (ziel === "json") return json;
  const index = format("json").lesen(json).index;
  if (!index) return json;
  return umwandeln({ index, text: json, format: "json", formatName: "JSON", kommentare: false, fehler: 0, datumswerte: 0, typen: true }, ziel, { ...VORGABEN, trennzeichen }).text;
}

// ----- Ablegen und Lesen --------------------------------------------------------------------------------------------

const KENNUNG = "$testdaten";
const FASSUNG = 1;

export function alsText(a: Auftrag): string {
  return `${JSON.stringify({ [KENNUNG]: FASSUNG, anzahl: a.anzahl, startwert: a.startwert, ziel: a.ziel, trennzeichen: a.trennzeichen, felder: a.spezifikation.felder }, null, 2)}\n`;
}

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

function einstellwert(w: unknown): Einstellwert | null {
  if (typeof w === "string" || typeof w === "number" || typeof w === "boolean") return w;
  if (Array.isArray(w) && w.every((x) => istObjekt(x) && typeof x.wert === "string" && typeof x.gewicht === "number")) return w.map((x) => ({ wert: x.wert as string, gewicht: x.gewicht as number }));
  return null;
}

function feldAus(w: unknown): Feldspec | null {
  if (!istObjekt(w) || typeof w.pfad !== "string" || typeof w.erzeuger !== "string" || !ERZEUGER.some((e) => e.kennung === w.erzeuger)) return null;
  const einstellungen: Record<string, Einstellwert> = {};
  if (istObjekt(w.einstellungen)) for (const [s, x] of Object.entries(w.einstellungen)) {
    const e = einstellwert(x);
    if (e !== null) einstellungen[s] = e;
  }
  const l = istObjekt(w.leer) ? w.leer : {};
  const als = LEERARTEN.find((a) => a.wert === l.als)?.wert ?? "fehlt";
  const anteil = typeof l.anteil === "number" ? Math.max(0, Math.min(100, l.anteil)) : 0;
  return { pfad: w.pfad, erzeuger: w.erzeuger, einstellungen: einstellungen as Einstellungen, leer: { anteil, als } };
}

/** Auftrag aus dem Text eines Dokuments; null, wenn es keiner ist */
export function ausText(text: string): Auftrag | null {
  if (!text.includes(KENNUNG)) return null;
  let w: unknown;
  try {
    w = JSON.parse(text);
  } catch {
    return null;
  }
  if (!istObjekt(w) || w[KENNUNG] !== FASSUNG || !Array.isArray(w.felder)) return null;
  const felder = w.felder.map(feldAus).filter((f): f is Feldspec => f !== null);
  return {
    spezifikation: { felder },
    anzahl: typeof w.anzahl === "number" && w.anzahl > 0 ? Math.floor(w.anzahl) : 100,
    startwert: typeof w.startwert === "number" ? Math.floor(w.startwert) : 1,
    ziel: ZIELFORMATE.find((z) => z.kennung === w.ziel)?.kennung ?? "json",
    trennzeichen: TRENNZEICHEN.find((t) => t.wert === w.trennzeichen)?.wert ?? ";",
  };
}
