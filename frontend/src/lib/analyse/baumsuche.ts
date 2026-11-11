// Suche im Baum: Schlüssel und Werte aller Knoten, ohne Rücksicht auf Groß- und Kleinschreibung. Das Ergebnis sind
// Merkmale je Knoten in einem typisierten Feld (Treffer, enthält Treffer) und die Treffer in Textreihenfolge; es
// entstehen keine Objekte je Knoten. Rein, ohne Browser.

import { KEIN, inhalt, istBehaelter, schluessel, type Strukturindex } from "../kern/strukturindex";

/** Merkmal: der Knoten selbst passt */
export const TREFFER = 1;
/** Merkmal: unter dem Knoten liegt ein Treffer */
export const ENTHAELT_TREFFER = 2;

export interface Suchergebnis {
  readonly suche: string;
  readonly anzahl: number;
  /** Merkmale je Knoten (TREFFER, ENTHAELT_TREFFER) */
  readonly merkmale: Uint8Array;
  /** Treffer in Textreihenfolge (aufsteigende Knotennummern) */
  readonly knoten: Int32Array;
}

const klein = (s: string): string => s.toLowerCase();

/** Alle Knoten, deren Schlüssel oder einfacher Wert die Suche enthält; null bei leerer Suche. */
export function suchen(index: Strukturindex, text: string, suche: string): Suchergebnis | null {
  const gesucht = klein(suche.trim());
  if (gesucht === "") return null;
  const merkmale = new Uint8Array(index.anzahl);
  const gefunden: number[] = [];
  for (let k = 0; k < index.anzahl; k++) {
    const s = schluessel(index, text, k);
    const passt = (s !== null && klein(s).includes(gesucht)) || (!istBehaelter(index.art[k]) && klein(inhalt(index, text, k)).includes(gesucht));
    if (!passt) continue;
    merkmale[k] |= TREFFER;
    gefunden.push(k);
    // Vorfahren markieren; wer schon markiert ist, dessen Vorfahren sind es auch
    for (let e = index.eltern[k]; e !== KEIN && (merkmale[e] & ENTHAELT_TREFFER) === 0; e = index.eltern[e]) merkmale[e] |= ENTHAELT_TREFFER;
  }
  return { suche, anzahl: gefunden.length, merkmale, knoten: Int32Array.from(gefunden) };
}

/** Suchergebnis aus fertigen Treffern (etwa einer Abfrage); `suche` leer, weil kein Text im Knoten markiert wird. */
export function trefferAus(index: Strukturindex, knoten: readonly number[]): Suchergebnis {
  const merkmale = new Uint8Array(index.anzahl);
  const gueltig = [...new Set(knoten.filter((k) => k >= 0 && k < index.anzahl))].sort((a, b) => a - b);
  for (const k of gueltig) {
    merkmale[k] |= TREFFER;
    for (let e = index.eltern[k]; e !== KEIN && (merkmale[e] & ENTHAELT_TREFFER) === 0; e = index.eltern[e]) merkmale[e] |= ENTHAELT_TREFFER;
  }
  return { suche: "", anzahl: gueltig.length, merkmale, knoten: Int32Array.from(gueltig) };
}

/** Nächster Treffer nach dem Knoten `nach` (KEIN: der erste), rückwärts der vorige; ringsum. KEIN ohne Treffer. */
export function naechsterTreffer(e: Suchergebnis, nach: number, rueckwaerts = false): number {
  const t = e.knoten;
  if (t.length === 0) return KEIN;
  // erste Stelle mit t[i] > nach (binäre Suche)
  let unten = 0;
  let oben = t.length;
  while (unten < oben) {
    const mitte = (unten + oben) >> 1;
    if (t[mitte] > nach) oben = mitte;
    else unten = mitte + 1;
  }
  if (!rueckwaerts) return t[unten % t.length];
  const davor = unten - 1 - (unten > 0 && t[unten - 1] === nach ? 1 : 0);
  return t[(davor + t.length) % t.length];
}

export interface Abschnitt {
  readonly text: string;
  readonly treffer: boolean;
}

/** Text in Abschnitte teilen, damit Fundstellen markiert werden können. */
export function markieren(s: string, suche: string): readonly Abschnitt[] {
  const gesucht = klein(suche.trim());
  const kleinS = klein(s);
  if (gesucht === "" || kleinS.length !== s.length) return [{ text: s, treffer: false }];
  const teile: Abschnitt[] = [];
  let pos = 0;
  for (let i = kleinS.indexOf(gesucht); i !== -1; i = kleinS.indexOf(gesucht, pos)) {
    if (i > pos) teile.push({ text: s.slice(pos, i), treffer: false });
    teile.push({ text: s.slice(i, i + gesucht.length), treffer: true });
    pos = i + gesucht.length;
  }
  if (pos < s.length) teile.push({ text: s.slice(pos), treffer: false });
  return teile;
}
