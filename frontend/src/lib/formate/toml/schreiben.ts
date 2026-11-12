// Schreiben in TOML ohne das Dokument neu zu erzeugen (Regel A3): ein Wert ersetzt genau seine Spanne, Einträge und
// Felder verschwinden mit ihren Zeilen (Abschnitte einer Tabellenliste, Zuweisungen in Tabellen) oder samt Komma (in
// Klammern). TOML kennt kein null; ein solcher Wert wird abgewiesen.

import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";
import { Formatfehler, type NeuerWert, type TextAenderung } from "../vertrag";
import { hinterZeile, mitTrennern, zeilenanfang, zeilenweise } from "../entfernen";
import { mitgliedAnfang } from "../spalten";

const GUELTIGE_ZAHL = /^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function kinder(index: Strukturindex, k: number): number[] {
  const c: number[] = [];
  for (let x = index.erstesKind[k]; x !== KEIN; x = index.naechstes[x]) c.push(x);
  return c;
}

/** Wert als TOML-Text; Texte in doppelten Anführungszeichen (die Escapes von JSON gelten in TOML genauso) */
export function tomlWert(neu: NeuerWert): string {
  switch (neu.art) {
    case "text":
      return JSON.stringify(neu.wert).replace(/[\u007f]/g, "\\u007f");
    case "zahl":
      if (!GUELTIGE_ZAHL.test(neu.roh.trim())) throw new Formatfehler(`${neu.roh} ist keine Zahl, die TOML kennt`);
      return neu.roh.trim();
    case "wahrheitswert":
      return neu.wert ? "true" : "false";
    case "nichts":
      throw new Formatfehler("TOML kennt kein null; das Feld lässt sich nur entfernen oder mit einem Wert füllen");
  }
}

export function wertSchreibenToml(index: Strukturindex, k: number, neu: NeuerWert): TextAenderung {
  if (index.art[k] === KnotenArt.objekt || index.art[k] === KnotenArt.liste) throw new Formatfehler("Nur einzelne Werte lassen sich so ändern");
  return { von: index.von[k], bis: index.bis[k], einfuegen: tomlWert(neu) };
}

/** Eine Tabellenliste ([[a]]) erkennt man daran, dass ihr Schlüssel in der Kopfzeile hinter ihrem Anfang steht */
const istTabellenliste = (index: Strukturindex, k: number): boolean => index.schluesselVon[k] !== KEIN && index.schluesselVon[k] > index.von[k];

/** Steht ein Objekt als Abschnitt (Kopfzeile oder Element einer Tabellenliste), nicht in geschweiften Klammern? */
const istAbschnitt = (text: string, index: Strukturindex, k: number): boolean => text[index.von[k]] !== "{";

export function eintraegeEntfernenToml(text: string, index: Strukturindex, liste: number, stellen: readonly number[]): TextAenderung[] {
  return istTabellenliste(index, liste) ? zeilenweise(text, index, liste, stellen) : mitTrennern(index, liste, stellen);
}

export function spalteEntfernenToml(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  return kinder(index, liste)
    .filter((o) => index.art[o] === KnotenArt.objekt)
    .flatMap((o): TextAenderung[] => {
      const k = kinder(index, o);
      const i = k.findIndex((c) => schluessel(index, text, c) === spalte);
      if (i < 0) return [];
      if (!istAbschnitt(text, index, o)) return mitTrennern(index, o, [i], (c) => mitgliedAnfang(text, index, c));
      const c = k[i];
      // Zuweisung oder Untertabelle: von ihrem Zeilenanfang bis hinter ihre letzte Zeile
      const anfang = index.schluesselVon[c] > index.von[c] ? index.von[c] : mitgliedAnfang(text, index, c);
      return [{ von: zeilenanfang(text, anfang), bis: hinterZeile(text, index.bis[c]), einfuegen: "" }];
    });
}
