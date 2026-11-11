// Ähnliche Werte finden (Bereinigen, Entwurf entwuerfe/bereinigen-aehnlich.html). Drei Verfahren, von sicher bis
// großzügig: gleicher Kern (Groß und klein, Leerzeichen und Satzzeichen zählen nicht), Buchstabenpaare (Anteil gemeinsamer
// benachbarter Buchstaben, findet vertauschte und fehlende Buchstaben) und Tippfehler-Abstand (höchstens zwei Änderungen).
// Ergebnis sind Gruppen von Schreibweisen mit Vorschlag für den Zielwert. Rein, ohne Browser.

import { inhalt, istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { zelle, zellZeiger, type Tabelle } from "../tabelle";
import type { Wertzaehlung } from "./facetten";

export type Verfahren = "kern" | "paare" | "abstand";

export const VERFAHREN: readonly { readonly kennung: Verfahren; readonly name: string; readonly erklaerung: string }[] = [
  { kennung: "kern", name: "Gleicher Kern", erklaerung: "Groß und klein, Leerzeichen und Satzzeichen zählen nicht. Sicher, findet aber keine Abkürzungen." },
  { kennung: "paare", name: "Buchstabenpaare", erklaerung: "Vergleicht benachbarte Buchstaben. Findet auch vertauschte und fehlende Buchstaben." },
  { kennung: "abstand", name: "Tippfehler-Abstand", erklaerung: "Zählt die Änderungen von einem Wert zum anderen, bis 2 gilt als ähnlich. Findet am meisten, auch Falsches." },
];

export interface Gruppe {
  /** Schreibweisen, häufigste zuerst */
  readonly varianten: readonly Wertzaehlung[];
  /** Vorschlag für den Zielwert */
  readonly ziel: string;
}

/** Ab diesem Anteil gemeinsamer Buchstabenpaare gelten zwei Werte als ähnlich */
const PAARE_SCHWELLE = 0.8;
/** Höchstens so viele Änderungen beim Tippfehler-Abstand */
const ABSTAND_HOECHSTENS = 2;
/** Kürzere Werte vergleichen die unscharfen Verfahren nicht (zu viele Zufallstreffer) */
const MINDESTLAENGE = 4;
/** Die unscharfen Verfahren vergleichen jeden Wert mit jedem; darüber dauerte das zu lange */
export const UNSCHARF_HOECHSTENS = 1500;

/** Geht das Verfahren bei so vielen verschiedenen Werten? */
export const verfahrenMoeglich = (verfahren: Verfahren, verschiedene: number): boolean => verfahren === "kern" || verschiedene <= UNSCHARF_HOECHSTENS;

/** Kern eines Werts: klein, nur Buchstaben und Ziffern */
export const kern = (s: string): string => s.toLocaleLowerCase("de").replace(/[^\p{L}\p{N}]+/gu, "");

function paare(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i + 1 < s.length; i++) {
    const p = s.slice(i, i + 2);
    m.set(p, (m.get(p) ?? 0) + 1);
  }
  return m;
}

/** Dice-Koeffizient über Buchstabenpaare (0 bis 1) */
export const paarAehnlichkeit = (a: string, b: string): number => diceVon(paare(a), paare(b));

function diceVon(pa: ReadonlyMap<string, number>, pb: ReadonlyMap<string, number>): number {
  let gemeinsam = 0;
  let summe = 0;
  for (const n of pa.values()) summe += n;
  for (const [p, n] of pb) {
    summe += n;
    gemeinsam += Math.min(n, pa.get(p) ?? 0);
  }
  return summe === 0 ? 0 : (2 * gemeinsam) / summe;
}

