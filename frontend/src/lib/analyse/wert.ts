// Wert aus Index und Text: der Baum eines Dokuments als gewöhnlicher JavaScript-Wert, gleich welches Format (CSV-Zeilen
// werden Objekte, YAML wird JSON-artig). Für Abfragen (jq, JSONPath, SQL), die mit Werten statt mit dem Index arbeiten.
// Die Gestalt folgt dem Index genau, damit Pfade aus einer Abfrage wieder auf Knoten zeigen. Rein, ohne Browser.

import { KEIN, KnotenArt, inhalt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { ganzOderZahl } from "../kern/json";

/** Zahl aus Rohtext; Ganzzahlen über 2^53 genau als bigint (STB-53); was keine endliche Zahl ist (YAML .inf, .nan),
 *  bleibt Text. */
function zahl(roh: string): number | bigint | string {
  const ohne = roh.replaceAll("_", "");
  const z = Number(ohne);
  return Number.isFinite(z) ? ganzOderZahl(ohne.replace(/^\+/, "")) : roh;
}

/** Wert eines Knotens. Ein Verweis (YAML-Alias auf ein Objekt oder eine Liste) bekommt den Wert seines Ziels; ein
 *  Verweis, der auf sich selbst zurückführt, wird null statt endlos zu laufen. */
export function wertAus(index: Strukturindex, text: string, k = 0, unterwegs: ReadonlySet<number> = new Set()): unknown {
  if (index.anzahl === 0 || k === KEIN) return null;
  const ziel = index.verweisZiele.get(k);
  if (ziel !== undefined) return unterwegs.has(ziel) ? null : wertAus(index, text, ziel, new Set([...unterwegs, ziel]));
  switch (index.art[k]) {
    case KnotenArt.objekt: {
      const o: Record<string, unknown> = {};
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) o[schluessel(index, text, c) ?? ""] = wertAus(index, text, c, unterwegs);
      return o;
    }
    case KnotenArt.liste: {
      const l: unknown[] = [];
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) l.push(wertAus(index, text, c, unterwegs));
      return l;
    }
    case KnotenArt.zahl:
      return zahl(inhalt(index, text, k));
    case KnotenArt.wahrheitswert:
      return /^(true|yes|on)$/i.test(inhalt(index, text, k));
    case KnotenArt.nichts:
      return null;
    default:
      return inhalt(index, text, k);
  }
}
