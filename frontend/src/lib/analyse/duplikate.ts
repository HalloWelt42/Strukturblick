// Duplikate (entwuerfe/tabelle-duplikate.html): Zeilen einer Tabelle, die in den Schlüsselspalten (oder ganz) gleich
// sind, als Gruppen mit den Spalten, in denen sie sich unterscheiden. Welche Zeile bleibt, sagt eine Regel (erste,
// letzte, die mit den meisten Angaben) oder der Nutzer. Dazu ein Vorschlag, welche Spalte als Schlüssel taugt. Rein.

import { inhalt, istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { zelle, type Tabelle } from "./tabelle";

export type Behalten = "erste" | "letzte" | "meiste";

export const BEHALTEN: readonly { readonly kennung: Behalten; readonly name: string }[] = [
  { kennung: "erste", name: "Erste Zeile" },
  { kennung: "letzte", name: "Letzte Zeile" },
  { kennung: "meiste", name: "Meiste Angaben" },
];

export interface Duplikatgruppe {
  /** Der gemeinsame Wert für Menschen ("K-10233" oder bei ganzen Zeilen der erste Wert) */
  readonly wert: string;
  /** Stellen der Zeilen in Textreihenfolge */
  readonly zeilen: readonly number[];
  /** Spalten, in denen die Zeilen nicht alle gleich sind */
  readonly unterschiede: readonly number[];
}

/** Ab diesem Anteil verschiedener Werte gilt eine vollständig gefüllte Spalte als Schlüssel */
const SCHLUESSEL_ANTEIL = 0.95;
const SCHLUESSEL_NAME = /(^|[_\s-])(id|nr|nummer|kennung|key|code|schluessel)$|^(id|nr)[_\s-]|nr$/i;

/** Text einer Zelle zum Vergleichen: einfacher Wert als Inhalt, Behälter als Ausschnitt, fehlend als "" */
export function zellText(t: Tabelle, index: Strukturindex, text: string, zeile: number, spalte: number): string {
  const k = zelle(t, index, zeile, spalte);
  if (k === KEIN || index.art[k] === KnotenArt.nichts) return "";
  return istBehaelter(index.art[k]) ? text.slice(index.von[k], index.bis[k]) : inhalt(index, text, k);
}

/** Gruppen gleicher Zeilen; `spalten` leer: die ganze Zeile zählt. Zeilen mit leerem Schlüssel bleiben außen vor. */
export function duplikateFinden(t: Tabelle, index: Strukturindex, text: string, spalten: readonly number[]): Duplikatgruppe[] {
  const vergleich = spalten.length ? spalten : t.spalten.map((_, j) => j);
  const nachSchluessel = new Map<string, number[]>();
  for (let i = 0; i < t.zeilen.length; i++) {
    const werte = vergleich.map((j) => zellText(t, index, text, i, j));
    if (spalten.length && werte.every((w) => w.trim() === "")) continue;
    const s = werte.join("\u0001");
    const g = nachSchluessel.get(s);
    if (g) g.push(i);
    else nachSchluessel.set(s, [i]);
  }
  const gruppen: Duplikatgruppe[] = [];
  for (const zeilen of nachSchluessel.values()) {
    if (zeilen.length < 2) continue;
    const unterschiede = t.spalten.map((_, j) => j).filter((j) => new Set(zeilen.map((i) => zellText(t, index, text, i, j))).size > 1);
    gruppen.push({ wert: vergleich.length ? zellText(t, index, text, zeilen[0], vergleich[0]) : "", zeilen, unterschiede });
  }
  return gruppen;
}

/** Welche Zeile einer Gruppe nach der Regel bleibt */
export function vorauswahl(t: Tabelle, index: Strukturindex, text: string, g: Duplikatgruppe, regel: Behalten): number {
  if (regel === "erste") return g.zeilen[0];
  if (regel === "letzte") return g.zeilen[g.zeilen.length - 1];
  const gefuellt = (i: number) => t.spalten.reduce((n, _, j) => n + (zellText(t, index, text, i, j).trim() !== "" ? 1 : 0), 0);
  return g.zeilen.reduce((best, i) => (gefuellt(i) > gefuellt(best) ? i : best), g.zeilen[0]);
}

/**
 * Spalte, die als Schlüssel taugt: in jeder Zeile gefüllt und fast überall verschieden; Namen wie nr, id oder
 * kundennr haben Vorrang. null, wenn keine passt.
 */
export function schluesselVorschlag(t: Tabelle, index: Strukturindex, text: string): number | null {
  if (t.zeilen.length < 2) return null;
  let bester: { j: number; guete: number } | null = null;
  t.spalten.forEach((sp, j) => {
    if (sp.selbst) return;
    const werte = new Set<string>();
    for (let i = 0; i < t.zeilen.length; i++) {
      const w = zellText(t, index, text, i, j);
      if (w.trim() === "") return;
      werte.add(w);
    }
    const anteil = werte.size / t.zeilen.length;
    if (anteil < SCHLUESSEL_ANTEIL) return;
    const guete = anteil + (SCHLUESSEL_NAME.test(sp.name) ? 1 : 0);
    if (!bester || guete > bester.guete) bester = { j, guete };
  });
  return (bester as { j: number } | null)?.j ?? null;
}

/** Stellen der Zeilen, die wegfallen, wenn je Gruppe `bleibt(g)` bleibt */
export function wegfallendeDuplikate(gruppen: readonly Duplikatgruppe[], bleibt: (g: Duplikatgruppe) => number): number[] {
  return gruppen.flatMap((g) => {
    const b = bleibt(g);
    return g.zeilen.filter((i) => i !== b);
  }).sort((a, b) => a - b);
}
