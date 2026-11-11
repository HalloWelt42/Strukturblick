// Typen (Bereinigen, Entwurf entwuerfe/bereinigen-typen.html): je Spalte, was dort steht, was Strukturblick darin
// erkennt und welcher Vorschlag passt. Nichts wird von selbst umgewandelt: ein Vorschlag liefert die Vorschau und die
// Änderungen; erst der Nutzer übernimmt sie als einen Vorgang. Rohtexte bleiben, wo nichts umgewandelt wird (Leitgedanke 6).

import { inhalt, istBehaelter, KEIN, KNOTEN_NAME, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import type { NeuerWert } from "../../kern/format";
import { siehtAusWie, spaltenprofil, type SiehtAusWie } from "../spaltenprofil";
import { zahlenwert, zellZeiger, zelle, type Tabelle } from "../tabelle";
import { datumLesen } from "./facetten";

export type Vorschlagsart = "betrag" | "datum" | "text-bleibt";

export interface Zellaenderung {
  readonly zeile: number;                // Stelle in der Tabelle (ab 0)
  readonly zeiger: string;
  readonly vorher: string;
  readonly neu: NeuerWert;
}

export interface Unlesbar {
  readonly zeile: number;
  readonly zeiger: string;
  readonly wert: string;
  readonly grund: string;
}

export interface Typvorschlag {
  readonly spalte: string;
  readonly art: Vorschlagsart;
  /** Wie die Werte stehen ("Text") und was erkannt wurde ("Betrag, deutsches Format") */
  readonly stehtAls: string;
  readonly erkannt: string;
  readonly erklaerung: string;
  /** Umzuwandelnde Zellen (leer bei "text-bleibt") */
  readonly aenderungen: readonly Zellaenderung[];
  /** Werte, die schon passen und bleiben */
  readonly bleiben: number;
  readonly unlesbar: readonly Unlesbar[];
  /** Bei "text-bleibt": wie viele Werte als Zahl ihre führende Null verlören */
  readonly fuehrendeNullen: number;
}

export interface Spaltentyp {
  readonly spalte: string;
  readonly stehtAls: string;
  readonly erkannt: string;
  readonly vorschlag: Vorschlagsart | null;
}

/** Ab diesem Anteil passender Werte gibt es einen Vorschlag; der Rest erscheint als nicht lesbar */
export const VORSCHLAG_ANTEIL = 0.8;

const BETRAG = /^[-+]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d+(?:\s?€)?$/;
const ISO = /^\d{4}-\d{2}-\d{2}/;

/** Warum ein Wert als Betrag nicht lesbar ist, für Menschen */
function grundBetrag(s: string): string {
  if (/[oO]/.test(s) && /\d/.test(s)) return "Buchstabe O statt Null?";
  if (/^[^\d-]+\s*\d/.test(s)) return "Wort vor der Zahl";
  if (/\d\s*[^\d.,€\s]+$/.test(s)) return "Wort hinter der Zahl";
  return "keine Zahl in deutscher Schreibweise";
}

/** Betrag in deutscher Schreibweise als Rohtext einer Zahl (1.234,50 wird 1234.50); null, wenn nicht lesbar */
export function betragAlsZahl(s: string): string | null {
  const t = s.trim();
  if (!BETRAG.test(t)) return null;
  return t.replace(/\s?€$/, "").replaceAll(".", "").replace(",", ".");
}

/** Datum als JJJJ-MM-TT; bleibt ISO wie es ist */
export function datumAlsIso(s: string): string | null {
  const d = datumLesen(s);
  return d ? `${d.jahr}-${String(d.monat).padStart(2, "0")}-${String(d.tag).padStart(2, "0")}` : null;
}

interface Zelle {
  readonly zeile: number;
  readonly k: number;
  readonly s: string;
}

function gefuellteZellen(t: Tabelle, index: Strukturindex, text: string, spalte: number): Zelle[] {
  const z: Zelle[] = [];
  for (let i = 0; i < t.zeilen.length; i++) {
    const k = zelle(t, index, i, spalte);
    if (k === KEIN || istBehaelter(index.art[k]) || index.art[k] === KnotenArt.nichts) continue;
    const s = inhalt(index, text, k);
    if (s.trim() !== "") z.push({ zeile: i, k, s });
  }
  return z;
}

/** Übersicht aller Spalten: wie sie stehen, was erkannt wird, ob es einen Vorschlag gibt */
export function spaltentypen(t: Tabelle, index: Strukturindex, text: string): Spaltentyp[] {
  return t.spalten.map((sp, j) => {
    const v = vorschlagFuer(t, index, text, j);
    const typ = spaltenprofil(t, index, text, j, 1).typ;
    const stehtAls = typ.art === null ? "leer" : typ.art === "gemischt" ? "gemischt" : KNOTEN_NAME[typ.art];
    return { spalte: sp.name, stehtAls, erkannt: v?.erkannt ?? (typ.siehtAusWie ? typ.titel : stehtAls), vorschlag: v?.art ?? null };
  });
}

/** Vorschlag für eine Spalte; null, wenn es nichts vorzuschlagen gibt */
export function vorschlagFuer(t: Tabelle, index: Strukturindex, text: string, spalte: number): Typvorschlag | null {
  const typ = spaltenprofil(t, index, text, spalte, 1).typ;
  if (typ.art !== KnotenArt.text) return null;
  const name = t.spalten[spalte].name;
  const zellen = gefuellteZellen(t, index, text, spalte);
  if (!zellen.length) return null;
  const zeiger = (z: Zelle) => zellZeiger(t, z.zeile, spalte);
  // Großzügiger als das Abzeichen im Spaltenprofil: gerade Spalten mit Ausreißern sollen bereinigt werden
  const anteil = (art: SiehtAusWie) => zellen.filter((z) => siehtAusWie(z.s) === art).length / zellen.length;
  const erkannt = (["betrag", "datum", "zahl"] as const).find((a) => anteil(a) >= VORSCHLAG_ANTEIL) ?? null;
  if (!erkannt) return null;

  if (erkannt === "betrag") {
    const aenderungen: Zellaenderung[] = [];
    const unlesbar: Unlesbar[] = [];
    for (const z of zellen) {
      const roh = betragAlsZahl(z.s);
      if (roh === null) unlesbar.push({ zeile: z.zeile, zeiger: zeiger(z), wert: z.s, grund: grundBetrag(z.s) });
      else aenderungen.push({ zeile: z.zeile, zeiger: zeiger(z), vorher: z.s, neu: { art: "zahl", roh } });
    }
    return {
      spalte: name, art: "betrag", stehtAls: "Text", erkannt: "Betrag, deutsches Format",
      erklaerung: 'Punkt trennt die Tausender, Komma die Nachkommastellen. Gelesen wird "1.234,50" als 1234.50.',
      aenderungen, bleiben: 0, unlesbar, fuehrendeNullen: 0,
    };
  }

  if (erkannt === "datum") {
    const aenderungen: Zellaenderung[] = [];
    const unlesbar: Unlesbar[] = [];
    let bleiben = 0;
    for (const z of zellen) {
      const iso = datumAlsIso(z.s);
      if (iso === null) unlesbar.push({ zeile: z.zeile, zeiger: zeiger(z), wert: z.s, grund: "kein Datum" });
      else if (ISO.test(z.s.trim())) bleiben++;
      else aenderungen.push({ zeile: z.zeile, zeiger: zeiger(z), vorher: z.s, neu: { art: "text", wert: iso } });
    }
    if (!aenderungen.length && !unlesbar.length) return null;
    return {
      spalte: name, art: "datum", stehtAls: "Text", erkannt: aenderungen.length && bleiben ? "Datum, 2 Formate gemischt" : "Datum TT.MM.JJJJ",
      erklaerung: `${bleiben} Werte stehen schon als JJJJ-MM-TT und bleiben. ${aenderungen.length} stehen als TT.MM.JJJJ und werden umgestellt. TT.MM.JJJJ wird immer als Tag, Monat, Jahr gelesen.`,
      aenderungen, bleiben, unlesbar, fuehrendeNullen: 0,
    };
  }

  // sieht aus wie Zahl: mit führenden Nullen (Postleitzahl, Kundennummer) bleibt es Text
  const fuehrendeNullen = zellen.filter((z) => /^0\d/.test(z.s.trim())).length;
  if (!fuehrendeNullen) return null;
  return {
    spalte: name, art: "text-bleibt", stehtAls: "Text", erkannt: "Text, sieht aus wie Zahl",
    erklaerung: "Sieht aus wie eine Zahl, ist aber eher eine Nummer (etwa Postleitzahl). Sie bleibt Text.",
    aenderungen: [], bleiben: zellen.length, unlesbar: [], fuehrendeNullen,
  };
}

/** Prüfwert: Zahl zum Rohtext (für Vorschauen) */
export const alsZahl = (roh: string): number => zahlenwert(roh);
