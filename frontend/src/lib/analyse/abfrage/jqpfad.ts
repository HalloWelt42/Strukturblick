// Treffer für jq: jq liefert Werte, keine Stellen. Stellen gibt `path(f)`, aber nur, solange f nur auswählt (baut f
// neue Werte wie {nr, summe}, bricht path ab). Deshalb die vorderen Teile des Ausdrucks an den Röhren `|` der obersten
// Ebene, vom längsten zum kürzesten: der erste, der Pfade ergibt, bestimmt die Treffer. Rein, ohne Browser.

import { zeigerAus, type Teil } from "../../kern/pfade";

/** Stellen der Röhren `|` auf oberster Ebene (nicht in Klammern, Texten oder Kommentaren). */
export function roehren(ausdruck: string): number[] {
  const stellen: number[] = [];
  let tiefe = 0;
  for (let i = 0; i < ausdruck.length; i++) {
    const z = ausdruck[i];
    if (z === "#") {
      const ende = ausdruck.indexOf("\n", i);
      if (ende < 0) break;
      i = ende;
    } else if (z === '"') {
      // Text mit Escapes; \( ... ) darin (Interpolation) zählt nicht als Ebene
      for (i++; i < ausdruck.length && ausdruck[i] !== '"'; i++) if (ausdruck[i] === "\\") i++;
    } else if (z === "(" || z === "[" || z === "{") tiefe++;
    else if (z === ")" || z === "]" || z === "}") tiefe = Math.max(0, tiefe - 1);
    else if (z === "|" && tiefe === 0 && ausdruck[i + 1] !== "=" && ausdruck[i - 1] !== "/" && ausdruck[i - 1] !== "|") stellen.push(i);
  }
  return stellen;
}

/** Vordere Teile, längster zuerst ("a | b | c", "a | b", "a"); leere fallen weg. */
export function vordereTeile(ausdruck: string): string[] {
  const teile = [ausdruck, ...roehren(ausdruck).reverse().map((i) => ausdruck.slice(0, i))].map((t) => t.trim());
  return teile.filter((t, i) => t !== "" && teile.indexOf(t) === i);
}

/** jq-Ausdruck, der die Pfade eines Teils als Liste von Zeigern liefert */
export const pfadAusdruck = (teil: string): string => `[path(${teil})]`;

/** Pfad aus jq (Liste von Schlüsseln und Stellen) als JSON Pointer */
export const zeigerAusPfad = (pfad: readonly Teil[]): string => zeigerAus(pfad);
