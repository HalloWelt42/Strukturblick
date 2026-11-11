// Gemeinsames Schreiben eines einfachen Werts für JSON und NDJSON: eine Textänderung genau über der Spanne des Werts.

import { istBehaelter, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { Formatfehler, type NeuerWert, type TextAenderung } from "../vertrag";

const JSON_ZAHL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;

export const istJsonZahl = (roh: string): boolean => JSON_ZAHL.test(roh);

/** JSON-Text eines einfachen Werts. Texte werden mit den nötigen Escapes zitiert, Zahlen bleiben Rohtext. */
export function jsonWertText(neu: NeuerWert): string {
  switch (neu.art) {
    case "text":
      // stringify maskiert ", \ und Steuerzeichen, einzelne Surrogate als \uXXXX; einen Zeilenumbruch gibt es danach nicht
      return JSON.stringify(neu.wert);
    case "zahl":
      if (!istJsonZahl(neu.roh)) throw new Formatfehler(`"${neu.roh}" ist keine gültige JSON-Zahl`);
      return neu.roh;
    case "wahrheitswert":
      return neu.wert ? "true" : "false";
    case "nichts":
      return "null";
  }
}

/** Ersetzt den einfachen Wert des Knotens `k`; Objekte und Listen werden hier nicht ersetzt. */
export function jsonWertSchreiben(index: Strukturindex, k: number, neu: NeuerWert): TextAenderung {
  if (!Number.isInteger(k) || k < 0 || k >= index.anzahl) throw new Formatfehler("Diesen Knoten gibt es nicht");
  const art = index.art[k];
  if (istBehaelter(art)) throw new Formatfehler(art === KnotenArt.objekt ? "Ein Objekt wird hier nicht ersetzt" : "Eine Liste wird hier nicht ersetzt");
  return { von: index.von[k], bis: index.bis[k], einfuegen: jsonWertText(neu) };
}
