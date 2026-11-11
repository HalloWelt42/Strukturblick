// Suche der Abfrage: Text oder regulärer Ausdruck über Schlüssel und einfache Werte aller Knoten. Ergebnis sind die
// Knoten in Textreihenfolge. Ein Regex, der ewig rechnet, wird nicht hier gebremst, sondern vom Dienst (Zeitgrenze des
// Workers). Rein, ohne Browser.

import { istBehaelter, inhalt, schluessel, type Strukturindex } from "../../kern/strukturindex";

export interface Suchoptionen {
  /** Ausdruck als regulären Ausdruck lesen */
  readonly regex: boolean;
  /** Groß- und Kleinschreibung unterscheiden */
  readonly grossKlein: boolean;
}

export const VORGABE_SUCHE: Suchoptionen = { regex: false, grossKlein: false };

/** Fehler im regulären Ausdruck, für Menschen */
export class Suchfehler extends Error {}

function pruefer(ausdruck: string, o: Suchoptionen): (s: string) => boolean {
  if (o.regex) {
    let r: RegExp;
    try {
      r = new RegExp(ausdruck, o.grossKlein ? "u" : "iu");
    } catch (f) {
      throw new Suchfehler(`Regulärer Ausdruck ungültig: ${(f as Error).message.replace(/^Invalid regular expression: /, "")}`);
    }
    return (s) => r.test(s);
  }
  if (o.grossKlein) return (s) => s.includes(ausdruck);
  const klein = ausdruck.toLocaleLowerCase("de");
  return (s) => s.toLocaleLowerCase("de").includes(klein);
}

/** Knoten, deren Schlüssel oder einfacher Wert passt; leer bei leerem Ausdruck */
export function textsuche(index: Strukturindex, text: string, ausdruck: string, o: Suchoptionen = VORGABE_SUCHE): number[] {
  if (ausdruck === "") return [];
  const passt = pruefer(ausdruck, o);
  const treffer: number[] = [];
  for (let k = 0; k < index.anzahl; k++) {
    const s = schluessel(index, text, k);
    if ((s !== null && passt(s)) || (!istBehaelter(index.art[k]) && passt(inhalt(index, text, k)))) treffer.push(k);
  }
  return treffer;
}
