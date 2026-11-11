// Hinweise zu einzelnen Werten (Leitgedanke 6: Typen sind Vorschläge). Ein Hinweis wandelt nichts um, er sagt nur,
// wonach ein Wert aussieht: Text mit führender Null, Datum, Datum mit Uhrzeit. Rein, ohne Browser.

import { KnotenArt } from "../kern/strukturindex";

export type HinweisKennung = "zahltext" | "datum" | "datumzeit";

export interface Hinweis {
  readonly kennung: HinweisKennung;
  readonly titel: string;
  readonly erklaerung: string;
  /** Darstellung: "akzent" für Beachtenswertes, "zweit" für erkannte Bedeutung */
  readonly stufe: "akzent" | "zweit";
}

const ZAHLTEXT: Hinweis = { kennung: "zahltext", titel: "Text, sieht aus wie Zahl", erklaerung: "Steht als Text, führende Null bleibt erhalten", stufe: "akzent" };
const DATUM: Hinweis = { kennung: "datum", titel: "Datum", erklaerung: "Sieht aus wie ein Datum (Jahr-Monat-Tag)", stufe: "zweit" };
const DATUMZEIT: Hinweis = { kennung: "datumzeit", titel: "Datum und Zeit", erklaerung: "Sieht aus wie ein Zeitpunkt nach ISO 8601", stufe: "zweit" };

const KEINE: readonly Hinweis[] = [];
const NUR_ZAHLTEXT: readonly Hinweis[] = [ZAHLTEXT];
const NUR_DATUM: readonly Hinweis[] = [DATUM];
const NUR_DATUMZEIT: readonly Hinweis[] = [DATUMZEIT];

const MIT_FUEHRENDER_NULL = /^[+-]?0\d+(?:[.,]\d+)?$/;
const DATUM_MUSTER = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATUMZEIT_MUSTER = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?(?:[Zz]|[+-]\d{2}(?::?\d{2})?)?$/;

const schaltjahr = (j: number): boolean => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;

function tageImMonat(jahr: number, monat: number): number {
  if (monat === 2) return schaltjahr(jahr) ? 29 : 28;
  return [4, 6, 9, 11].includes(monat) ? 30 : 31;
}

function gueltigesDatum(jahr: string, monat: string, tag: string): boolean {
  const m = Number(monat);
  const t = Number(tag);
  return m >= 1 && m <= 12 && t >= 1 && t <= tageImMonat(Number(jahr), m);
}

/** Ist der Text ein Kalenderdatum wie "2026-11-09"? */
export function istDatum(s: string): boolean {
  const m = DATUM_MUSTER.exec(s);
  return m !== null && gueltigesDatum(m[1], m[2], m[3]);
}

/** Ist der Text ein Zeitpunkt wie "2026-11-10T08:15:00+01:00"? */
export function istDatumZeit(s: string): boolean {
  const m = DATUMZEIT_MUSTER.exec(s);
  if (m === null || !gueltigesDatum(m[1], m[2], m[3])) return false;
  const sekunde = m[6] === undefined ? 0 : Number(m[6]);
  return Number(m[4]) <= 23 && Number(m[5]) <= 59 && sekunde <= 60;
}

/** Text aus Ziffern mit führender Null ("04109"), der als Zahl seine Null verlöre. */
export const istZahltext = (s: string): boolean => MIT_FUEHRENDER_NULL.test(s);

/** Hinweise zu einem Wert der Art `art` mit dem Inhalt `inhalt` (Rohtext ohne Anführungszeichen). */
export function hinweiseFuer(art: number, inhalt: string): readonly Hinweis[] {
  if (art !== KnotenArt.text || inhalt.length < 2 || inhalt.length > 40) return KEINE;
  if (istZahltext(inhalt)) return NUR_ZAHLTEXT;
  if (istDatum(inhalt)) return NUR_DATUM;
  if (istDatumZeit(inhalt)) return NUR_DATUMZEIT;
  return KEINE;
}
