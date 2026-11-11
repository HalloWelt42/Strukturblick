// Beschreibung einzelner Baumzeilen für die Anzeige: Wert in Kurzform, Info zu Behältern ("3 Schlüssel",
// "128 Einträge, gleich aufgebaut"), Vorschau zugeklappter Behälter und Hinweise. Wird nur für das sichtbare Fenster
// gerechnet. Rein, ohne Browser.

import { KEIN, KnotenArt, inhalt, istBehaelter, kinderVon, schluessel, type Strukturindex } from "../kern/strukturindex";
import { hinweiseFuer, type Hinweis } from "./hinweise";
import { inListe, type Sichtbar } from "./baumzeilen";

const VORSCHAU_TEILE = 4;
const VORSCHAU_ZEICHEN = 70;
const WERT_KURZ = 30;
/** Längere Werte schneidet die Zeile ab; ganz zeigt sie der Inspektor */
const WERT_ZEILE = 400;

export interface Baumzeile {
  readonly k: number;
  readonly tiefe: number;
  readonly art: KnotenArt;
  readonly wurzel: boolean;
  /** Schlüssel im Objekt, sonst null */
  readonly schluessel: string | null;
  /** Stelle in einer Liste, sonst null */
  readonly stelle: number | null;
  /** Einfacher Wert zur Anzeige ("Leipzig" mit Anführungszeichen, 42, true, null), bei Behältern null */
  readonly wert: string | null;
  /** Behälter: Umfang oder, zugeklappt, Vorschau der ersten Werte */
  readonly info: string | null;
  readonly klappbar: boolean;
  readonly offen: boolean;
  readonly hinweise: readonly Hinweis[];
  /** Liste gleich aufgebauter Objekte, lässt sich als Tabelle zeigen */
  readonly tabellarisch: boolean;
}

const kurz = (s: string, n = WERT_KURZ): string => (s.length > n ? s.slice(0, n - 1) + "..." : s);

/** Einfacher Wert so, wie er im Baum steht: Texte in Anführungszeichen, sonst der Rohtext. */
export function wertAnzeige(index: Strukturindex, text: string, k: number, hoechstens = Number.POSITIVE_INFINITY): string {
  const roh = kurz(inhalt(index, text, k), hoechstens);
  if (index.art[k] === KnotenArt.text) return `"${roh}"`;
  if (index.art[k] === KnotenArt.nichts && roh.trim() === "") return "null";
  return roh;
}

export const anzahlText = (n: number, einzahl: string, mehrzahl: string): string => `${n} ${n === 1 ? einzahl : mehrzahl}`;

/** Umfang eines Behälters: "3 Schlüssel", "128 Einträge, gleich aufgebaut", "leer". */
export function umfang(index: Strukturindex, text: string, k: number): string {
  const n = index.kinder[k];
  const verweis = index.verweise.get(k);
  if (verweis) return verweis;
  if (n === 0) return "leer";
  if (index.art[k] === KnotenArt.objekt) return anzahlText(n, "Schlüssel", "Schlüssel");
  const eintraege = anzahlText(n, "Eintrag", "Einträge");
  return n > 1 && gleichAufgebaut(index, text, k) ? `${eintraege}, gleich aufgebaut` : eintraege;
}

const GLEICH = new WeakMap<Strukturindex, Map<number, boolean>>();

/** Ist der Knoten eine Liste von Objekten mit denselben Schlüsseln? Je Index und Knoten einmal gerechnet. */
export function gleichAufgebaut(index: Strukturindex, text: string, k: number): boolean {
  if (index.art[k] !== KnotenArt.liste || index.kinder[k] === 0) return false;
  let gemerkt = GLEICH.get(index);
  if (!gemerkt) GLEICH.set(index, (gemerkt = new Map()));
  const alt = gemerkt.get(k);
  if (alt !== undefined) return alt;
  const ergebnis = schluesselGleich(index, text, k);
  gemerkt.set(k, ergebnis);
  return ergebnis;
}

function schluesselGleich(index: Strukturindex, text: string, liste: number): boolean {
  const erstes = index.erstesKind[liste];
  if (index.art[erstes] !== KnotenArt.objekt) return false;
  const namen = new Set<string>();
  for (const c of kinderVon(index, erstes)) namen.add(schluessel(index, text, c) ?? "");
  if (namen.size !== index.kinder[erstes]) return false; // doppelte Schlüssel
  for (let e = index.naechstes[erstes]; e !== KEIN; e = index.naechstes[e]) {
    if (index.art[e] !== KnotenArt.objekt || index.kinder[e] !== namen.size) return false;
    for (let c = index.erstesKind[e]; c !== KEIN; c = index.naechstes[c]) if (!namen.has(schluessel(index, text, c) ?? "")) return false;
  }
  return true;
}

/** Kurzform eines Kindes für die Vorschau: Wert, erster Wert eines Objekts oder Umfang in Klammern. */
function kurzform(index: Strukturindex, text: string, c: number): string {
  if (!istBehaelter(index.art[c])) return kurz(wertAnzeige(index, text, c));
  if (index.art[c] === KnotenArt.liste) return `[${index.kinder[c]}]`;
  for (let e = index.erstesKind[c]; e !== KEIN; e = index.naechstes[e]) if (!istBehaelter(index.art[e])) return kurz(wertAnzeige(index, text, e));
  return `{${index.kinder[c]}}`;
}

/** Vorschau der ersten Werte eines Behälters: nr "B-24017", kunde "Jonas Brandt", positionen [2] */
export function vorschau(index: Strukturindex, text: string, k: number): string {
  const teile: string[] = [];
  let laenge = 0;
  for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) {
    if (teile.length === VORSCHAU_TEILE || laenge > VORSCHAU_ZEICHEN) {
      teile.push("...");
      break;
    }
    const s = schluessel(index, text, c);
    const teil = s === null ? kurzform(index, text, c) : `${kurz(s, 20)} ${kurzform(index, text, c)}`;
    teile.push(teil);
    laenge += teil.length + 2;
  }
  return teile.join(", ");
}

/** Info eines Behälters: offen der Umfang, zugeklappt die Vorschau (bei Listen mit Anzahl davor). */
export function behaelterInfo(index: Strukturindex, text: string, k: number, offen: boolean): string {
  if (offen || index.kinder[k] === 0) return umfang(index, text, k);
  if (index.art[k] === KnotenArt.objekt) return vorschau(index, text, k);
  return `${anzahlText(index.kinder[k], "Eintrag", "Einträge")}: ${vorschau(index, text, k)}`;
}

/** Zeile `i` der sichtbaren Folge als Objekt für die Anzeige. */
export function zeileBeschreiben(index: Strukturindex, text: string, s: Sichtbar, i: number): Baumzeile {
  const k = s.knoten[i];
  const art = index.art[k] as KnotenArt;
  const behaelter = istBehaelter(art);
  const offen = s.offen[i] === 1;
  return {
    k,
    tiefe: s.tiefe[i],
    art,
    wurzel: index.eltern[k] === KEIN,
    schluessel: schluessel(index, text, k),
    stelle: inListe(index, k) ? s.stelle[i] : null,
    wert: behaelter ? null : wertAnzeige(index, text, k, WERT_ZEILE),
    info: behaelter ? behaelterInfo(index, text, k, offen) : null,
    klappbar: behaelter && index.kinder[k] > 0,
    offen,
    hinweise: behaelter ? [] : hinweiseFuer(art, inhalt(index, text, k)),
    tabellarisch: gleichAufgebaut(index, text, k),
  };
}
