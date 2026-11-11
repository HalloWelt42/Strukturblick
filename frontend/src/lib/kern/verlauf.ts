// Verlauf eines Dokuments: jeder Eintrag ist ein Befehlsaufruf (zugleich Rezeptschritt) mit den Textänderungen und
// ihren Umkehrungen. Gespeichert werden nur Änderungen, keine ganzen Textstände; so bleibt der Verlauf auch bei großen
// Dateien klein. Eine Geste (Tippen in einem Zug) bildet einen Eintrag aus mehreren Schritten.

import type { TextAenderung } from "./format";

export interface Aufruf {
  readonly befehl: string;
  readonly titel: string;                  // sprechend, für Verlauf und Meldung ("ort: Lpz. -> Leipzig")
  readonly werte: unknown;                 // geprüfte Werte; damit lässt sich der Aufruf wiederholen
  readonly zeit: string;                   // ISO-Zeit des ersten Schritts
  readonly ort: string;                    // wo er entstand: "Editor", "Baum", "Tabelle", "Telefon" ...
  readonly geste?: string;
  /** Fachlicher Schritt für Rezepte (Werkzeug Bereinigen); der Kern liest ihn nicht, er reist nur mit */
  readonly rezeptschritt?: unknown;
}

export interface Schritt {
  readonly aenderungen: readonly TextAenderung[];  // bezogen auf den Text davor
  readonly umkehrung: readonly TextAenderung[];    // bezogen auf den Text danach
}

export interface Eintrag {
  readonly aufruf: Aufruf;
  readonly schritte: readonly Schritt[];
}

export interface Verlauf {
  readonly eintraege: readonly Eintrag[];
  /** Zahl der angewendeten Einträge; eintraege[zeiger] und folgende sind zurückgenommen und warten auf Wiederholen. */
  readonly zeiger: number;
}

export interface Grenzen {
  readonly eintraege: number;
}

export const VORGABE_GRENZEN: Grenzen = { eintraege: 500 };

export const LEERER_VERLAUF: Verlauf = { eintraege: [], zeiger: 0 };

/** Neuen Schritt anfügen; dieselbe Geste wie der letzte angewendete Eintrag wird fortgesetzt. Zurückgenommene
 *  Einträge fallen weg, sobald Neues geschieht. */
export function hinzu(v: Verlauf, aufruf: Aufruf, schritt: Schritt, grenzen: Grenzen = VORGABE_GRENZEN): Verlauf {
  const behalten = v.eintraege.slice(0, v.zeiger);
  const letzter = behalten.at(-1);
  if (aufruf.geste !== undefined && letzter?.aufruf.geste === aufruf.geste && letzter.aufruf.befehl === aufruf.befehl) {
    const fortgesetzt: Eintrag = { aufruf: { ...letzter.aufruf, werte: aufruf.werte }, schritte: [...letzter.schritte, schritt] };
    return { eintraege: [...behalten.slice(0, -1), fortgesetzt], zeiger: behalten.length };
  }
  let eintraege = [...behalten, { aufruf, schritte: [schritt] }];
  if (eintraege.length > grenzen.eintraege) eintraege = eintraege.slice(eintraege.length - grenzen.eintraege);
  return { eintraege, zeiger: eintraege.length };
}

export const kannZurueck = (v: Verlauf): boolean => v.zeiger > 0;
export const kannVor = (v: Verlauf): boolean => v.zeiger < v.eintraege.length;
