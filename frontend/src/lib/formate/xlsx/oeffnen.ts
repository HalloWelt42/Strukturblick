// Eine XLSX-Datei als Dokument öffnen: Strukturblick arbeitet auf Text, deshalb wird die Arbeitsmappe ein JSON-Dokument
// mit einer Liste je Blatt. Die erste Zeile ist die Kopfzeile, wenn sie nur Texte enthält; sonst heißen die Felder nach
// der Spalte (A, B ...). Leere Zellen werden null, ganz leere Zeilen fallen weg. Typen bleiben (Zahl, Wahrheitswert,
// Datum als ISO-Text).

import { xlsxLesen, type Blatt, type Zellwert } from "./lesen";
import { spaltenName } from "./zellen";

export const TABELLENDATEI_ENDUNGEN: readonly string[] = ["xlsx"];

export interface Geoeffnet {
  readonly name: string;
  readonly text: string;
  readonly meldung: string;
}

/** Feldnamen aus der Kopfzeile: leere heißen nach der Spalte, doppelte bekommen eine Zahl */
function feldnamen(kopf: readonly Zellwert[], breite: number): string[] {
  const vergeben = new Map<string, number>();
  return Array.from({ length: breite }, (_, i) => {
    const roh = kopf[i] === null || kopf[i] === undefined || String(kopf[i]).trim() === "" ? `Spalte ${spaltenName(i)}` : String(kopf[i]).trim();
    const n = (vergeben.get(roh) ?? 0) + 1;
    vergeben.set(roh, n);
    return n === 1 ? roh : `${roh} ${n}`;
  });
}

function blattAlsListe(b: Blatt): Record<string, Zellwert>[] {
  const zeilen = b.zeilen.filter((z) => z.some((w) => w !== null && w !== ""));
  if (!zeilen.length) return [];
  const breite = Math.max(...zeilen.map((z) => z.length));
  const mitKopf = zeilen[0].every((w) => w === null || typeof w === "string") && zeilen.length > 1;
  const namen = mitKopf ? feldnamen(zeilen[0], breite) : Array.from({ length: breite }, (_, i) => spaltenName(i));
  return zeilen.slice(mitKopf ? 1 : 0).map((z) => Object.fromEntries(namen.map((n, i) => [n, z[i] ?? null])));
}

export function xlsxAlsDokument(bytes: Uint8Array, dateiname: string): Geoeffnet {
  const mappe = xlsxLesen(bytes);
  const daten: Record<string, Record<string, Zellwert>[]> = {};
  let zeilen = 0;
  for (const b of mappe.blaetter) {
    const liste = blattAlsListe(b);
    daten[b.name] = liste;
    zeilen += liste.length;
  }
  const n = mappe.blaetter.length;
  const meldung = [`${dateiname} als JSON geöffnet: ${n} ${n === 1 ? "Blatt" : "Blätter"}, ${zeilen.toLocaleString("de-DE")} Zeilen`, ...mappe.hinweise].join("; ");
  return { name: `${dateiname.replace(/\.[^.]+$/, "")}.json`, text: JSON.stringify(daten, null, 2) + "\n", meldung };
}
