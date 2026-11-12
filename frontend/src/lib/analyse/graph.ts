// Ausschnitt für die Ansicht Graph: ab einem Fokusknoten die Werte als Karten, so viele Ebenen tief wie gewählt.
// Darüber steht der Elternknoten als Rückweg. Jede Karte trägt Schlüssel oder Stelle, Art, den Wert (einfache Werte),
// eine Beschriftung (bei Objekten der erste Text darin) und den Umfang. Kinder jenseits der Tiefe zählt die Karte nur
// (das Plus), sehr viele Kinder werden gekürzt und als Zahl genannt. Rein, ohne Browser.

import { KEIN, KnotenArt, istBehaelter, kinderVon, schluessel, stelle, type Strukturindex } from "../kern/strukturindex";
import { umfang, wertAnzeige } from "./baumbeschreibung";

/** So viele Kinder zeigt der Fokus, darunter jede tiefere Ebene je Knoten */
export const GRENZE_FOKUS = 50;
export const GRENZE_TIEFER = 12;
const WERT_ZEICHEN = 40;

export interface Wertkarte {
  readonly k: number;
  /** "$" für die Wurzel, sonst Schlüssel oder "[Stelle]" */
  readonly beschriftung: string;
  readonly art: KnotenArt;
  /** Einfacher Wert zur Anzeige, bei Behältern null */
  readonly wert: string | null;
  /** Bei Objekten der erste Text darin (etwa die Nummer), sonst null */
  readonly titel: string | null;
  /** Umfang eines Behälters ("6 Schlüssel", "128 Einträge") */
  readonly info: string | null;
  readonly kinder: readonly Wertkarte[];
  /** Kinder, die jenseits der Tiefe liegen (die Karte zeigt ein Plus) */
  readonly verborgen: number;
  /** Kinder über der Grenze je Knoten */
  readonly weitere: number;
}

export interface Ausschnitt {
  readonly fokus: Wertkarte;
  /** Elternknoten des Fokus als Rückweg, ohne Kinder; null an der Wurzel */
  readonly eltern: Wertkarte | null;
  /** Geschwister vor und nach dem Fokus (KEIN, wenn es keins gibt) */
  readonly vorher: number;
  readonly nachher: number;
  readonly sichtbar: number;
  readonly gesamt: number;
}

export function beschriftung(index: Strukturindex, text: string, k: number): string {
  if (index.eltern[k] === KEIN) return "$";
  return schluessel(index, text, k) ?? `[${stelle(index, k)}]`;
}

/** Erster Text in einem Objekt, als Wiedererkennung auf der Karte */
function titel(index: Strukturindex, text: string, k: number): string | null {
  if (index.art[k] !== KnotenArt.objekt) return null;
  for (const c of kinderVon(index, k)) if (index.art[c] === KnotenArt.text) return wertAnzeige(index, text, c, WERT_ZEICHEN);
  return null;
}

export function graphAusschnitt(index: Strukturindex, text: string, fokus: number, tiefe: number): Ausschnitt {
  let sichtbar = 0;
  const karte = (k: number, ebene: number, mitKindern = true): Wertkarte => {
    sichtbar++;
    const behaelter = istBehaelter(index.art[k]);
    const kinder: Wertkarte[] = [];
    let weitere = 0;
    const offen = behaelter && mitKindern && ebene < tiefe;
    if (offen) {
      const grenze = ebene === 0 ? GRENZE_FOKUS : GRENZE_TIEFER;
      for (const c of kinderVon(index, k)) {
        if (kinder.length < grenze) kinder.push(karte(c, ebene + 1));
        else weitere++;
      }
    }
    return {
      k,
      beschriftung: beschriftung(index, text, k),
      art: index.art[k] as KnotenArt,
      wert: behaelter ? null : wertAnzeige(index, text, k, WERT_ZEICHEN),
      titel: behaelter ? titel(index, text, k) : null,
      info: behaelter ? umfang(index, text, k) : null,
      kinder,
      verborgen: behaelter && !offen ? index.kinder[k] : 0,
      weitere,
    };
  };
  const e = index.eltern[fokus];
  const eltern = e === KEIN ? null : karte(e, 0, false);
  let vorher = KEIN;
  if (e !== KEIN) for (let c = index.erstesKind[e]; c !== KEIN && c !== fokus; c = index.naechstes[c]) vorher = c;
  return { fokus: karte(fokus, 0), eltern, vorher, nachher: index.naechstes[fokus], sichtbar, gesamt: index.anzahl };
}
