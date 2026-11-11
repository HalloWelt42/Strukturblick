// Gemeinsames der Sprachen, die Werte liefern (jq, JSONPath, Suche): Werte zu Stücken für die Anzeige, ganzes Ergebnis
// als Dokument.

import { ABFRAGE_GRENZEN, type Abfrageergebnis, type Wertstueck } from "../../kern/abfrage";

/** Eingerücktes JSON für die Anzeige; undefined (gibt es in JSON nicht) als null */
export const eingerueckt = (w: unknown): string => JSON.stringify(w ?? null, null, 2);

export function werteErgebnis(werte: readonly unknown[], orte: readonly (string | null)[] | null, treffer: readonly string[] | null, ganz: boolean): Abfrageergebnis {
  if (ganz) return { art: "dokument", text: eingerueckt(werte) };
  const stuecke: Wertstueck[] = werte.slice(0, ABFRAGE_GRENZEN.stuecke).map((w, i) => {
    const text = eingerueckt(w);
    const gekuerzt = text.length > ABFRAGE_GRENZEN.zeichenJeStueck;
    return { text: gekuerzt ? text.slice(0, ABFRAGE_GRENZEN.zeichenJeStueck) : text, ort: orte?.[i] ?? null, gekuerzt };
  });
  return { art: "werte", stuecke, anzahl: werte.length, treffer };
}
