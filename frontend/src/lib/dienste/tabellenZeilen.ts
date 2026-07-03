// Umwandlung zwischen dem JsonWert-Wertebaum und einem flachen, editierbaren
// Zeilenmodell. Grundlage der editierbaren Tabelle: hier wird der Baum in je
// Datensatz ein flaches Objekt (Spalte -> Wert) zerlegt und wieder zu einer
// Liste von Objekten zusammengesetzt. Beide Funktionen sind rein und ohne
// Seiteneffekt - direkt testbar.

import type { JsonWert } from '../api/typen'

/** Eine editierbare Zeile: flaches Objekt Spaltenname -> Zellwert. */
export type TabellenZeile = Record<string, JsonWert>

/** Wahr, wenn der Wert ein Objekt (kein Array, kein null) ist. */
function istObjekt(wert: JsonWert): wert is Record<string, JsonWert> {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

/**
 * Zerlegt den Wertebaum in flache Zeilen. Für jedes Element der Wurzel-Liste
 * entsteht ein Objekt mit genau den übergebenen Spalten als Schlüssel. Fehlt
 * eine Zelle im Datensatz (Schlüssel nicht vorhanden), bleibt sie undefined.
 * Nicht-Objekt-Elemente (z. B. Skalare in einer gemischten Liste) ergeben eine
 * Zeile mit lauter undefined-Zellen. Ist die Wurzel keine Liste, kommt eine
 * leere Zeilenliste zurück.
 */
export function zeilenAusWurzel(wurzel: JsonWert, spalten: string[]): TabellenZeile[] {
  if (!Array.isArray(wurzel)) return []
  return wurzel.map((element) => {
    const zeile: TabellenZeile = {}
    for (const spalte of spalten) {
      if (istObjekt(element) && Object.prototype.hasOwnProperty.call(element, spalte)) {
        zeile[spalte] = element[spalte]
      } else {
        zeile[spalte] = undefined as unknown as JsonWert
      }
    }
    return zeile
  })
}

/**
 * Setzt die Zeilen wieder zu einer Liste von Objekten zusammen. Die Schlüssel
 * jedes Objekts folgen der übergebenen Spaltenreihenfolge; Zellen mit dem Wert
 * undefined werden ausgelassen (kein Schlüssel im Ergebnis). So bleibt der
 * Unterschied zwischen "fehlender Zelle" und "vorhandener Zelle mit null"
 * erhalten. Das Ergebnis ist stets eine Liste (JsonWert[]).
 */
export function wurzelAusZeilen(
  zeilen: TabellenZeile[],
  spaltenReihenfolge: string[],
): JsonWert {
  return zeilen.map((zeile) => {
    const objekt: Record<string, JsonWert> = {}
    for (const spalte of spaltenReihenfolge) {
      const wert = zeile[spalte]
      if (wert !== undefined) {
        objekt[spalte] = wert
      }
    }
    return objekt
  })
}
