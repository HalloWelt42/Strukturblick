// Facetten (Bereinigen, Entwurf entwuerfe/bereinigen.html): je Spalte der Tabelle eine Übersicht zum Anklicken. Text
// zählt Werte (bei Listen in der Zelle jeden Eintrag), Zahlen und Beträge zeigen eine Verteilung mit Bereich, Datumsangaben
// Monate. Mehrere Facetten filtern zusammen (und); gezählt wird, wie viele Zeilen nach jedem Schritt bleiben. Rein.

import { inhalt, istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { spaltenprofil } from "../spaltenprofil";
import { zahlenwert, zelle, type Tabelle } from "../tabelle";

export type Facettenart = "werte" | "zahl" | "datum";

export interface Wertzaehlung {
  /** Der Wert, wie er steht ("" für leer) */
  readonly wert: string;
  readonly anzahl: number;
}

export interface Klasse {
  readonly von: number;
  readonly bis: number;
  readonly anzahl: number;
}

export interface Verteilung {
  readonly klassen: readonly Klasse[];
  /** Gefüllte Werte, die sich nicht lesen lassen (fehlen in der Verteilung) */
  readonly unlesbar: number;
}

export interface Monat {
  readonly monat: string;                // JJJJ-MM
  readonly anzahl: number;
}

export type Auswahl =
  | { readonly art: "werte"; readonly werte: readonly string[] }
  | { readonly art: "bereich"; readonly von: number | null; readonly bis: number | null }
  | { readonly art: "monate"; readonly von: string | null; readonly bis: string | null };

export interface Filter {
  /** Spalte nach Namen (Spalten entstehen nach jeder Änderung neu) */
  readonly spalte: string;
  readonly auswahl: Auswahl;
}

/** Welche Facette zu einer Spalte passt */
export function facettenart(t: Tabelle, index: Strukturindex, text: string, spalte: number): Facettenart {
  const typ = spaltenprofil(t, index, text, spalte, 1).typ;
  if (typ.art === KnotenArt.zahl || typ.siehtAusWie === "betrag") return "zahl";
  if (typ.siehtAusWie === "datum") return "datum";
  return "werte";
}

/** Texte einer Zelle: einfacher Wert als einer, Liste als ihre einfachen Einträge, leer als "" */
function texteDerZelle(index: Strukturindex, text: string, k: number): string[] {
  if (k === KEIN || index.art[k] === KnotenArt.nichts) return [""];
  if (index.art[k] === KnotenArt.liste) {
    const t: string[] = [];
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) if (!istBehaelter(index.art[c])) t.push(inhalt(index, text, c));
    return t.length ? t : [""];
  }
  return istBehaelter(index.art[k]) ? [] : [inhalt(index, text, k)];
}

export function werteZaehlen(t: Tabelle, index: Strukturindex, text: string, spalte: number): Wertzaehlung[] {
  const z = new Map<string, number>();
  for (let i = 0; i < t.zeilen.length; i++) for (const w of new Set(texteDerZelle(index, text, zelle(t, index, i, spalte)))) z.set(w, (z.get(w) ?? 0) + 1);
  return [...z].map(([wert, anzahl]) => ({ wert, anzahl }));
}

/** Datum aus JJJJ-MM-TT (auch mit Zeit) oder TT.MM.JJJJ; null, wenn nicht lesbar */
export function datumLesen(s: string): { jahr: number; monat: number; tag: number } | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return pruefen(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})$/.exec(t);
  if (m) return pruefen(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  return null;
}

function pruefen(jahr: number, monat: number, tag: number) {
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return { jahr, monat, tag };
}

const monatVon = (s: string): string | null => {
  const d = datumLesen(s);
  return d ? `${d.jahr}-${String(d.monat).padStart(2, "0")}` : null;
};

/** Ein runder Schritt für etwa `ziel` Klassen (1, 2, 5 mal Zehnerpotenz) */
function schrittFuer(spanne: number, ziel: number): number {
  if (spanne <= 0) return 1;
  const roh = spanne / ziel;
  const p = 10 ** Math.floor(Math.log10(roh));
  return [1, 2, 5, 10].map((f) => f * p).find((s) => s >= roh) ?? 10 * p;
}

