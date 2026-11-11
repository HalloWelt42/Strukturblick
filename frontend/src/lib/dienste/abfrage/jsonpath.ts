// JSONPath (Bibliothek jsonpath-plus, Filter in deren sicherer Auswertung ohne eval) und die Suche (Text oder regulärer
// Ausdruck über Schlüssel und Werte). Beide liefern zu jedem Wert seinen Ort, also auch Treffer im Baum.

import { JSONPath } from "jsonpath-plus";
import { Suchfehler, textsuche } from "../../analyse/abfrage/textsuche";
import { wertAus } from "../../analyse/wert";
import { zeigerVon } from "../../kern/pfade";
import { werteErgebnis } from "./stuecke";
import { wurf, zielVon, type Maschine } from "./maschine";

interface Fund {
  readonly value: unknown;
  readonly pointer: string;
}

export const jsonpathMaschine: Maschine = async (a, q) => {
  const ziel = zielVon(a);
  const pfad = a.ausdruck.trim() || "$";
  let funde: Fund[];
  try {
    funde = JSONPath({ path: pfad, json: q.wert(ziel) as object, resultType: "all", eval: "safe", wrap: true }) as Fund[];
  } catch (f) {
    throw wurf(`JSONPath ungültig: ${(f as Error).message.replace(/^jsonPath: /, "")}`);
  }
  const orte = funde.map((f) => f.pointer);
  return werteErgebnis(funde.map((f) => f.value), orte, orte, a.ausgabe);
};

export const sucheMaschine: Maschine = async (a, q) => {
  const s = q.stand(zielVon(a));
  let knoten: number[];
  try {
    knoten = textsuche(s.index, s.text, a.ausdruck, a.suche);
  } catch (f) {
    if (f instanceof Suchfehler) throw wurf(f.message);
    throw f;
  }
  const orte = knoten.map((k) => zeigerVon(s.index, s.text, k));
  return werteErgebnis(knoten.map((k) => wertAus(s.index, s.text, k)), orte, orte, a.ausgabe);
};
