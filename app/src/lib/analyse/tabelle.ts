// Tabellenmodell über dem Strukturindex: welche Liste als Tabelle erscheint, ihre Spalten und Zeilen, Zellen über
// Nachschlagen sowie Filter und Sortierung als reine Sicht. Nichts hier legt Werte als Objekte an: Zeilen sind
// Knotennummern, Zellen findet ein Blick auf die Kinder einer Zeile, Inhalte liest erst die Anzeige aus dem Text.

import { inhalt, istBehaelter, KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { teileAus, teileVon, zeigerAus, type Teil } from "../kern/pfade";

export interface Spalte {
  readonly name: string;
  /** true: die Spalte zeigt den Eintrag selbst (Listen aus einfachen Werten oder gemischte Einträge) */
  readonly selbst: boolean;
}

export interface Tabelle {
  /** Knoten der Liste */
  readonly liste: number;
  /** Pfad der Liste als Teile (für Zeiger auf Zeilen und Zellen) */
  readonly listeTeile: readonly Teil[];
  /** Knoten je Zeile in Textreihenfolge; die Stelle ist zugleich der Listenindex im Zeiger */
  readonly zeilen: Int32Array;
  /** Zeile im Text (ab 1), in der die Zeile beginnt */
  readonly zeileImText: Int32Array;
  /** Vereinigung der Schlüssel in Reihenfolge des ersten Auftretens */
  readonly spalten: readonly Spalte[];
  /** Spalte nach Schlüssel (ohne die Spalte für Einträge selbst) */
  readonly spalteNach: ReadonlyMap<string, number>;
  /** Spalte für Einträge, die keine Objekte sind; -1 wenn es keine gibt */
  readonly wertSpalte: number;
  /** Je Knoten des Index: Spalte, wenn der Knoten eine Zelle dieser Tabelle ist, sonst -1 */
  readonly spalteVon: Int32Array;
}

/** Name der Spalte, die den Eintrag selbst zeigt */
export const WERT_SPALTE_NAME = "(Wert)";

// ----- Welche Liste -------------------------------------------------------------------------------------------------

/** Wie viele Einträge einer Liste geprüft werden, ob sie gleich aufgebaute Objekte sind */
const PROBE_EINTRAEGE = 20;

/**
 * Liste, die als Tabelle erscheint:
 * 1. die bisher gezeigte, solange die Wahl sie selbst, eine ihrer Zeilen oder eine ihrer Zellen ist (ein Klick in die
 *    Tabelle springt so nie in eine verschachtelte Liste);
 * 2. die gewählte Liste oder die nächste Liste, in der die Wahl liegt;
 * 3. die Wurzel, wenn sie eine Liste ist;
 * 4. die erste Liste gleich aufgebauter Objekte unter der Wurzel (Breitensuche).
 * KEIN, wenn es keine gibt.
 */
export function listeFinden(index: Strukturindex, gewaehlt: number, bisher: number): number {
  if (index.anzahl === 0) return KEIN;
  if (bisher !== KEIN && bisher < index.anzahl && index.art[bisher] === KnotenArt.liste && gewaehlt !== KEIN) {
    const e = index.eltern[gewaehlt];
    if (gewaehlt === bisher || e === bisher || (e !== KEIN && index.eltern[e] === bisher)) return bisher;
  }
  for (let k = gewaehlt; k !== KEIN; k = index.eltern[k]) if (index.art[k] === KnotenArt.liste) return k;
  if (index.art[0] === KnotenArt.liste) return 0;
  return ersteGleichartigeListe(index);
}

function gleichAufgebaut(index: Strukturindex, liste: number): boolean {
  if (index.kinder[liste] === 0) return false;
  let geprueft = 0;
  for (let c = index.erstesKind[liste]; c !== KEIN && geprueft < PROBE_EINTRAEGE; c = index.naechstes[c], geprueft++) {
    if (index.art[c] !== KnotenArt.objekt || index.kinder[c] === 0) return false;
  }
  return true;
}

function ersteGleichartigeListe(index: Strukturindex): number {
  const schlange = new Int32Array(index.anzahl);
  let lesen = 0;
  let schreiben = 0;
  schlange[schreiben++] = 0;
  while (lesen < schreiben) {
    const k = schlange[lesen++];
    if (index.art[k] === KnotenArt.liste && gleichAufgebaut(index, k)) return k;
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) if (istBehaelter(index.art[c])) schlange[schreiben++] = c;
  }
  return KEIN;
}

// ----- Modell -------------------------------------------------------------------------------------------------------

