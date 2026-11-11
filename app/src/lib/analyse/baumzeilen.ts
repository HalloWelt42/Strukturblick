// Sichtbare Zeilen des Baums: aus dem Strukturindex und dem Aufgeklappten entsteht die Folge der sichtbaren Knoten in
// typisierten Feldern (Knoten, Tiefe, Stelle unter den Geschwistern, offen). Für die Anzeige wird nur das gerade
// sichtbare Fenster zu Objekten (siehe baumbeschreibung.ts). Rein, ohne Browser.

import { KEIN, KnotenArt, istBehaelter, type Strukturindex } from "../kern/strukturindex";
import { ENTHAELT_TREFFER, TREFFER, type Suchergebnis } from "./baumsuche";

/** Ebene "Alle": jeder Behälter ist offen */
export const ALLE_EBENEN = Number.POSITIVE_INFINITY;

export interface Aufklappen {
  /** Behälter mit einer Tiefe kleiner als `ebene` sind offen (1: nur die Wurzel) */
  readonly ebene: number;
  /** Behälter, die gegen die Ebene umgeschaltet sind (offen statt zu oder umgekehrt) */
  readonly umgeschaltet: ReadonlySet<number>;
  /** Nur Treffer zeigen: Treffer und ihre Vorfahren, Vorfahren offen; unter einem Treffer gilt wieder das Übliche */
  readonly nurTreffer?: Suchergebnis | null;
}

export interface Sichtbar {
  readonly anzahl: number;
  readonly knoten: Int32Array;
  readonly tiefe: Int32Array;
  /** Stelle unter den Geschwistern (für [3] bei Listeneinträgen) */
  readonly stelle: Int32Array;
  /** 1: Behälter mit Kindern und offen */
  readonly offen: Uint8Array;
}

/** Ist ein Behälter nach Ebene und Umschaltungen offen (ohne die Treffer-Ansicht)? */
export const offenNachRegel = (a: Aufklappen, k: number, tiefe: number): boolean => tiefe < a.ebene !== a.umgeschaltet.has(k);

/** Folge der sichtbaren Knoten in Textreihenfolge. Läuft ohne Rekursion, auch bei sehr tiefer Schachtelung. */
export function sichtbareZeilen(index: Strukturindex, a: Aufklappen): Sichtbar {
  const n = index.anzahl;
  const knoten = new Int32Array(n);
  const tiefe = new Int32Array(n);
  const stelle = new Int32Array(n);
  const offen = new Uint8Array(n);
  if (n === 0) return { anzahl: 0, knoten, tiefe, stelle, offen };
  const merkmale = a.nurTreffer?.merkmale ?? null;
  // Stapel je Tiefe: nächster Knoten, seine Stelle, und ob wir unter einem Treffer sind
  const naechster: number[] = [0];
  const zaehler: number[] = [0];
  const unterTreffer: boolean[] = [false];
  let m = 0;
  while (naechster.length > 0) {
    const d = naechster.length - 1;
    const k = naechster[d];
    if (k === KEIN) {
      naechster.pop();
      zaehler.pop();
      unterTreffer.pop();
      continue;
    }
    naechster[d] = index.naechstes[k];
    const s = zaehler[d]++;
    const frei = merkmale === null || unterTreffer[d];
    if (!frei && merkmale![k] === 0) continue;
    knoten[m] = k;
    tiefe[m] = d;
    stelle[m] = s;
    m++;
    if (!istBehaelter(index.art[k]) || index.erstesKind[k] === KEIN) continue;
    const auf = !frei && (merkmale![k] & ENTHAELT_TREFFER) !== 0 ? true : offenNachRegel(a, k, d);
    if (!auf) continue;
    offen[m - 1] = 1;
    naechster.push(index.erstesKind[k]);
    zaehler.push(0);
    unterTreffer.push(frei || (merkmale![k] & TREFFER) !== 0);
  }
  return { anzahl: m, knoten: knoten.subarray(0, m), tiefe: tiefe.subarray(0, m), stelle: stelle.subarray(0, m), offen: offen.subarray(0, m) };
}

/** Zeile eines Knotens in der sichtbaren Folge, -1 wenn er nicht sichtbar ist. */
export function zeileVon(s: Sichtbar, k: number): number {
  return s.knoten.indexOf(k);
}

/** Vorfahren eines Knotens, die nach der Regel zu sind und zum Zeigen aufgeklappt werden müssen. */
export function zuAufklappen(index: Strukturindex, a: Aufklappen, k: number): number[] {
  const kette: number[] = [];
  for (let e = index.eltern[k]; e !== KEIN; e = index.eltern[e]) kette.push(e);
  // kette[i] hat die Tiefe kette.length - 1 - i
  return kette.filter((e, i) => !offenNachRegel(a, e, kette.length - 1 - i));
}

/** Liegt der Knoten in einer Liste (Anzeige als [stelle] statt Schlüssel)? */
export const inListe = (index: Strukturindex, k: number): boolean => index.eltern[k] !== KEIN && index.art[index.eltern[k]] === KnotenArt.liste;