/** Levenshtein-Abstand, bricht ab, sobald er die Grenze sicher überschreitet */
export function abstand(a: string, b: string, grenze = ABSTAND_HOECHSTENS): number {
  if (Math.abs(a.length - b.length) > grenze) return grenze + 1;
  let vorher = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const jetzt = [i];
    let kleinste = i;
    for (let j = 1; j <= b.length; j++) {
      jetzt[j] = Math.min(vorher[j] + 1, jetzt[j - 1] + 1, vorher[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      kleinste = Math.min(kleinste, jetzt[j]);
    }
    if (kleinste > grenze) return grenze + 1;
    vorher = jetzt;
  }
  return vorher[b.length];
}

/** Zielwert: die häufigste Schreibweise; bei Gleichstand die ohne Leerzeichen am Rand und mit großem Anfang */
function zielVon(varianten: readonly Wertzaehlung[]): string {
  const guete = (w: string) => (w === w.trim() ? 2 : 0) + (/^\p{Lu}/u.test(w) ? 1 : 0);
  return [...varianten].sort((a, b) => b.anzahl - a.anzahl || guete(b.wert) - guete(a.wert))[0].wert;
}

/** Vereinigung über Paare ähnlicher Werte (Union-Find) */
function verbinden(werte: readonly Wertzaehlung[], aehnlich: (i: number, j: number) => boolean): number[][] {
  const eltern = werte.map((_, i) => i);
  const wurzel = (i: number): number => (eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i])));
  for (let i = 0; i < werte.length; i++) for (let j = i + 1; j < werte.length; j++) if (wurzel(i) !== wurzel(j) && aehnlich(i, j)) eltern[wurzel(j)] = wurzel(i);
  const gruppen = new Map<number, number[]>();
  werte.forEach((_, i) => gruppen.set(wurzel(i), [...(gruppen.get(wurzel(i)) ?? []), i]));
  return [...gruppen.values()];
}

export function gruppenFinden(werte: readonly Wertzaehlung[], verfahren: Verfahren): Gruppe[] {
  const gefuellt = werte.filter((w) => w.wert.trim() !== "");
  const kerne = gefuellt.map((w) => kern(w.wert));
  let teile: number[][];
  if (verfahren === "kern") {
    const nachKern = new Map<string, number[]>();
    kerne.forEach((k, i) => nachKern.set(k, [...(nachKern.get(k) ?? []), i]));
    teile = [...nachKern.values()];
  } else {
    if (!verfahrenMoeglich(verfahren, gefuellt.length)) return [];
    const lang = (i: number) => kerne[i].length >= MINDESTLAENGE;
    const paareJe = verfahren === "paare" ? kerne.map(paare) : [];
    teile = verbinden(gefuellt, (i, j) => {
      if (kerne[i] === kerne[j]) return true;
      if (!lang(i) || !lang(j)) return false;
      return verfahren === "paare" ? diceVon(paareJe[i], paareJe[j]) >= PAARE_SCHWELLE : abstand(kerne[i], kerne[j]) <= ABSTAND_HOECHSTENS;
    });
  }
  return teile
    .filter((t) => t.length > 1)
    .map((t) => {
      const varianten = t.map((i) => gefuellt[i]).sort((a, b) => b.anzahl - a.anzahl || a.wert.localeCompare(b.wert, "de"));
      return { varianten, ziel: zielVon(varianten) };
    })
    .sort((a, b) => b.varianten.reduce((s, v) => s + v.anzahl, 0) - a.varianten.reduce((s, v) => s + v.anzahl, 0));
}

export interface Ersetzung {
  readonly zeile: number;
  readonly zeiger: string;
  readonly vorher: string;
  readonly nachher: string;
}

/**
 * Zellen einer Spalte, deren Wert laut `karte` (vorher -> nachher) ersetzt wird; in Listen jeder passende Eintrag.
 * In Textreihenfolge.
 */
export function ersetzungen(t: Tabelle, index: Strukturindex, text: string, spalte: number, karte: ReadonlyMap<string, string>): Ersetzung[] {
  const aus: Ersetzung[] = [];
  if (!karte.size) return aus;
  const pruefen = (zeile: number, k: number, zeiger: string) => {
    if (istBehaelter(index.art[k]) || index.art[k] === KnotenArt.nichts) return;
    const vorher = inhalt(index, text, k);
    const nachher = karte.get(vorher);
    if (nachher !== undefined && nachher !== vorher) aus.push({ zeile, zeiger, vorher, nachher });
  };
  for (let i = 0; i < t.zeilen.length; i++) {
    const k = zelle(t, index, i, spalte);
    if (k === KEIN) continue;
    const zeiger = zellZeiger(t, i, spalte);
    if (index.art[k] !== KnotenArt.liste) pruefen(i, k, zeiger);
    else for (let c = index.erstesKind[k], n = 0; c !== KEIN; c = index.naechstes[c], n++) pruefen(i, c, `${zeiger}/${n}`);
  }
  return aus;
}