export function tabelleBauen(index: Strukturindex, text: string, liste: number): Tabelle {
  const n = index.kinder[liste];
  const zeilen = new Int32Array(n);
  const spalteVon = new Int32Array(index.anzahl).fill(-1);
  const spalten: Spalte[] = [];
  const spalteNach = new Map<string, number>();
  let wertSpalte = -1;
  let i = 0;
  for (let r = index.erstesKind[liste]; r !== KEIN; r = index.naechstes[r]) {
    zeilen[i++] = r;
    if (index.art[r] !== KnotenArt.objekt) {
      if (wertSpalte < 0) {
        wertSpalte = spalten.length;
        spalten.push({ name: WERT_SPALTE_NAME, selbst: true });
      }
      continue;
    }
    for (let c = index.erstesKind[r]; c !== KEIN; c = index.naechstes[c]) {
      const s = schluessel(index, text, c) ?? "";
      let j = spalteNach.get(s);
      if (j === undefined) {
        j = spalten.length;
        spalten.push({ name: s, selbst: false });
        spalteNach.set(s, j);
      }
      spalteVon[c] = j;
    }
  }
  return { liste, listeTeile: teileVon(index, text, liste), zeilen, zeileImText: zeilenImText(index, text, zeilen), spalten, spalteNach, wertSpalte, spalteVon };
}

/** Zeile im Text je Tabellenzeile in einem Durchgang (Zeilen stehen in Textreihenfolge). */
function zeilenImText(index: Strukturindex, text: string, zeilen: Int32Array): Int32Array {
  const nr = new Int32Array(zeilen.length);
  let zeile = 1;
  let p = 0;
  for (let i = 0; i < zeilen.length; i++) {
    const ziel = index.von[zeilen[i]];
    if (ziel < p) {
      zeile = 1;
      p = 0;
    }
    for (; p < ziel; p++) if (text.charCodeAt(p) === 10) zeile++;
    nr[i] = zeile;
  }
  return nr;
}

// ----- Zellen -------------------------------------------------------------------------------------------------------

/** Zelle in Zeile `zeile` (Stelle) und Spalte `spalte`; KEIN, wenn die Zeile den Schlüssel nicht hat. */
export function zelle(t: Tabelle, index: Strukturindex, zeile: number, spalte: number): number {
  const r = t.zeilen[zeile];
  if (spalte === t.wertSpalte) return index.art[r] === KnotenArt.objekt ? KEIN : r;
  for (let c = index.erstesKind[r]; c !== KEIN; c = index.naechstes[c]) if (t.spalteVon[c] === spalte) return c;
  return KEIN;
}

/** Alle Zellen einer Zeile in einem Durchgang (für die Anzeige der sichtbaren Zeilen). */
export function zellenDerZeile(t: Tabelle, index: Strukturindex, zeile: number): Int32Array {
  const aus = new Int32Array(t.spalten.length).fill(KEIN);
  const r = t.zeilen[zeile];
  if (index.art[r] !== KnotenArt.objekt) {
    aus[t.wertSpalte] = r;
    return aus;
  }
  for (let c = index.erstesKind[r]; c !== KEIN; c = index.naechstes[c]) {
    const j = t.spalteVon[c];
    if (j >= 0 && aus[j] === KEIN) aus[j] = c; // doppelter Schlüssel: der erste zählt, wie beim Zeiger
  }
  return aus;
}

/** Alle Zellen einer Spalte, je Zeile ein Knoten oder KEIN (für Sortierung und Profil). */
export function zellenDerSpalte(t: Tabelle, index: Strukturindex, spalte: number): Int32Array {
  const aus = new Int32Array(t.zeilen.length);
  for (let i = 0; i < t.zeilen.length; i++) aus[i] = zelle(t, index, i, spalte);
  return aus;
}

export interface Vorschau {
  readonly art: KnotenArt;
  readonly text: string;
}

/** Was eine Zelle zeigt: einfache Werte als Inhalt, verschachtelte als kurze Beschreibung. */
export function vorschau(index: Strukturindex, text: string, k: number): Vorschau {
  const art = index.art[k] as KnotenArt;
  const n = index.kinder[k];
  if (art === KnotenArt.objekt) return { art, text: `Objekt, ${n} Schlüssel` };
  if (art === KnotenArt.liste) return { art, text: `Liste, ${n} ${n === 1 ? "Eintrag" : "Einträge"}` };
  return { art, text: inhalt(index, text, k) };
}

// ----- Zeiger -------------------------------------------------------------------------------------------------------

/** Zeiger auf eine Zelle; die Spalte für Einträge selbst zeigt auf die Zeile. Gilt auch für fehlende Zellen. */
export function zellZeiger(t: Tabelle, zeile: number, spalte: number): string {
  const s = t.spalten[spalte];
  return zeigerAus(s.selbst ? [...t.listeTeile, zeile] : [...t.listeTeile, zeile, s.name]);
}

export interface Ort {
  readonly zeile: number;
  /** -1, wenn die ganze Zeile gewählt ist */
  readonly spalte: number;
}

