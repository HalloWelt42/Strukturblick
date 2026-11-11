// Eine Spalte (ein Feld) aus allen Einträgen einer Liste entfernen, ohne das Dokument neu zu schreiben (Regel A3): nur
// die Textstellen der Mitglieder verschwinden, Formatierung, Kommentare und Dialekt bleiben. Drei Verfahren, die Formate
// wählen: Mitglieder mit Trennzeichen (JSON, NDJSON, YAML in Klammern), Zeilen eines YAML-Blocks und Zellen einer CSV
// samt Kopfzelle.

import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { Formatfehler, type TextAenderung } from "../kern/format";
import { hinterZeile, mitTrennern, zeilenanfang } from "./entfernen";

function kinder(index: Strukturindex, k: number): number[] {
  const c: number[] = [];
  for (let x = index.erstesKind[k]; x !== KEIN; x = index.naechstes[x]) c.push(x);
  return c;
}

/** Wo ein Mitglied im Text beginnt: am Schlüssel, samt Anführungszeichen davor */
export function mitgliedAnfang(text: string, index: Strukturindex, k: number): number {
  const s = index.schluesselVon[k];
  if (s === KEIN) return index.von[k];
  return s > 0 && (text[s - 1] === '"' || text[s - 1] === "'") ? s - 1 : s;
}

/** Stelle des Mitglieds `spalte` in einem Objekt; -1 wenn es fehlt */
function stelleIn(text: string, index: Strukturindex, objekt: number, spalte: string): number {
  return kinder(index, objekt).findIndex((c) => schluessel(index, text, c) === spalte);
}

function objekteDerListe(index: Strukturindex, liste: number): number[] {
  return kinder(index, liste).filter((e) => index.art[e] === KnotenArt.objekt);
}

/** Mitglieder mit Trennzeichen: in jedem Objekt das Mitglied samt Komma */
export function mitgliederEntfernen(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  return objekteDerListe(index, liste).flatMap((o) => {
    const i = stelleIn(text, index, o, spalte);
    return i < 0 ? [] : mitTrennern(index, o, [i], (k) => mitgliedAnfang(text, index, k));
  });
}

/**
 * YAML: Objekte in Klammern wie JSON; Block-Objekte zeilenweise. Steht das Mitglied als erstes hinter "- ", fällt nur
 * es bis zum nächsten Schlüssel weg (der Strich bleibt); ist es das einzige, bleibt ein leeres Objekt "{}".
 */
export function yamlMitgliederEntfernen(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  return objekteDerListe(index, liste).flatMap((o): TextAenderung[] => {
    const i = stelleIn(text, index, o, spalte);
    if (i < 0) return [];
    if (text[index.von[o]] === "{") return mitTrennern(index, o, [i], (k) => mitgliedAnfang(text, index, k));
    const k = kinder(index, o);
    const c = k[i];
    const anfang = mitgliedAnfang(text, index, c);
    const zeile = zeilenanfang(text, anfang);
    const hinterStrich = /-\s*$/.test(text.slice(zeile, anfang));
    if (!hinterStrich) return [{ von: zeile, bis: hinterZeile(text, index.bis[c]), einfuegen: "" }];
    if (i + 1 < k.length) return [{ von: anfang, bis: mitgliedAnfang(text, index, k[i + 1]), einfuegen: "" }];
    return [{ von: anfang, bis: index.bis[c], einfuegen: "{}" }];
  });
}

/** Zelle samt einem Trennzeichen: vor dem Nachbarn rechts, sonst hinter dem Nachbarn links */
function zelleEntfernen(anfaenge: readonly number[], enden: readonly number[], j: number): TextAenderung {
  return j + 1 < anfaenge.length ? { von: anfaenge[j], bis: anfaenge[j + 1], einfuegen: "" } : { von: enden[j - 1], bis: enden[j], einfuegen: "" };
}

/** Kopfzelle samt Anführungszeichen */
function kopfSpanne(text: string, index: Strukturindex, c: number): [number, number] {
  let a = index.schluesselVon[c];
  let b = index.schluesselBis[c];
  if (a > 0 && text[a - 1] === '"' && text[b] === '"') { a--; b++; }
  return [a, b];
}

/** CSV: in jeder Zeile die Zelle der Spalte, dazu die Kopfzelle (aus der ersten Zeile, die alle Spalten kennt) */
export function csvSpalteEntfernen(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  const zeilen = kinder(index, liste);
  const aenderungen: TextAenderung[] = [];
  let kopf = false;
  for (const z of zeilen) {
    const zellen = kinder(index, z);
    const j = zellen.findIndex((c) => schluessel(index, text, c) === spalte);
    if (j < 0) continue;
    if (zellen.length < 2) throw new Formatfehler("Die letzte Spalte einer CSV bleibt");
    if (!kopf && index.schluesselVon[zellen[0]] !== KEIN) {
      const spannen = zellen.map((c) => kopfSpanne(text, index, c));
      aenderungen.push(zelleEntfernen(spannen.map((s) => s[0]), spannen.map((s) => s[1]), j));
      kopf = true;
    }
    aenderungen.push(zelleEntfernen(zellen.map((c) => index.von[c]), zellen.map((c) => index.bis[c]), j));
  }
  return aenderungen;
}