export function zahlenVerteilung(t: Tabelle, index: Strukturindex, text: string, spalte: number, ziel = 12): Verteilung {
  const zahlen: number[] = [];
  let unlesbar = 0;
  for (let i = 0; i < t.zeilen.length; i++) {
    const s = texteDerZelle(index, text, zelle(t, index, i, spalte))[0] ?? "";
    if (s.trim() === "") continue;
    const z = zahlenwert(s);
    if (Number.isNaN(z)) unlesbar++;
    else zahlen.push(z);
  }
  if (!zahlen.length) return { klassen: [], unlesbar };
  const min = Math.min(...zahlen);
  const max = Math.max(...zahlen);
  const schritt = schrittFuer(max - min, ziel);
  const anfang = Math.floor(min / schritt) * schritt;
  const anzahl = Math.max(1, Math.floor((max - anfang) / schritt) + 1);
  const klassen = Array.from({ length: anzahl }, (_, j) => ({ von: anfang + j * schritt, bis: anfang + (j + 1) * schritt, anzahl: 0 }));
  for (const z of zahlen) (klassen[Math.min(anzahl - 1, Math.floor((z - anfang) / schritt))] as { anzahl: number }).anzahl++;
  return { klassen, unlesbar };
}

export function monatsVerteilung(t: Tabelle, index: Strukturindex, text: string, spalte: number): { monate: Monat[]; unlesbar: number } {
  const z = new Map<string, number>();
  let unlesbar = 0;
  for (let i = 0; i < t.zeilen.length; i++) {
    const s = texteDerZelle(index, text, zelle(t, index, i, spalte))[0] ?? "";
    if (s.trim() === "") continue;
    const m = monatVon(s);
    if (m) z.set(m, (z.get(m) ?? 0) + 1);
    else unlesbar++;
  }
  if (!z.size) return { monate: [], unlesbar };
  // lückenlos vom ersten bis zum letzten Monat
  const sortiert = [...z.keys()].sort();
  const [j0, m0] = sortiert[0].split("-").map(Number);
  const [j1, m1] = sortiert.at(-1)!.split("-").map(Number);
  const monate: Monat[] = [];
  for (let j = j0, m = m0; j < j1 || (j === j1 && m <= m1); m === 12 ? ((m = 1), j++) : m++) {
    const k = `${j}-${String(m).padStart(2, "0")}`;
    monate.push({ monat: k, anzahl: z.get(k) ?? 0 });
  }
  return { monate, unlesbar };
}

/** Passt eine Zelle zur Auswahl? */
function passt(index: Strukturindex, text: string, k: number, a: Auswahl): boolean {
  const texte = texteDerZelle(index, text, k);
  if (a.art === "werte") return texte.some((w) => a.werte.includes(w));
  const s = texte[0] ?? "";
  if (a.art === "bereich") {
    const z = zahlenwert(s);
    return !Number.isNaN(z) && (a.von === null || z >= a.von) && (a.bis === null || z <= a.bis);
  }
  const m = monatVon(s);
  return m !== null && (a.von === null || m >= a.von) && (a.bis === null || m <= a.bis);
}

export interface Filterergebnis {
  /** Stellen der bleibenden Zeilen in Textreihenfolge */
  readonly zeilen: Int32Array;
  /** Wie viele Zeilen nach jedem Filter bleiben (in der Reihenfolge der Filter) */
  readonly schritte: readonly number[];
}

export function zeilenFiltern(t: Tabelle, index: Strukturindex, text: string, filter: readonly Filter[]): Filterergebnis {
  let stellen = Int32Array.from({ length: t.zeilen.length }, (_, i) => i);
  const schritte: number[] = [];
  for (const f of filter) {
    const spalte = t.spalteNach.get(f.spalte) ?? -1;
    stellen = spalte < 0 ? new Int32Array(0) : stellen.filter((i) => passt(index, text, zelle(t, index, i, spalte), f.auswahl));
    schritte.push(stellen.length);
  }
  return { zeilen: stellen, schritte };
}
