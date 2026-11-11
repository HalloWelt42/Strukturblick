// Eingabe beim direkten Bearbeiten eines Werts: aus dem Getippten und der Art des alten Werts entsteht der neue Wert.
// Die Art bleibt, wo es passt (Leitgedanke 6): ein Text bleibt Text, auch wenn er wie eine Zahl aussieht; eine Zahl
// bleibt Zahl, solange die Eingabe eine gültige Zahl ist. Rein, ohne Browser.

import { KnotenArt } from "../kern/strukturindex";
import type { NeuerWert } from "../kern/format";

/** Zahl nach JSON-Schreibweise (ohne Plus, ohne führende Nullen); der Rohtext wird unverändert geschrieben. */
const GUELTIGE_ZAHL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export const istGueltigeZahl = (s: string): boolean => GUELTIGE_ZAHL.test(s);

/**
 * Neuer Wert aus der Eingabe, passend zur Art des alten Werts. `typen` aus den Fähigkeiten des Formats: kann es keine
 * Typen (CSV), ist jede Eingabe Text.
 */
export function neuerWertAus(alteArt: number, eingabe: string, typen = true): NeuerWert {
  if (!typen) return { art: "text", wert: eingabe };
  if (alteArt === KnotenArt.zahl) return istGueltigeZahl(eingabe.trim()) ? { art: "zahl", roh: eingabe.trim() } : { art: "text", wert: eingabe };
  if (alteArt === KnotenArt.wahrheitswert || alteArt === KnotenArt.nichts) {
    const t = eingabe.trim();
    if (t === "true" || t === "false") return { art: "wahrheitswert", wert: t === "true" };
    if (t === "null") return { art: "nichts" };
    if (istGueltigeZahl(t)) return { art: "zahl", roh: t };
  }
  return { art: "text", wert: eingabe };
}

/** Text, mit dem das Eingabefeld beginnt: der Inhalt ohne Anführungszeichen, bei nichts "null". */
export function eingabeAnfang(art: number, inhalt: string): string {
  return art === KnotenArt.nichts && inhalt.trim() === "" ? "null" : inhalt;
}