/** Welche Zeile und Spalte ein Zeiger trifft (auch tiefer in einer Zelle); null, wenn er nicht in der Tabelle liegt. */
export function ortVon(t: Tabelle, zeiger: string | null): Ort | null {
  if (zeiger === null) return null;
  const liste = zeigerAus(t.listeTeile);
  if (!zeiger.startsWith(liste + "/")) return null;
  const teile = teileAus(zeiger.slice(liste.length));
  const zeile = Number(teile[0]);
  if (!Number.isInteger(zeile) || zeile < 0 || zeile >= t.zeilen.length || String(zeile) !== teile[0]) return null;
  if (teile.length === 1) return { zeile, spalte: t.wertSpalte };
  const spalte = t.spalteNach.get(teile[1]);
  return { zeile, spalte: spalte ?? -1 };
}

// ----- Sicht: Filter und Sortierung ---------------------------------------------------------------------------------

export type Richtung = "auf" | "ab";

export interface Sortierung {
  readonly spalte: string;
  readonly selbst: boolean;
  readonly richtung: Richtung;
}

export interface Sichtwahl {
  readonly filter: string;
  readonly sortierung: Sortierung | null;
}

/** Spalte zu einer gemerkten Sortierung (nach Namen, weil Spalten nach einer Änderung neu entstehen). */
export function spalteZu(t: Tabelle, s: { spalte: string; selbst: boolean }): number {
  return s.selbst ? t.wertSpalte : (t.spalteNach.get(s.spalte) ?? -1);
}

/** Stellen der sichtbaren Zeilen in Anzeigereihenfolge. Das Dokument bleibt unverändert. */
export function sichtBerechnen(t: Tabelle, index: Strukturindex, text: string, wahl: Sichtwahl): Int32Array {
  let stellen = gefiltert(t, index, text, wahl.filter.trim().toLocaleLowerCase("de"));
  const s = wahl.sortierung;
  const spalte = s ? spalteZu(t, s) : -1;
  if (s && spalte >= 0) stellen = sortiert(t, index, text, stellen, spalte, s.richtung);
  return stellen;
}

function gefiltert(t: Tabelle, index: Strukturindex, text: string, nadel: string): Int32Array {
  const n = t.zeilen.length;
  if (nadel === "") return Int32Array.from({ length: n }, (_, i) => i);
  const treffer = new Int32Array(n);
  let m = 0;
  const passt = (k: number): boolean => !istBehaelter(index.art[k]) && inhalt(index, text, k).toLocaleLowerCase("de").includes(nadel);
  for (let i = 0; i < n; i++) {
    const r = t.zeilen[i];
    let ja = false;
    if (index.art[r] !== KnotenArt.objekt) ja = passt(r);
    else for (let c = index.erstesKind[r]; c !== KEIN && !ja; c = index.naechstes[c]) ja = passt(c);
    if (ja) treffer[m++] = i;
  }
  return treffer.slice(0, m);
}

const SORTIERER = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

/** Zahlenwert eines Rohtexts (auch deutsche Schreibweise 1.234,50); NaN, wenn es keine Zahl ist. */
export function zahlenwert(roh: string): number {
  const s = roh.trim();
  if (/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(s)) return Number(s);
  if (/^[-+]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(s)) return Number(s.replaceAll(".", "").replace(",", "."));
  return Number.NaN;
}

function sortiert(t: Tabelle, index: Strukturindex, text: string, stellen: Int32Array, spalte: number, richtung: Richtung): Int32Array {
  const n = t.zeilen.length;
  const texte: (string | null)[] = new Array<string | null>(n).fill(null);
  const zahlen = new Float64Array(n).fill(Number.NaN);
  for (const i of stellen) {
    const k = zelle(t, index, i, spalte);
    if (k === KEIN || istBehaelter(index.art[k]) || index.art[k] === KnotenArt.nichts) continue;
    const s = inhalt(index, text, k);
    if (s.trim() === "") continue;
    texte[i] = s;
    zahlen[i] = zahlenwert(s);
  }
  const vorzeichen = richtung === "auf" ? 1 : -1;
  const vergleich = (a: number, b: number): number => {
    const ta = texte[a];
    const tb = texte[b];
    if (ta === null || tb === null) return ta === tb ? a - b : ta === null ? 1 : -1; // Leeres immer ans Ende
    const za = zahlen[a];
    const zb = zahlen[b];
    let v: number;
    if (!Number.isNaN(za) && !Number.isNaN(zb)) v = za - zb;
    else if (!Number.isNaN(za)) v = -1;
    else if (!Number.isNaN(zb)) v = 1;
    else v = SORTIERER.compare(ta, tb);
    return v !== 0 ? v * vorzeichen : a - b;
  };
  return Int32Array.from(stellen).sort(vergleich);
}

/** Umkehrung der Sicht: Stelle in der Sicht je Zeile, -1 wenn die Zeile ausgefiltert ist. */
export function sichtStellen(t: Tabelle, sicht: Int32Array): Int32Array {
  const aus = new Int32Array(t.zeilen.length).fill(-1);
  for (let i = 0; i < sicht.length; i++) aus[sicht[i]] = i;
  return aus;
}
