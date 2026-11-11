// Spaltenprofil einer Tabellenspalte: wie viel leer ist, wie viele verschiedene Werte es gibt, welche am häufigsten
// vorkommen und welcher Typ naheliegt. Der Typ ist nur ein Vorschlag (Leitgedanke 6): Rohtexte bleiben, wie sie sind.
// Gerechnet wird Spalte für Spalte, damit immer nur die Werte einer Spalte gezählt im Speicher liegen.

import { inhalt, istBehaelter, KEIN, KNOTEN_NAME, KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { zellenDerSpalte, type Tabelle } from "./tabelle";

export type SiehtAusWie = "betrag" | "datum" | "zahl";

export interface Typvorschlag {
  /** Art der gefüllten Werte; "gemischt" bei mehreren, null wenn die Spalte leer ist */
  readonly art: KnotenArt | "gemischt" | null;
  /** Nur bei Text: wonach die Werte aussehen */
  readonly siehtAusWie: SiehtAusWie | null;
  /** Kurz für das Abzeichen ("Text, sieht aus wie Betrag") */
  readonly titel: string;
  /** Erklärung für den Hinweis beim Darüberfahren */
  readonly erklaerung: string;
}

export interface Haeufig {
  readonly wert: string;
  readonly anzahl: number;
}

export interface Spaltenprofil {
  readonly zeilen: number;
  /** fehlender Schlüssel, leerer Text oder null */
  readonly leer: number;
  readonly verschieden: number;
  /** absteigend nach Anzahl; nur einfache Werte */
  readonly haeufigste: readonly Haeufig[];
  readonly typ: Typvorschlag;
}

/** Ab diesem Anteil der gefüllten Texte gilt ein Muster als Vorschlag */
export const MUSTER_ANTEIL = 0.95;

const MUSTER: readonly { art: SiehtAusWie; ausdruck: RegExp; name: string }[] = [
  { art: "betrag", ausdruck: /^[-+]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?:\s?€)?$/, name: "Betrag" },
  { art: "datum", ausdruck: /^(?:\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2}))$/, name: "Datum" },
  { art: "zahl", ausdruck: /^[-+]?(?:\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?)$/, name: "Zahl" },
];

/** Wonach ein einzelner Text aussieht; null, wenn nach nichts Bestimmtem. */
export function siehtAusWie(wert: string): SiehtAusWie | null {
  const s = wert.trim();
  for (const m of MUSTER) if (m.ausdruck.test(s)) return m.art;
  return null;
}

const ERKLAERUNG: Record<SiehtAusWie, string> = {
  betrag: "Steht als Text, sieht aus wie ein Betrag in deutscher Schreibweise (etwa 1.234,50). Vorschlag, nichts wird umgewandelt.",
  datum: "Steht als Text, sieht aus wie ein Datum (etwa 2024-03-01 oder 01.03.2024). Vorschlag, nichts wird umgewandelt.",
  zahl: "Steht als Text, sieht aus wie eine Zahl; führende Nullen bleiben erhalten. Vorschlag, nichts wird umgewandelt.",
};

export function spaltenprofil(t: Tabelle, index: Strukturindex, text: string, spalte: number, wieVieleHaeufigste = 4): Spaltenprofil {
  const zellen = zellenDerSpalte(t, index, spalte);
  const zaehler = new Map<string, number>();
  const arten = new Int32Array(6);
  let leer = 0;
  for (let i = 0; i < zellen.length; i++) {
    const k = zellen[i];
    if (k === KEIN || index.art[k] === KnotenArt.nichts) {
      leer++;
      continue;
    }
    const art = index.art[k];
    if (istBehaelter(art)) {
      arten[art]++;
      continue;
    }
    const s = inhalt(index, text, k);
    if (s === "") {
      leer++;
      continue;
    }
    arten[art]++;
    // Gleicher Text mit anderer Art (5 und "5") ist ein anderer Wert; die Art steht als erstes Zeichen davor.
    const schl = String(art) + s;
    zaehler.set(schl, (zaehler.get(schl) ?? 0) + 1);
  }
  return {
    zeilen: zellen.length,
    leer,
    verschieden: zaehler.size,
    haeufigste: haeufigste(zaehler, wieVieleHaeufigste),
    typ: typvorschlag(arten, zaehler),
  };
}

function haeufigste(zaehler: ReadonlyMap<string, number>, n: number): Haeufig[] {
  const beste: Haeufig[] = [];
  for (const [schl, anzahl] of zaehler) {
    if (beste.length === n && anzahl <= beste[n - 1].anzahl) continue;
    let p = beste.length;
    while (p > 0 && beste[p - 1].anzahl < anzahl) p--;
    beste.splice(p, 0, { wert: schl.slice(1), anzahl });
    if (beste.length > n) beste.pop();
  }
  return beste;
}

function typvorschlag(arten: Int32Array, zaehler: ReadonlyMap<string, number>): Typvorschlag {
  const vorhanden: KnotenArt[] = [];
  for (let a = 0; a < arten.length; a++) if (arten[a] > 0) vorhanden.push(a as KnotenArt);
  if (vorhanden.length === 0) return { art: null, siehtAusWie: null, titel: "leer", erklaerung: "Die Spalte hat keine gefüllten Werte." };
  if (vorhanden.length > 1) {
    const namen = vorhanden.map((a) => KNOTEN_NAME[a]).join(", ");
    return { art: "gemischt", siehtAusWie: null, titel: "Gemischt", erklaerung: `Die Werte haben verschiedene Arten: ${namen}.` };
  }
  const art = vorhanden[0];
  const name = KNOTEN_NAME[art];
  if (art !== KnotenArt.text) return { art, siehtAusWie: null, titel: name, erklaerung: `Alle gefüllten Werte sind ${name}.` };
  const muster = musterDerTexte(zaehler, arten[KnotenArt.text]);
  if (muster === null) return { art, siehtAusWie: null, titel: "Text", erklaerung: "Freier Text." };
  const m = MUSTER.find((x) => x.art === muster)!;
  return { art, siehtAusWie: muster, titel: `Text, sieht aus wie ${m.name}`, erklaerung: ERKLAERUNG[muster] };
}

/** Muster, dem genug der gefüllten Texte folgen; geprüft wird je verschiedenem Wert, gewichtet mit seiner Anzahl. */
function musterDerTexte(zaehler: ReadonlyMap<string, number>, gefuellt: number): SiehtAusWie | null {
  const treffer: Record<SiehtAusWie, number> = { betrag: 0, datum: 0, zahl: 0 };
  const textArt = String(KnotenArt.text);
  for (const [schl, anzahl] of zaehler) {
    if (!schl.startsWith(textArt)) continue;
    const s = schl.slice(1).trim();
    for (const m of MUSTER) if (m.ausdruck.test(s)) treffer[m.art] += anzahl;
  }
  for (const m of MUSTER) if (treffer[m.art] >= gefuellt * MUSTER_ANTEIL) return m.art;
  return null;
}
