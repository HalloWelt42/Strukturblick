// Alle Werte eines Pfads: zum gewählten Knoten werden alle gleichartigen Stellen gesucht (Listenstellen werden zu
// "alle", wie .bestellungen[].positionen[].preis) und ausgewertet: Anzahl, fehlende Stellen, Typen, Spanne bei Zahlen
// und die häufigsten Werte. Schlüssel werden ohne Ausschneiden direkt im Text verglichen, damit auch 100.000 Werte
// schnell gehen. Rein, ohne Browser.

import { KEIN, KnotenArt, inhalt, istBehaelter, type Strukturindex } from "../kern/strukturindex";
import { musterJq, teileVon, type Teil } from "../kern/pfade";

export interface Typanteil {
  readonly art: KnotenArt;
  readonly anzahl: number;
}

export interface Haeufigkeit {
  readonly art: KnotenArt;
  /** Inhalt ohne Anführungszeichen */
  readonly wert: string;
  readonly anzahl: number;
}

export interface Pfadwerte {
  /** Muster in jq-Schreibweise */
  readonly muster: string;
  /** Zahl der Stellen, an denen der Pfad einen Wert hat */
  readonly anzahl: number;
  /** Stellen, an denen der Pfad abbricht (Schlüssel fehlt oder der Wert davor passt nicht) */
  readonly fehlt: number;
  /** Arten der Werte, die häufigste zuerst */
  readonly typen: readonly Typanteil[];
  /** Kleinste und größte Zahl als Rohtext; null ohne Zahlen */
  readonly spanne: { readonly von: string; readonly bis: string } | null;
  /** Die häufigsten einfachen Werte, der häufigste zuerst */
  readonly haeufigste: readonly Haeufigkeit[];
  /** Zahl verschiedener einfacher Werte */
  readonly verschiedene: number;
}

/** Vergleicht den Schlüssel eines Knotens mit `teil`, ohne ihn aus dem Text zu schneiden. */
function schluesselIst(index: Strukturindex, text: string, k: number, teil: string): boolean {
  const von = index.schluesselVon[k];
  if (von === KEIN) return false;
  const dekodiert = index.schluesselDekodiert.get(k);
  if (dekodiert !== undefined) return dekodiert === teil;
  if (index.schluesselBis[k] - von !== teil.length) return false;
  for (let i = 0; i < teil.length; i++) if (text.charCodeAt(von + i) !== teil.charCodeAt(i)) return false;
  return true;
}

function kindMitSchluessel(index: Strukturindex, text: string, k: number, teil: string): number {
  for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) if (schluesselIst(index, text, c, teil)) return c;
  return KEIN;
}

/** Alle Knoten zum Muster eines Pfads (jede Listenstelle steht für alle Einträge) und die Zahl der Abbrüche. */
export function stellenZu(index: Strukturindex, text: string, teile: readonly Teil[]): { knoten: Int32Array; fehlt: number } {
  if (index.anzahl === 0) return { knoten: new Int32Array(0), fehlt: 0 };
  let stufe = Int32Array.of(0);
  let fehlt = 0;
  for (const teil of teile) {
    const naechste: number[] = [];
    for (const k of stufe) {
      if (typeof teil === "number") {
        if (index.art[k] !== KnotenArt.liste) fehlt++;
        else for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) naechste.push(c);
      } else {
        const c = index.art[k] === KnotenArt.objekt ? kindMitSchluessel(index, text, k, teil) : KEIN;
        if (c === KEIN) fehlt++;
        else naechste.push(c);
      }
    }
    stufe = Int32Array.from(naechste);
  }
  return { knoten: stufe, fehlt };
}

const ART_ZAHL = 6; // Zahl der Knotenarten

/** Auswertung aller Werte, die zum selben Muster gehören wie der Knoten `k`. */
export function pfadwerte(index: Strukturindex, text: string, k: number, wieViele = 3): Pfadwerte {
  const teile = teileVon(index, text, k);
  const { knoten, fehlt } = stellenZu(index, text, teile);
  const jeArt = new Array<number>(ART_ZAHL).fill(0);
  const zaehler = new Map<string, number>();
  let kleinste = Number.POSITIVE_INFINITY;
  let groesste = Number.NEGATIVE_INFINITY;
  let von = "";
  let bis = "";
  for (const c of knoten) {
    const art = index.art[c];
    jeArt[art]++;
    if (istBehaelter(art)) continue;
    const wert = inhalt(index, text, c);
    const schl = art + wert; // Art als erste Ziffer, damit "1" als Text und 1 als Zahl getrennt bleiben
    zaehler.set(schl, (zaehler.get(schl) ?? 0) + 1);
    if (art === KnotenArt.zahl) {
      const z = Number(wert);
      if (Number.isNaN(z)) continue;
      if (z < kleinste) { kleinste = z; von = wert; }
      if (z > groesste) { groesste = z; bis = wert; }
    }
  }
  const typen = jeArt
    .map((anzahl, art) => ({ art: art as KnotenArt, anzahl }))
    .filter((t) => t.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl);
  return {
    muster: musterJq(teile),
    anzahl: knoten.length,
    fehlt,
    typen,
    spanne: kleinste <= groesste ? { von, bis } : null,
    haeufigste: haeufigste(zaehler, wieViele),
    verschiedene: zaehler.size,
  };
}

/** Die `n` häufigsten Einträge, ohne alle zu sortieren. */
function haeufigste(zaehler: ReadonlyMap<string, number>, n: number): Haeufigkeit[] {
  const beste: [string, number][] = [];
  for (const eintrag of zaehler) {
    if (beste.length === n && eintrag[1] <= beste[n - 1][1]) continue;
    let i = beste.length;
    while (i > 0 && beste[i - 1][1] < eintrag[1]) i--;
    beste.splice(i, 0, eintrag);
    if (beste.length > n) beste.pop();
  }
  return beste.map(([schl, anzahl]) => ({ art: Number(schl[0]) as KnotenArt, wert: schl.slice(1), anzahl }));
}
