// Wert aus Index und Text: der Baum eines Dokuments als gewöhnlicher JavaScript-Wert, gleich welches Format (CSV-Zeilen
// werden Objekte, YAML wird JSON-artig). Für Abfragen (jq, JSONPath, SQL), die mit Werten statt mit dem Index arbeiten.
// Die Gestalt folgt dem Index genau, damit Pfade aus einer Abfrage wieder auf Knoten zeigen. Rein, ohne Browser.

import { KEIN, KnotenArt, inhalt, schluessel, type Strukturindex } from "../kern/strukturindex";

/** Zahl aus Rohtext; was keine endliche Zahl ist (YAML .inf, .nan), bleibt Text. */
function zahl(roh: string): number | string {
  const z = Number(roh.replaceAll("_", ""));
  return Number.isFinite(z) ? z : roh;
}

export function wertAus(index: Strukturindex, text: string, k = 0): unknown {
  if (index.anzahl === 0 || k === KEIN) return null;
  switch (index.art[k]) {
    case KnotenArt.objekt: {
      const o: Record<string, unknown> = {};
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) o[schluessel(index, text, c) ?? ""] = wertAus(index, text, c);
      return o;
    }
    case KnotenArt.liste: {
      const l: unknown[] = [];
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) l.push(wertAus(index, text, c));
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
