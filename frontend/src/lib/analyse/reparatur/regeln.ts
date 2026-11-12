// Feste Regeln für einzelne Bausteine (Zahl, Wort, Text in einfachen Anführungszeichen) und Zeichenklassen. Der
// Flicker fragt hier nach, was aus einem Baustein wird; der Zustand des Lesens bleibt beim Flicker.

/** Vorschlag für einen Baustein: neuer Text, Meldung, Vorschlag und, wo ein Mensch nachsehen sollte, ein Hinweis */
export interface Bausteinregel {
  readonly neu: string;
  readonly meldung: string;
  readonly vorschlag: string;
  readonly hinweis?: string;
}

const GUELTIGE_ZAHL = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const FREMDE_WOERTER: Readonly<Record<string, string>> = { true: "true", false: "false", null: "null", none: "null", nil: "null" };
const KEIN_WERT = new Set(["NaN", "Infinity", "-Infinity", "+Infinity", "undefined"]);

export const istLeerraum = (c: string): boolean => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "﻿";
export const istWortanfang = (c: string): boolean => /[A-Za-z_$]/.test(c);
export const istWortzeichen = (c: string): boolean => /[A-Za-z0-9_$]/.test(c);
export const istZahlanfang = (c: string): boolean => /[-+.0-9]/.test(c);
export const istZahlzeichen = (c: string): boolean => /[-+0-9.eE]/.test(c);
export const beginntWert = (c: string): boolean => c === '"' || c === "'" || c === "{" || c === "[" || istZahlanfang(c) || istWortanfang(c);
export const istKeinWert = (w: string): boolean => KEIN_WERT.has(w);

export function kurz(s: string): string {
  return s.length > 24 ? `${s.slice(0, 23)}...` : s;
}

/** Zahl: gültig, geflickt (Pluszeichen, Punkt ohne Ziffer, führende Null als Text) oder null, wenn keine Regel greift */
export function zahlRegel(roh: string): "gueltig" | Bausteinregel | null {
  if (GUELTIGE_ZAHL.test(roh)) return "gueltig";
  const geflickt = roh.replace(/^\+/, "").replace(/^(-?)\./, (_, v: string) => `${v}0.`).replace(/\.(?=$|[eE])/, ".0");
  if (GUELTIGE_ZAHL.test(geflickt)) {
    const was = roh.startsWith("+") ? "Pluszeichen vor der Zahl" : "Zahl ohne Ziffer vor oder nach dem Punkt";
    return { neu: geflickt, meldung: `${was}: ${roh}`, vorschlag: `schreiben als ${geflickt}` };
  }
  if (/^-?0\d+(\.\d+)?$/.test(roh)) return { neu: `"${roh}"`, meldung: `Zahl mit führender Null: ${roh}`, vorschlag: "als Text setzen, die Ziffern bleiben" };
  return null;
}

/** Wort ohne Anführungszeichen: JSON-Wort, Wort anderer Sprachen (True, None, NaN ...) oder null für unbekannt */
export function wortRegel(w: string): "gueltig" | Bausteinregel | null {
  if (w === "true" || w === "false" || w === "null") return "gueltig";
  const fremd = FREMDE_WOERTER[w.toLowerCase()];
  if (fremd) return { neu: fremd, meldung: `${w} ist kein JSON-Wort`, vorschlag: `durch ${fremd} ersetzen` };
  if (KEIN_WERT.has(w)) return { neu: "null", meldung: `${w} gibt es in JSON nicht`, vorschlag: "durch null ersetzen", hinweis: `${w} durch null ersetzt, bitte prüfen` };
  return null;
}

/** Text in einfachen Anführungszeichen ab `von` bis zum schließenden in derselben Zeile; null ohne Ende */
export function einfacheAnfuehrung(t: string, von: number, ende: number): { bis: number; neu: string } | null {
  let i = von + 1;
  let inhalt = "";
  while (i < ende && t[i] !== "\n") {
    const c = t[i];
    if (c === "\\" && t[i + 1] === "'") { inhalt += "'"; i += 2; continue; }
    if (c === "\\") { inhalt += t.slice(i, i + 2); i += 2; continue; }
    if (c === "'") return { bis: i + 1, neu: `"${inhalt}"` };
    inhalt += c === '"' ? '\\"' : c;
    i++;
  }
  return null;
}

/** Vorschlag zum Schließen am Ende: "Text und Objekt schließen mit "}"; `offen` sind die offenen Behälter (Objekt?) */
export function schliessenBeschreiben(teile: readonly string[], offen: readonly boolean[], neu: string): string {
  const listen = offen.filter((objekt) => !objekt).length;
  const objekte = offen.length - listen;
  const alle = [...teile, ...(listen ? [listen === 1 ? "Liste" : `${listen} Listen`] : []), ...(objekte ? [objekte === 1 ? "Objekt" : `${objekte} Objekte`] : [])];
  if (!alle.length) return `${neu} ergänzen`;
  return `${alle.length > 1 ? `${alle.slice(0, -1).join(", ")} und ${alle[alle.length - 1]}` : alle[0]} schließen mit ${neu}`;
}

// Spanne eines Kommentars ab `von`: Zeilenkommentar bis Zeilenende, Blockkommentar bis zu seinem Ende; offen, wenn
// der Block nicht endet.
export function kommentarSpanne(t: string, von: number, ende: number): { bis: number; offen: boolean } {
  const block = t[von + 1] === "*";
  const schluss = block ? t.indexOf("*/", von + 2) : t.indexOf("\n", von);
  const offen = block && (schluss === -1 || schluss + 2 > ende);
  return { bis: offen || schluss === -1 ? ende : Math.min(block ? schluss + 2 : schluss, ende), offen };
}
